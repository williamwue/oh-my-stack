import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { createArchive, packageInventory, sha256 } from "../tools/release-lib.mjs";
import { buildStableMarketplace, assertPromotion, assertPublisherIdentity, assertTaggedRebuild, promoteSnapshot, REPOSITORY } from "../tools/stable-marketplace.mjs";

import { nativePublisherEnvironment } from "../tools/release-publisher.mjs";

const exec = promisify(execFile);
const commit = "a".repeat(40);
async function json(path, value) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`); }

test("maintainer identity requires explicit native write permission for the exact repository", () => {
  const repo = { full_name: REPOSITORY, default_branch: "main", permissions: { push: true } };
  assert.deepEqual(assertPublisherIdentity({ repo, account: "maintainer" }), { kind: "maintainer", account: "maintainer" });
  for (const bad of [{ ...repo, permissions: undefined }, { ...repo, permissions: { push: false } },
    { ...repo, full_name: "elsewhere/repo" }, { ...repo, default_branch: "other" }]) {
    assert.throws(() => assertPublisherIdentity({ repo: bad, account: "maintainer" }));
  }
});

test("Actions identity cannot publish through the local-only gate", () => {
  assert.throws(() => assertPublisherIdentity({ repo: { full_name: REPOSITORY, default_branch: "main", permissions: { push: true } },
    account: "maintainer", automation: { repository: REPOSITORY } }), /local pipeline/);
});

async function fixture(root, version = "1.2.3") {
  const assets = join(root, "assets");
  await mkdir(assets);
  const manifest = { schemaVersion: 1, name: "oh-my-stack", version, archiveRoot: "oh-my-stack",
    source: { ref: `v${version}`, commit, worktreeDirty: false, cleanTaggedCheckout: true }, artifacts: [], pluginBundles: [] };
  for (const target of ["omp", "codex", "claude-code"]) {
    const payload = join(root, target);
    await mkdir(join(payload, "skills", "original"), { recursive: true });
    await writeFile(join(payload, "skills", "original", "SKILL.md"), `original ${target}\n`);
    await json(join(payload, "GENERATION.json"), { generatedBy: "tools/generate.mjs", target, sourceVersion: version });
    const directory = target === "codex" ? ".codex-plugin" : ".claude-plugin";
    await mkdir(join(payload, directory));
    await json(join(payload, directory, "plugin.json"), { name: "oh-my-stack", version });
    const bytes = await createArchive(payload, "oh-my-stack");
    const file = `oh-my-stack-${target}-${version}.tar.gz`;
    await writeFile(join(assets, file), bytes);
    manifest.artifacts.push({ target, file, sha256: sha256(bytes), size: bytes.length, files: await packageInventory(payload) });
    if (target === "omp") continue;
    const bundleRoot = join(root, `${target}-bundle`);
    const { cp } = await import("node:fs/promises");
    await cp(payload, join(bundleRoot, "plugins", "oh-my-stack"), { recursive: true });
    const catalog = target === "codex" ? ".agents/plugins/marketplace.json" : ".claude-plugin/marketplace.json";
    await mkdir(join(bundleRoot, target === "codex" ? ".agents/plugins" : ".claude-plugin"), { recursive: true });
    await json(join(bundleRoot, catalog), { name: "oh-my-stack", plugins: [{ name: "oh-my-stack", source: target === "codex" ? { source: "local", path: "./plugins/oh-my-stack" } : "./plugins/oh-my-stack" }] });
    const archiveRoot = target === "codex" ? "oh-my-stack-marketplace" : "oh-my-stack-claude-marketplace";
    const bundle = await createArchive(bundleRoot, archiveRoot);
    const bundleFile = `oh-my-stack-${target === "codex" ? "codex" : "claude"}-plugin-${version}.tar.gz`;
    await writeFile(join(assets, bundleFile), bundle);
    manifest.pluginBundles.push({ target, file: bundleFile, archiveRoot, sha256: sha256(bundle), size: bundle.length, files: await packageInventory(bundleRoot) });
  }
  await json(join(assets, "release-manifest.json"), manifest);
  const names = [...manifest.artifacts, ...manifest.pluginBundles].map((entry) => entry.file).concat("release-manifest.json");
  await writeFile(join(assets, "SHA256SUMS"), (await Promise.all(names.map(async (name) => `${sha256(await readFile(join(assets, name)))}  ${name}\n`))).join(""));
  const release = { id: 123, tag_name: `v${version}`, html_url: `https://github.com/${REPOSITORY}/releases/tag/v${version}`, draft: false, prerelease: false, published_at: "2026-10-07T00:00:00Z",
    assets: await Promise.all([...names, "SHA256SUMS"].map(async (name) => ({ name, state: "uploaded", digest: `sha256:${sha256(await readFile(join(assets, name)))}` }))) };
  return { assets, release, manifest };
}

test("stable snapshot keeps released host payloads separate and byte-identical", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-stable-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { assets, release } = await fixture(root);
  const out = join(root, "snapshot");
  await buildStableMarketplace({ assets, release, out });
  for (const host of ["codex", "claude-code"]) {
    assert.deepEqual(await packageInventory(join(out, "plugins", host)), await packageInventory(join(root, host)));
  }
  const codex = JSON.parse(await readFile(join(out, ".agents/plugins/marketplace.json")));
  const claude = JSON.parse(await readFile(join(out, ".claude-plugin/marketplace.json")));
  assert.equal(codex.plugins[0].source.path, "./plugins/codex");
  assert.equal(claude.plugins[0].source, "./plugins/claude-code");
  await assert.rejects(buildStableMarketplace({ assets, release, out }), /already exists/);
});

test("tagged rebuild allows only gzip OS metadata and refuses all other byte or manifest drift", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-stable-platform-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { assets, manifest } = await fixture(root);
  const rebuilt = join(root, "rebuilt");
  const { cp } = await import("node:fs/promises");
  await cp(assets, rebuilt, { recursive: true });
  assert.deepEqual(await assertTaggedRebuild({ assets, rebuilt }), []);
  for (const entry of [...manifest.artifacts, ...manifest.pluginBundles]) {
    const archive = await readFile(join(rebuilt, entry.file));
    archive[9] = archive[9] === 3 ? 19 : 3;
    await writeFile(join(rebuilt, entry.file), archive);
    entry.sha256 = sha256(archive);
  }
  await json(join(rebuilt, "release-manifest.json"), manifest);
  assert.equal((await assertTaggedRebuild({ assets, rebuilt })).length, 5);
  const file = manifest.artifacts[0].file;
  const valid = await readFile(join(rebuilt, file));
  for (const index of [4, 10, valid.length - 1]) {
    const bad = Buffer.from(valid); bad[index] ^= 1;
    await writeFile(join(rebuilt, file), bad);
    await assert.rejects(assertTaggedRebuild({ assets, rebuilt }), /tagged rebuild differs/);
  }
  await writeFile(join(rebuilt, file), valid);
  manifest.source.commit = "b".repeat(40);
  await json(join(rebuilt, "release-manifest.json"), manifest);
  await assert.rejects(assertTaggedRebuild({ assets, rebuilt }), /release-manifest/);
  manifest.source.commit = commit;
  await json(join(rebuilt, "release-manifest.json"), manifest);
  await writeFile(join(assets, "SHA256SUMS"), "tampered\n");
  await assert.rejects(assertTaggedRebuild({ assets, rebuilt }), /SHA256SUMS/);
});

test("draft, prerelease, wrong repository, and incomplete assets never create a snapshot", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-stable-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { assets, release } = await fixture(root);
  for (const bad of [{ ...release, draft: true }, { ...release, prerelease: true }, { ...release, tag_name: "v1.2.3-rc.1" }, { ...release, html_url: "https://github.com/elsewhere/repo/releases/tag/v1.2.3" }, { ...release, assets: release.assets.slice(1) }]) {
    const out = join(root, "rejected");
    await assert.rejects(buildStableMarketplace({ assets, release: bad, out }));
    await assert.rejects(access(out));
  }
});

test("tampered downloads fail before any output exists", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-stable-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { assets, release } = await fixture(root);
  await writeFile(join(assets, "oh-my-stack-codex-1.2.3.tar.gz"), "tampered");
  const out = join(root, "rejected");
  await assert.rejects(buildStableMarketplace({ assets, release, out }), /digest/);
  await assert.rejects(access(out));
});

test("a self-consistent checksum set cannot hide a dirty source or false archive inventory", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-stable-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { assets, release, manifest } = await fixture(root);
  async function reseal(value) {
    await json(join(assets, "release-manifest.json"), value);
    const names = release.assets.map((entry) => entry.name).filter((name) => name !== "SHA256SUMS");
    await writeFile(join(assets, "SHA256SUMS"), (await Promise.all(names.map(async (name) => `${sha256(await readFile(join(assets, name)))}  ${name}\n`))).join(""));
    for (const asset of release.assets) asset.digest = `sha256:${sha256(await readFile(join(assets, asset.name)))}`;
  }
  for (const change of [
    (value) => { value.source.worktreeDirty = true; },
    (value) => { value.source.ref = "v1.2.4"; },
    (value) => { value.artifacts[1].files[0].sha256 = "0".repeat(64); },
  ]) {
    const value = structuredClone(manifest);
    change(value);
    await reseal(value);
    const out = join(root, "rejected");
    await assert.rejects(buildStableMarketplace({ assets, release, out }));
    await assert.rejects(access(out));
  }
});

test("promotion binds clean manifest, exact tag and tree, local checks, review, and monotonic versions", () => {
  const tree = "c".repeat(40);
  const manifest = { version: "1.2.3", source: { ref: "v1.2.3", commit, worktreeDirty: false, cleanTaggedCheckout: true } };
  const verification = { schemaVersion: 1, kind: "oh-my-stack-local-release", repository: REPOSITORY,
    source: { ...manifest.source, tree }, environment: { node: "22.23.3", zlib: "1.3.1-e00f703" },
    review: { tree, verdict: "approved", evidence: ["frozen review"] },
    checks: ["npm-ci", "repository-check", "book-validation", "book-audit", "book-tests", "release-reproducibility"].map((name) => ({ name, exitCode: 0 })) };
  assert.equal(assertPromotion({ manifest, tagCommit: commit, tagTree: tree, verification }), verification);
  for (const bad of [{ tagCommit: "b".repeat(40) }, { tagTree: "d".repeat(40) }, { verification: undefined },
    { verification: { ...verification, checks: verification.checks.slice(1) } },
    { verification: { ...verification, environment: { ...verification.environment, zlib: "1.2.12" } } },
    { verification: { ...verification, review: { ...verification.review, verdict: "pending" } } },
    { previous: { version: "1.3.0" } },
    { manifest: { ...manifest, source: { ...manifest.source, worktreeDirty: true } } }]) {
    assert.throws(() => assertPromotion({ manifest, tagCommit: commit, tagTree: tree, verification, ...bad }));
  }
});

test("Git promotion appends history, is idempotent, and rejects concurrent branch changes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-stable-git-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = join(root, "remote.git");
  await exec("git", ["init", "--bare", remote]);
  const { assets, release } = await fixture(root);
  const env = nativePublisherEnvironment({ ...process.env, GH_TOKEN: "fixture-override",
    OMS_PUBLISH_ENV: "native" });
  assert.equal(env.GH_TOKEN, undefined);
  assert.equal(env.GITHUB_TOKEN, undefined);
  if (process.platform !== "win32") {
    const bin = join(root, "bin"); await mkdir(bin);
    const realGit = (await exec("which", ["git"])).stdout.trim();
    const wrapper = join(bin, "git");
    await writeFile(wrapper, `#!/bin/sh\n[ "$OMS_PUBLISH_ENV" = "native" ] && [ -z "$GH_TOKEN$GITHUB_TOKEN" ] || exit 71\nexec "${realGit}" "$@"\n`);
    await chmod(wrapper, 0o755);
    env.PATH = `${bin}${delimiter}${process.env.PATH}`;
  }
  const snapshot = join(root, "snapshot");
  await buildStableMarketplace({ assets, release, out: snapshot });
  const first = await promoteSnapshot({ snapshot, remote, expectedHead: "", publish: true, env });
  const second = await promoteSnapshot({ snapshot, remote, expectedHead: first.commit, publish: true, env });
  assert.equal(second.status, "unchanged");
  await assert.rejects(promoteSnapshot({ snapshot, remote, expectedHead: "", publish: true, env }), /changed/);
  assert.equal((await exec("git", ["--git-dir", remote, "rev-parse", "stable"])).stdout.trim(), first.commit);
  const next = join(root, "next");
  await mkdir(next);
  const newer = await fixture(next, "1.2.4");
  const nextSnapshot = join(next, "snapshot");
  await buildStableMarketplace({ ...newer, out: nextSnapshot });
  const third = await promoteSnapshot({ snapshot: nextSnapshot, remote, expectedHead: first.commit, publish: true, env });
  assert.equal((await exec("git", ["--git-dir", remote, "rev-parse", "stable^"])).stdout.trim(), first.commit);
  await assert.rejects(promoteSnapshot({ snapshot, remote, expectedHead: third.commit, publish: true, env }), /downgrade/);
  assert.equal((await exec("git", ["--git-dir", remote, "rev-parse", "stable"])).stdout.trim(), third.commit);
});


test("successful Actions CI cannot substitute for a commit-bound local release receipt", () => {
  const manifest = { version: "1.2.3", source: { ref: "v1.2.3", commit, worktreeDirty: false, cleanTaggedCheckout: true } };
  const runs = [{ conclusion: "success", event: "push", headSha: commit, headBranch: "main", databaseId: 12 }];
  assert.throws(() => assertPromotion({ manifest, tagCommit: commit, runs }), /local.*verification|local.*receipt/i);
});
