import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { ensureWorktree, planWorktree, settleWorktree } from "../../plugins/pstack/pi/worktree.ts";

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}

function withWorktree(run, visibility = "no") {
  const repo = mkdtempSync(join(tmpdir(), "pstack status config "));
  try {
    git(repo, "init", "-q", "-b", "main");
    for (const [name, value] of [
      ["user.name", "pstack test"],
      ["user.email", "pstack-test@example.invalid"],
      ["commit.gpgsign", "false"],
      ["core.logAllRefUpdates", "true"],
      ["status.showUntrackedFiles", visibility],
    ]) git(repo, "config", name, value);
    writeFileSync(join(repo, "tracked.txt"), "base\n");
    writeFileSync(join(repo, ".gitignore"), ".env\nbuild/\n");
    git(repo, "add", "tracked.txt", ".gitignore");
    git(repo, "commit", "-q", "-m", "base");
    const wt = planWorktree(repo, "visibility");
    ensureWorktree(wt);
    run({ repo, wt });
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

function output(wt, path) {
  const file = join(wt.path, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, "only copy of the agent's output\n");
  return file;
}

function assertKept(repo, wt, file) {
  const kept = settleWorktree(wt);
  assert.ok(existsSync(file), "cleanup deleted the agent's only copy");
  assert.equal(readFileSync(file, "utf8"), "only copy of the agent's output\n");
  assert.equal(kept, true);
  assert.equal(git(repo, "rev-parse", `refs/heads/${wt.branch}`), wt.base);
  assert.equal(git(wt.path, "config", "status.showUntrackedFiles"), "no", "do not rewrite the user's preference");
}

for (const path of ["new.txt", "new-directory/nested.txt", ".env", "build/output.txt"]) {
  test(`keeps ${path} when status.showUntrackedFiles=no`, () => {
    withWorktree(({ repo, wt }) => {
      const file = output(wt, path);
      assert.equal(git(wt.path, "status", "--porcelain", "--ignored"), "", "fixture must reproduce the hidden output");
      assertKept(repo, wt, file);
    });
  });
}

test("respects output hidden by a worktree-local status preference", () => {
  withWorktree(({ repo, wt }) => {
    git(repo, "config", "extensions.worktreeConfig", "true");
    git(wt.path, "config", "--worktree", "status.showUntrackedFiles", "no");
    const file = output(wt, "new.txt");
    assertKept(repo, wt, file);
    assert.equal(git(repo, "config", "status.showUntrackedFiles"), "normal");
  }, "normal");
});

test("still removes an actually clean worktree and its branch with hidden untracked files", () => {
  withWorktree(({ repo, wt }) => {
    assert.equal(settleWorktree(wt), false);
    assert.equal(existsSync(wt.path), false);
    assert.equal(git(repo, "branch", "--list", wt.branch), "");
  });
});

test("keeps tracked edits with hidden untracked files", () => {
  withWorktree(({ repo, wt }) => {
    const file = output(wt, "tracked.txt");
    assertKept(repo, wt, file);
  });
});

test("keeps a clean checkout with an agent commit", () => {
  withWorktree(({ repo, wt }) => {
    output(wt, "committed.txt");
    git(wt.path, "add", "committed.txt");
    git(wt.path, "commit", "-q", "-m", "agent output");
    const head = git(wt.path, "rev-parse", "HEAD");
    assert.equal(settleWorktree(wt), true);
    assert.ok(existsSync(join(wt.path, "committed.txt")));
    assert.equal(git(repo, "rev-parse", `refs/heads/${wt.branch}`), head);
  });
});

test("keeps untracked output with normal status settings", () => {
  withWorktree(({ wt }) => {
    const file = output(wt, "new.txt");
    assert.equal(settleWorktree(wt), true);
    assert.ok(existsSync(file));
  }, "normal");
});
