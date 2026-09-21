import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { buildRelease, checkRelease, releaseSource, repoRoot } from "../tools/build-release.mjs";
import { installArchive, sha256, uninstallOwned, verifyInstalledTree } from "../tools/release-lib.mjs";

const execFileAsync = promisify(execFile);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

test("release archives and manifest are byte-reproducible", async () => {
  const snapshot = await checkRelease({ root: repoRoot });
  assert.deepEqual(snapshot.map((entry) => entry.name), [
    "SHA256SUMS",
    "oh-my-stack-claude-code-0.2.0-alpha.0.tar.gz",
    "oh-my-stack-codex-0.2.0-alpha.0.tar.gz",
    "oh-my-stack-omp-0.2.0-alpha.0.tar.gz",
    "release-manifest.json",
  ]);
});

test("all target archives install, update, roll back, and uninstall within their owned directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-release-lifecycle-"));
  const output = join(root, "dist");
  const home = join(root, "home");
  try {
    const manifest = await buildRelease({ root: repoRoot, out: output });
    await mkdir(home, { recursive: true });
    for (const artifact of manifest.artifacts) {
      const destination = join(home, "plugins", artifact.target, "oh-my-stack");
      const sentinel = join(home, `${artifact.target}-user-owned.txt`);
      const archive = await readFile(join(output, artifact.file));
      await writeFile(sentinel, "preserve me\n");

      await installArchive({ archive, artifact, destination, archiveRoot: manifest.archiveRoot });
      await verifyInstalledTree(destination, artifact.files);
      assert.equal(await readFile(sentinel, "utf8"), "preserve me\n");

      const restoredOnly = join(destination, "restored-after-failed-update.txt");
      await writeFile(restoredOnly, "old installation state\n");
      await assert.rejects(
        installArchive({
          archive,
          artifact,
          destination,
          archiveRoot: manifest.archiveRoot,
          faultAfterBackup: true,
        }),
        /injected failure/,
      );
      assert.equal(await readFile(restoredOnly, "utf8"), "old installation state\n");

      await installArchive({ archive, artifact, destination, archiveRoot: manifest.archiveRoot });
      assert.equal(await exists(restoredOnly), false);
      await verifyInstalledTree(destination, artifact.files);

      await uninstallOwned({ destination, target: artifact.target });
      assert.equal(await exists(destination), false);
      assert.equal(await readFile(sentinel, "utf8"), "preserve me\n");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release installer rejects checksum drift and non-owned uninstall targets", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-release-reject-"));
  try {
    const output = join(root, "dist");
    const manifest = await buildRelease({ root: repoRoot, out: output });
    const artifact = manifest.artifacts[0];
    const archive = await readFile(join(output, artifact.file));
    const destination = join(root, "install");
    await assert.rejects(
      installArchive({
        archive: Buffer.concat([archive, Buffer.from("drift")]),
        artifact,
        destination,
        archiveRoot: manifest.archiveRoot,
      }),
      /checksum mismatch/,
    );
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, "keep.txt"), "not owned\n");
    await assert.rejects(uninstallOwned({ destination, target: artifact.target }), /ENOENT/);
    assert.equal(await readFile(join(destination, "keep.txt"), "utf8"), "not owned\n");
    assert.notEqual(sha256(archive), sha256(Buffer.concat([archive, Buffer.from("drift")])));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release installer CLI consumes the generated manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-release-cli-"));
  try {
    const output = join(root, "dist");
    const destination = join(root, "plugins", "oh-my-stack");
    await buildRelease({ root: repoRoot, out: output });
    const cli = join(repoRoot, "tools", "install-release.mjs");
    const common = ["--target", "claude-code", "--destination", destination];
    await execFileAsync(process.execPath, [cli, "install", "--manifest", join(output, "release-manifest.json"), ...common]);
    assert.equal(JSON.parse(await readFile(join(destination, "GENERATION.json"), "utf8")).target, "claude-code");
    await execFileAsync(process.execPath, [cli, "update", "--manifest", join(output, "release-manifest.json"), ...common]);
    await execFileAsync(process.execPath, [cli, "uninstall", ...common]);
    assert.equal(await exists(destination), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("tagged release source requires the version tag at clean HEAD", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-release-tag-"));
  try {
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "release-test@example.invalid"], { cwd: root });
    await execFileAsync("git", ["config", "user.name", "Release Test"], { cwd: root });
    await writeFile(join(root, "tracked.txt"), "release source\n");
    await execFileAsync("git", ["add", "tracked.txt"], { cwd: root });
    await execFileAsync("git", ["commit", "-qm", "fixture"], { cwd: root });
    await execFileAsync("git", ["tag", "v0.1.0-alpha.0"], { cwd: root });
    const source = await releaseSource(root, "0.1.0-alpha.0", "v0.1.0-alpha.0");
    assert.equal(source.cleanTaggedCheckout, true);
    assert.equal(source.ref, "v0.1.0-alpha.0");
    assert.equal(source.worktreeDirty, false);
    await assert.rejects(releaseSource(root, "0.1.0-alpha.0", "v0.2.0"), /release tag must be/);
    await writeFile(join(root, "untracked.txt"), "dirty\n");
    const worktreeSource = await releaseSource(root, "0.1.0-alpha.0");
    assert.equal(worktreeSource.ref, "WORKTREE");
    assert.equal(worktreeSource.worktreeDirty, true);
    assert.equal(worktreeSource.cleanTaggedCheckout, false);
    await assert.rejects(releaseSource(root, "0.1.0-alpha.0", "v0.1.0-alpha.0"), /clean checkout/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
