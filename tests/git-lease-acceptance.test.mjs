import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// Exercises the Git operations prescribed by autopilot, not a forge or agent runtime.
test("an exact branch lease permits the owned rewrite and rejects a concurrent writer", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-lease-"));
  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  try {
    const remote = join(root, "remote.git");
    const owner = join(root, "owner");
    const concurrent = join(root, "concurrent");
    await mkdir(owner);
    git(root, "init", "--bare", remote);
    git(owner, "init", "-b", "main");
    for (const cwd of [owner]) {
      git(cwd, "config", "user.name", "OMS Acceptance");
      git(cwd, "config", "user.email", "acceptance@example.invalid");
    }
    await writeFile(join(owner, "base.txt"), "base\n");
    git(owner, "add", ".");
    git(owner, "commit", "-m", "base");
    git(owner, "remote", "add", "origin", remote);
    git(owner, "push", "origin", "main");
    const target = git(owner, "rev-parse", "main");
    git(owner, "checkout", "-b", "owner/change");
    await writeFile(join(owner, "change.txt"), "owned patch\n");
    git(owner, "add", ".");
    git(owner, "commit", "-m", "owned change");
    git(owner, "push", "origin", "owner/change");
    const ref = "refs/heads/owner/change";
    const initial = git(owner, "ls-remote", "origin", ref).split(/\s/)[0];
    git(owner, "commit", "--amend", "-m", "rewritten owned change");
    git(owner, "push", `--force-with-lease=${ref}:${initial}`, "origin", `HEAD:${ref}`);
    const expected = git(owner, "rev-parse", "HEAD");
    assert.equal(git(owner, "ls-remote", "origin", ref).split(/\s/)[0], expected);

    git(root, "clone", "--branch", "owner/change", remote, concurrent);
    git(concurrent, "config", "user.name", "Concurrent Writer");
    git(concurrent, "config", "user.email", "concurrent@example.invalid");
    await writeFile(join(concurrent, "concurrent.txt"), "must survive\n");
    git(concurrent, "add", ".");
    git(concurrent, "commit", "-m", "concurrent remote update");
    git(concurrent, "push", "origin", "owner/change");
    const newer = git(concurrent, "rev-parse", "HEAD");
    git(owner, "commit", "--amend", "-m", "stale owner rewrite");
    const rejected = spawnSync("git", ["push", `--force-with-lease=${ref}:${expected}`, "origin", `HEAD:${ref}`], { cwd: owner, encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /stale info/);
    assert.equal(git(owner, "ls-remote", "origin", ref).split(/\s/)[0], newer);
    assert.equal(git(owner, "ls-remote", "origin", "refs/heads/main").split(/\s/)[0], target);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
