import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { sha256 } from "../tools/release-lib.mjs";
import { assertBuildEnvironment, assetNames, BUILD_ENVIRONMENT, readLocalVerification,
  REQUIRED_CHECKS, snapshotAssets } from "../tools/local-release-lib.mjs";
import { assertNoDowngrade, assertReleaseCompatible, inspectSource, main, parseArgs } from "../tools/local-release.mjs";

const exec = promisify(execFile), commit = "a".repeat(40), tree = "b".repeat(40);
const pinnedRuntime = process.versions.node === BUILD_ENVIRONMENT.node && process.versions.zlib === BUILD_ENVIRONMENT.zlib;
const json = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
async function temporary(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "oms-local-release-test-")));
  t.after(() => rm(root, { recursive: true, force: true })); return root;
}
async function fixture(t, tagged = true) {
  const root = await temporary(t), assets = join(root, "assets");
  await mkdir(assets); await mkdir(join(root, "logs"));
  const source = { commit, tree, ref: tagged ? "v1.2.3" : "HEAD", worktreeDirty: false, cleanTaggedCheckout: tagged };
  const manifest = { schemaVersion: 1, name: "oh-my-stack", version: "1.2.3", source: { ...source } };
  delete manifest.source.tree;
  for (const name of assetNames("1.2.3")) await writeFile(join(assets, name), name);
  await json(join(assets, "release-manifest.json"), manifest);
  const review = { schemaVersion: 1, tree, verdict: "approved", evidence: ["Independent tree review"] };
  await json(join(root, "review.json"), review);
  const checks = [];
  for (const name of REQUIRED_CHECKS) {
    const log = `logs/${name}.log`, bytes = Buffer.from(`Passed ${name}\n`); await writeFile(join(root, log), bytes);
    checks.push({ name, exitCode: 0, log, sha256: sha256(bytes) });
  }
  const receipt = { schemaVersion: 1, kind: "oh-my-stack-local-release", repository: "williamwue/oh-my-stack", source,
    environment: { ...BUILD_ENVIRONMENT, platform: "darwin", arch: "arm64" }, checks,
    assets: await snapshotAssets(assets, "1.2.3"), review,
    reviewFile: { path: "review.json", sha256: sha256(await readFile(join(root, "review.json"))) } };
  const path = join(root, "verification.json"); await json(path, receipt);
  const args = { path, manifest: tagged ? manifest : undefined, tagCommit: commit, tagTree: tree, assets };
  return { root, assets, manifest, receipt, path, args, read: () => readLocalVerification(args) };
}

test("pinned environment and CLI arguments fail before any output", async (t) => {
  assertBuildEnvironment(BUILD_ENVIRONMENT);
  assert.throws(() => assertBuildEnvironment({ node: "22.23.3", zlib: "1.2.12" }), /requires Node/);
  assert.throws(() => assertBuildEnvironment({ node: "22.23.4", zlib: BUILD_ENVIRONMENT.zlib }), /requires Node/);
  const root = await temporary(t), out = join(root, "evidence");
  const cli = resolve("tools/local-release.mjs");
  const result = await exec(process.execPath, ["--input-type=module", "-e",
    `Object.defineProperty(process.versions, 'zlib', {value:'1.2.12'}); const {main}=await import(${JSON.stringify(`file://${cli}`)}); await main(${JSON.stringify(["--source", root, "--out", out, "--review", join(root, "review.json")])});`]).catch((error) => error);
  assert.notEqual(result.code, 0); assert.match(result.stderr, /requires Node/); await assert.rejects(access(out));
  assert.throws(() => parseArgs(["--source", root, "--out", out, "--review", "r", "--publish"]), /publication requires/);
  assert.throws(() => parseArgs(["--source", root, "--out", out, "--review", "r", "--tag", "v1.2.3-rc.1"]), /vVERSION/);
  assert.throws(() => parseArgs(["--source", root, "--out", out, "--out", out, "--review", "r"]), /duplicate/);
});
test("valid tagged evidence and clean HEAD validation evidence verify offline", async (t) => {
  const tagged = await fixture(t), head = await fixture(t, false);
  assert.deepEqual(await tagged.read(), tagged.receipt);
  assert.deepEqual(await head.read(), head.receipt);
  await assert.rejects(readLocalVerification({ ...head.args, manifest: head.manifest }), /tagged/);
  await assert.rejects(readLocalVerification({ ...tagged.args, manifest: undefined }), /validation-only/);
});
test("source, review, required checks, duplicates and asset inventory are bound", async (t) => {
  const f = await fixture(t);
  for (const mutate of [
    (r) => { r.repository = "other/repo"; },
    (r) => { r.environment.zlib = "1.2.12"; },
    (r) => { r.source.commit = "c".repeat(40); },
    (r) => { r.source.tree = "c".repeat(40); },
    (r) => { r.source.worktreeDirty = true; },
    (r) => { r.source.cleanTaggedCheckout = false; },
    (r) => { r.source.ref = "HEAD"; },
    (r) => { r.review.tree = "c".repeat(40); },
    (r) => { r.review.verdict = "pending"; },
    (r) => { r.review.evidence = [""]; },
    (r) => { r.checks.pop(); },
    (r) => { r.checks[0].exitCode = 1; },
    (r) => { r.checks.push(r.checks[0]); },
    (r) => { r.checks[1].log = r.checks[0].log; },
    (r) => { r.assets.pop(); },
    (r) => { r.assets[0] = r.assets[1]; },
    (r) => { r.assets[0].size++; },
  ]) {
    const bad = structuredClone(f.receipt); mutate(bad); await json(f.path, bad); await assert.rejects(f.read());
  }
  await json(f.path, f.receipt);
  await assert.rejects(readLocalVerification({ ...f.args, tagCommit: "d".repeat(40) }), /source/);
  await assert.rejects(readLocalVerification({ ...f.args, manifest: { ...f.manifest, version: "1.2.4" } }), /manifest/);
});
test("traversal, symlink files and ancestor directories never count as evidence", async (t) => {
  const f = await fixture(t);
  for (const log of ["../escape", "/etc/passwd", "logs/../review.json", "logs//npm-ci.log", "logs\\npm-ci.log"]) {
    const bad = structuredClone(f.receipt); bad.checks[0].log = log; await json(f.path, bad);
    await assert.rejects(f.read(), /unsafe/);
  }
  await json(f.path, f.receipt);
  const log = join(f.root, f.receipt.checks[0].log), backup = join(f.root, "backup.log");
  await cp(log, backup); await rm(log); await symlink(backup, log);
  await assert.rejects(f.read(), /regular/); await rm(log); await cp(backup, log);
  const logs = join(f.root, "logs"), moved = join(f.root, "saved-logs");
  await cp(logs, moved, { recursive: true }); await rm(logs, { recursive: true }); await symlink(moved, logs);
  await assert.rejects(f.read(), /regular/); await rm(logs); await cp(moved, logs, { recursive: true });
  const receiptBackup = join(f.root, "receipt-backup.json"); await cp(f.path, receiptBackup); await rm(f.path); await symlink(receiptBackup, f.path);
  await assert.rejects(f.read(), /regular/);
  await rm(f.path); await cp(receiptBackup, f.path);
  const alias = join(await temporary(t), "evidence-alias"); await symlink(f.root, alias);
  await assert.rejects(readLocalVerification({ ...f.args, path: join(alias, "verification.json") }), /ancestor/);
});
test("tampered logs, reviews, assets and extra assets are rejected", async (t) => {
  const f = await fixture(t);
  for (const [path, pattern] of [[join(f.root, f.receipt.checks[0].log), /log digest/],
    [join(f.root, "review.json"), /review file digest/], [join(f.assets, f.receipt.assets[0].name), /asset digest/]]) {
    const original = await readFile(path); await writeFile(path, "tampered"); await assert.rejects(f.read(), pattern); await writeFile(path, original);
  }
  const archive = join(f.assets, f.receipt.assets[0].name), saved = join(f.root, "archive");
  await cp(archive, saved); await rm(archive); await symlink(saved, archive); await assert.rejects(f.read(), /regular/);
  await rm(archive); await cp(saved, archive); await writeFile(join(f.assets, "extra"), "extra"); await assert.rejects(f.read(), /exactly seven/);
  await rm(join(f.assets, "extra")); await rm(archive); await assert.rejects(f.read(), /exactly seven/); await cp(saved, archive);
  const log = join(f.root, f.receipt.checks[0].log); await rm(log); await assert.rejects(f.read(), { code: "ENOENT" });
});
test("release resume preserves published assets and accepts only matching draft subsets", () => {
  const records = [{ name: "a", sha256: "a".repeat(64), size: 1 }, { name: "b", sha256: "b".repeat(64), size: 2 }];
  const assets = records.map((r) => ({ name: r.name, digest: `sha256:${r.sha256}`, size: r.size, state: "uploaded" }));
  const published = { id: 1, tag_name: "v1.2.3", draft: false, prerelease: false, published_at: "2026-10-08", assets };
  assert.deepEqual(assertReleaseCompatible(published, records, "v1.2.3", "notes"), []);
  const draft = { ...published, draft: true, body: "notes", assets: assets.slice(0, 1) };
  assert.deepEqual(assertReleaseCompatible(draft, records, "v1.2.3", "notes"), records.slice(1));
  for (const bad of [{ ...published, assets: assets.slice(1) }, { ...published, prerelease: true },
    { ...published, assets: [assets[0], assets[0]] }, { ...draft, body: "other" },
    { ...draft, assets: [{ ...assets[0], digest: `sha256:${"c".repeat(64)}` }] },
    { ...draft, assets: [{ ...assets[0], name: "unexpected" }] }]) assert.throws(() => assertReleaseCompatible(bad, records, "v1.2.3", "notes"));
  assertNoDowngrade("v1.2.3", { tag_name: "v1.2.3" }); assertNoDowngrade("v1.2.4", { tag_name: "v1.2.3" });
  assert.throws(() => assertNoDowngrade("v1.2.3", { tag_name: "v1.3.0" }), /downgrade/);
});
async function gitFixture(t) {
  const root = await temporary(t), source = join(root, "source"); await mkdir(source);
  const git = (...args) => exec("git", ["-c", "user.name=Offline fixture", "-c", "user.email=fixture@example.invalid", ...args], { cwd: source });
  await git("init", "--quiet"); await mkdir(join(source, "src/core"), { recursive: true });
  await json(join(source, "src/core/project.json"), { name: "oh-my-stack", version: "1.2.3" });
  await json(join(source, "package.json"), { name: "oh-my-stack", private: true });
  await git("add", "."); await git("commit", "--quiet", "-m", "offline fixture"); await git("tag", "v1.2.3");
  const state = await inspectSource(source, "v1.2.3");
  const review = join(root, "review.json"); await json(review, { schemaVersion: 1, tree: state.tree, verdict: "approved", evidence: ["fixture"] });
  return { root, source, review, state, git };
}
test("actual Git source and review checks reject mismatches before output", { skip: !pinnedRuntime && "requires pinned release runtime" }, async (t) => {
  const f = await gitFixture(t), out = join(f.root, "evidence");
  assert.equal((await inspectSource(f.source)).ref, "HEAD");
  await assert.rejects(inspectSource(f.source, "v1.2.4"), /tag\/version/);
  await json(f.review, { schemaVersion: 1, tree, verdict: "approved", evidence: ["wrong tree"] });
  await assert.rejects(main(["--source", f.source, "--out", out, "--review", f.review]), /exact source tree/); await assert.rejects(access(out));
  await writeFile(join(f.source, "untracked"), "dirty"); await assert.rejects(inspectSource(f.source), /clean/);
  await rm(join(f.source, "untracked"));
  await assert.rejects(main(["--source", f.source, "--out", join(f.source, "evidence"), "--review", f.review]), /outside/);
});
test("a failed real npm check retains logs and does not emit a success receipt", { skip: !pinnedRuntime && "requires pinned release runtime" }, async (t) => {
  const f = await gitFixture(t), out = join(f.root, "evidence");
  // Deliberately no lockfile: npm ci must fail before later checks or remote writes.
  await assert.rejects(main(["--source", f.source, "--out", out, "--review", f.review]), /npm-ci failed/);
  const checks = JSON.parse(await readFile(join(out, "checks.json")));
  assert.equal(checks.length, 1); assert.notEqual(checks[0].exitCode, 0);
  assert.match(await readFile(join(out, checks[0].log), "utf8"), /lockfile|package-lock/i);
  const failure = JSON.parse(await readFile(join(out, "failure.json"))); assert.equal(failure.verificationSucceeded, false);
  await assert.rejects(access(join(out, "verification.json")));
});
