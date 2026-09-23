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
import { loadModel } from "../tools/generate.mjs";
import {
  extractArchive,
  installArchive,
  packageInventory,
  sha256,
  uninstallOwned,
  verifyInstalledTree,
} from "../tools/release-lib.mjs";

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
  const model = await loadModel();
  const version = model.project.version;
  const snapshot = await checkRelease({ root: repoRoot });
  assert.deepEqual(snapshot.map((entry) => entry.name), [
    "SHA256SUMS",
    `oh-my-stack-claude-code-${version}.tar.gz`,
    `oh-my-stack-codex-${version}.tar.gz`,
    `oh-my-stack-codex-plugin-${version}.tar.gz`,
    `oh-my-stack-omp-${version}.tar.gz`,
    "release-manifest.json",
  ]);
});

test("Codex plugin bundle exposes the generated package through one local marketplace", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-plugin-bundle-"));
  try {
    const output = join(root, "dist");
    const extracted = join(root, "marketplace");
    const manifest = await buildRelease({ root: repoRoot, out: output });
    const bundle = manifest.pluginBundles[0];
    assert.equal(bundle.id, "codex-marketplace");
    assert.equal(bundle.target, "codex");
    assert.equal(bundle.marketplace.name, "oh-my-stack");
    assert.equal(bundle.marketplace.plugins.length, 1);
    assert.deepEqual(bundle.marketplace.plugins[0], {
      name: "oh-my-stack",
      source: { source: "local", path: "./plugins/oh-my-stack" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    });

    const archive = await readFile(join(output, bundle.file));
    assert.equal(sha256(archive), bundle.sha256);
    await extractArchive(archive, bundle.archiveRoot, extracted);
    assert.deepEqual(await packageInventory(extracted), bundle.files);
    assert.deepEqual(
      JSON.parse(await readFile(join(extracted, ".agents", "plugins", "marketplace.json"), "utf8")),
      bundle.marketplace,
    );

    const codexArtifact = manifest.artifacts.find((artifact) => artifact.target === "codex");
    const packagedSkills = codexArtifact.files
      .map((file) => file.path)
      .filter((path) => /^skills\/[^/]+\/SKILL\.md$/.test(path));
    assert.equal(packagedSkills.length, 74);
    assert.equal(packagedSkills.some((path) => /\/check-[^/]+\//.test(path)), false);
    assert.deepEqual(
      await packageInventory(join(extracted, "plugins", "oh-my-stack")),
      codexArtifact.files,
    );
    assert.equal(
      JSON.parse(await readFile(join(extracted, "plugins", "oh-my-stack", "plugin.json"), "utf8")).version,
      manifest.version,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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

test("release installer CLI refuses an existing empty unowned directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-release-unowned-"));
  try {
    const output = join(root, "dist");
    await buildRelease({ root: repoRoot, out: output });
    const destination = join(root, "user-directory");
    await mkdir(destination);
    for (const action of ["install", "update"]) {
      await assert.rejects(
        execFileAsync(process.execPath, [
          join(repoRoot, "tools", "install-release.mjs"), action,
          "--manifest", join(output, "release-manifest.json"),
          "--target", "codex", "--destination", destination,
        ]),
        (error) => error.code === 1 && /GENERATION\.json/.test(error.stderr),
      );
      assert.deepEqual(await readdir(destination), []);
      assert.deepEqual((await readdir(root)).sort(), ["dist", "user-directory"]);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release installer CLI verifies installed files without mutation or archives", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-release-verify-"));
  try {
    const output = join(root, "dist");
    const manifest = await buildRelease({ root: repoRoot, out: output });
    const cli = join(repoRoot, "tools", "install-release.mjs");
    for (const artifact of manifest.artifacts) {
      const destination = join(root, artifact.target);
      const common = ["--manifest", join(output, "release-manifest.json"),
        "--target", artifact.target, "--destination", destination];
      await execFileAsync(process.execPath, [cli, "install", ...common]);
      await rm(join(output, artifact.file));
      const pristine = await packageInventory(root);
      const result = await execFileAsync(process.execPath, [cli, "verify", ...common]);
      assert.match(result.stdout, new RegExp(`Verified ${artifact.target} package`));
      assert.deepEqual(await packageInventory(root), pristine);

      const file = join(destination, artifact.files[0].path);
      const original = await readFile(file);
      for (const mutation of ["modified", "missing", "extra"]) {
        const extra = join(destination, "unexpected.txt");
        if (mutation === "modified") await writeFile(file, "changed\n");
        if (mutation === "missing") await rm(file);
        if (mutation === "extra") await writeFile(extra, "unexpected\n");
        const before = await packageInventory(root);
        await assert.rejects(
          execFileAsync(process.execPath, [cli, "verify", ...common]),
          (error) => error.code === 1 && /installed files do not match/.test(error.stderr),
        );
        assert.deepEqual(await packageInventory(root), before);
        if (mutation === "extra") await rm(extra);
        else await writeFile(file, original);
      }
    }
    const missing = join(root, "does-not-exist");
    await assert.rejects(execFileAsync(process.execPath, [cli, "verify",
      "--manifest", join(output, "release-manifest.json"),
      "--target", "codex", "--destination", missing]),
    (error) => error.code === 1 && /ENOENT/.test(error.stderr));
    assert.equal(await exists(missing), false);
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
