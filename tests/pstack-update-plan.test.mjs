import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planPstackUpdate } from "../tools/plan-pstack-update.mjs";
import { derivePstack } from "../tools/derive-pstack.mjs";

const tool = fileURLToPath(new URL("../tools/plan-pstack-update.mjs", import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const blob = bytes => createHash("sha1").update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest("hex");
const source = "---\nname: example\ndescription: Example\n---\n\nUse cursor.\n";
const metadata = JSON.stringify({ name: "pstack", version: "1.0.0" });
const git = (cwd, ...args) => {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
async function put(root, path, bytes) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), bytes); }
async function snapshot(root, prefix = "") {
  const result = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, path));
    else if (entry.isFile()) result[path] = hash(await readFile(join(root, path)));
  }
  return result;
}
async function fixture(t) {
  const folder = await mkdtemp(join(tmpdir(), "oms-pstack-plan-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const root = join(folder, "oms"), checkout = join(folder, "official");
  await mkdir(checkout); await mkdir(root);
  git(checkout, "init", "-q"); git(checkout, "config", "user.name", "OMS fixture");
  git(checkout, "config", "user.email", "fixture@example.invalid");
  git(checkout, "config", "core.precomposeUnicode", "false");
  git(checkout, "remote", "add", "origin", "https://github.com/cursor/plugins.git");
  const files = { ".cursor-plugin/plugin.json": metadata, "plugin.json": metadata, "LICENSE": "MIT\n",
    "skills/example/SKILL.md": source, "skills/example/references/notes.md": "Keep this reference.\n" };
  for (const [path, bytes] of Object.entries(files)) await put(checkout, `pstack/${path}`, bytes);
  git(checkout, "add", "."); git(checkout, "commit", "-qm", "baseline");
  const baseline = git(checkout, "rev-parse", "HEAD");
  const sourceRoot = `upstream/snapshots/official/${baseline}/pstack`;
  for (const [path, bytes] of Object.entries(files)) await put(root, `${sourceRoot}/${path}`, bytes);
  const replacement = { before: "cursor", after: "portable", expectedOccurrences: 1, category: "tools", reason: "Fixture host adaptation." };
  const manifest = { schemaVersion: 1, sourceRoot, revision: baseline, entries: [
    { source: "skills/example/SKILL.md", output: "src/core/skills/example/SKILL.md", sourceSha256: hash(source), outputSha256: hash(source.replace("cursor", "portable")), replacements: [replacement] },
    { source: "skills/example/references/notes.md", output: "src/core/skills/example/references/notes.md", sourceSha256: hash(files["skills/example/references/notes.md"]), outputSha256: hash(files["skills/example/references/notes.md"]), replacements: [] },
  ] };
  await put(root, "upstream/parity-derivations.json", JSON.stringify(manifest));
  await put(root, "upstream/imports.json", JSON.stringify({ schemaVersion: 2, revision: baseline,
    derivationManifest: "upstream/parity-derivations.json", sourceReceipt: "upstream/receipt.json" }));
  const receipt = { revision: baseline, repository: "https://github.com/cursor/plugins", files: Object.entries(files).map(([path, bytes]) => ({
    upstreamPath: `pstack/${path}`, path: `${sourceRoot}/${path}`, sha256: hash(bytes), blobSha1: blob(bytes),
  })) };
  await put(root, "upstream/receipt.json", JSON.stringify(receipt));
  await put(root, "upstream/history/previous.txt", "Historical evidence must stay identical.\n");
  for (const host of ["codex", "claude-code", "omp", "pi"]) await mkdir(join(root, "src/adapters", host), { recursive: true });
  await derivePstack({ root });
  const commit = () => { git(checkout, "add", "-A"); git(checkout, "commit", "-qm", "candidate", "--allow-empty"); return git(checkout, "rev-parse", "HEAD"); };
  const plan = revision => planPstackUpdate({ root, sourceCheckout: checkout, revision: revision ?? baseline });
  const unchanged = async run => {
    const before = await snapshot(folder);
    const result = await run();
    assert.deepEqual(await snapshot(folder), before, "all OMS, historical, candidate and .git bytes remain unchanged");
    return result;
  };
  return { root, checkout, sourceRoot, baseline, manifest, receipt, files, commit, plan, unchanged };
}

test("same pin is a deterministic no-op and preview writes zero bytes", async t => {
  const f = await fixture(t);
  const plan = await f.unchanged(() => f.plan());
  assert.equal(plan.status, "unchanged"); assert.equal(plan.operation, "preview-only");
  assert.equal(plan.baseline.fileCount, 5); assert.equal(plan.candidate.version, "1.0.0");
  assert.equal(plan.issues.length, 0);
  assert.deepEqual(plan.targets, ["claude-code", "codex", "omp", "pi"]);
  assert.deepEqual(plan.derivations[0].anchorChecks, [{ replacement: 1, category: "tools", expected: 1, observed: 1 }]);
  assert.deepEqual(await f.plan(), plan);
  assert.equal(Object.hasOwn(plan, "writes"), false);
});
test("official text and source-only binary changes are classified without applying", async t => {
  const f = await fixture(t);
  await put(f.checkout, "pstack/skills/example/SKILL.md", `${source}New official wording.\n`);
  await put(f.checkout, "pstack/assets/new.bin", Buffer.from([0, 1, 2, 255]));
  for (const path of ["plugin.json", ".cursor-plugin/plugin.json"]) await put(f.checkout, `pstack/${path}`, metadata.replace("1.0.0", "1.1.0"));
  const revision = f.commit(), plan = await f.unchanged(() => f.plan(revision));
  assert.equal(plan.status, "review-required"); assert.equal(plan.candidate.revision, revision); assert.equal(plan.candidate.version, "1.1.0");
  assert.equal(plan.files.find(file => file.path === "assets/new.bin").ownership, "source-only");
  assert.equal(plan.files.find(file => file.path === "skills/example/SKILL.md").change, "modified");
  assert.equal(plan.derivations[0].proposedOutputSha256, hash(`${source}New official wording.\n`.replace("cursor", "portable")));
});
for (const [name, next, observed] of [["missing", source.replace("cursor", "upstream"), 0], ["duplicated", source.replace("cursor", "cursor cursor"), 2]]) {
  test(`${name} replacement anchor blocks without advancing any pin`, async t => {
    const f = await fixture(t); await put(f.checkout, "pstack/skills/example/SKILL.md", next);
    const revision = f.commit(), plan = await f.unchanged(() => f.plan(revision));
    assert.equal(plan.status, "blocked");
    assert.deepEqual(plan.issues.find(issue => issue.code === "ANCHOR_OCCURRENCE_MISMATCH"), {
      code: "ANCHOR_OCCURRENCE_MISMATCH", path: "skills/example/SKILL.md", severity: "blocking", output: "src/core/skills/example/SKILL.md", replacement: 1, category: "tools", expected: 1, observed,
    });
    assert.equal(plan.derivations[0].proposedOutputSha256, null);
    assert.equal(JSON.parse(await readFile(join(f.root, "upstream/imports.json"))).revision, f.baseline);
  });
}
test("new Skill and role enter a metadata review list", async t => {
  const f = await fixture(t);
  await put(f.checkout, "pstack/skills/new-one/SKILL.md", source.replace("example", "new-one"));
  await put(f.checkout, "pstack/agents/new-reader.md", "Read only.\n");
  const revision = f.commit(), plan = await f.unchanged(() => f.plan(revision));
  assert.equal(plan.status, "review-required");
  assert.deepEqual(plan.metadataReviews.map(item => item.metadata), ["src/core/roles/new-reader/role.json", "src/core/skills/new-one/skill.json"]);
  assert.equal(plan.issues.filter(issue => issue.code === "SEMANTIC_MAPPING_REQUIRED").length, 2);
});
test("deleting a derived source with local edits reports both ownership and deletion conflicts", async t => {
  const f = await fixture(t);
  await rm(join(f.checkout, "pstack/skills/example/SKILL.md"));
  await put(f.root, "src/core/skills/example/SKILL.md", "User changes.\n");
  const revision = f.commit(), plan = await f.unchanged(() => f.plan(revision));
  assert.equal(plan.status, "blocked");
  assert(plan.issues.some(issue => issue.code === "DELETE_MODIFIED_OUTPUT" && issue.localState === "modified"));
  assert(plan.issues.some(issue => issue.code === "DERIVED_SOURCE_DELETED"));
  assert.equal(plan.files.find(file => file.path === "skills/example/SKILL.md").change, "deleted");
});
test("replacement anchors are replayed in declared sequence", async t => {
  const f = await fixture(t), entry = f.manifest.entries[0];
  entry.replacements.push({ before: "portable", after: "host", expectedOccurrences: 1, category: "tools", reason: "Second exact adaptation." });
  entry.outputSha256 = hash(source.replace("cursor", "host"));
  await put(f.root, "upstream/parity-derivations.json", JSON.stringify(f.manifest));
  await derivePstack({ root: f.root });
  const plan = await f.unchanged(() => f.plan());
  assert.equal(plan.status, "unchanged"); assert.equal(plan.derivations[0].anchorChecks.length, 2);
  assert.equal(plan.derivations[0].proposedOutputSha256, hash(source.replace("cursor", "host")));
});
test("binary derived text blocks rather than producing a replacement hash", async t => {
  const f = await fixture(t); await put(f.checkout, "pstack/skills/example/SKILL.md", Buffer.from([255, 0]));
  const revision = f.commit(), plan = await f.unchanged(() => f.plan(revision));
  assert.equal(plan.status, "blocked"); assert.equal(plan.issues[0].code, "DERIVED_SOURCE_NOT_UTF8");
  assert.equal(plan.derivations[0].proposedOutputSha256, null);
});
for (const state of ["modified", "missing"]) test(`local ${state} output blocks even a no-op candidate`, async t => {
  const f = await fixture(t), path = join(f.root, "src/core/skills/example/SKILL.md");
  if (state === "missing") await rm(path); else await writeFile(path, "Local edit.");
  const plan = await f.unchanged(() => f.plan());
  assert.equal(plan.status, "blocked"); assert.equal(plan.issues[0].code, "LOCAL_OUTPUT_DRIFT"); assert.equal(plan.issues[0].localState, state);
});
test("a new official Skill colliding with local metadata or its portable spelling is blocked", async t => {
  const f = await fixture(t);
  await put(f.checkout, "pstack/skills/local-extra/SKILL.md", source);
  await put(f.root, "src/core/skills/LOCAL-EXTRA/skill.json", "{}");
  const revision = f.commit(), plan = await f.unchanged(() => f.plan(revision));
  assert.equal(plan.status, "blocked"); assert(plan.issues.some(issue => issue.code === "LOCAL_PATH_COLLISION"));
});
for (const [a, b] of [["UPPER", "upper"], ["caf\u00e9", "cafe\u0301"]]) test(`portable candidate collision ${a}/${b} is blocked`, async t => {
  const f = await fixture(t);
  // Index entries preserve both spellings even on a case-insensitive working tree.
  const oid = git(f.checkout, "rev-parse", `${f.baseline}:pstack/LICENSE`);
  for (const name of [a, b]) git(f.checkout, "update-index", "--add", "--cacheinfo", `100644,${oid},pstack/${name}/file.md`);
  git(f.checkout, "commit", "-qm", "portable collisions");
  const revision = git(f.checkout, "rev-parse", "HEAD"), plan = await f.unchanged(() => f.plan(revision));
  assert.equal(plan.status, "blocked"); assert(plan.issues.some(issue => issue.code === "PORTABLE_PATH_COLLISION"));
});
test("Git executable mode-only changes are visible", async t => {
  const f = await fixture(t);
  git(f.checkout, "update-index", "--chmod=+x", "pstack/LICENSE"); git(f.checkout, "commit", "-qm", "mode change");
  const plan = await f.plan(git(f.checkout, "rev-parse", "HEAD")), file = plan.files.find(file => file.path === "LICENSE");
  assert.equal(file.change, "modified"); assert.equal(file.oldSha256, file.newSha256); assert.equal(file.newMode, "100755");
});
test("committed symlinks are diagnosed without following their target", async t => {
  const f = await fixture(t), bytes = "../../outside";
  const result = spawnSync("git", ["-C", f.checkout, "hash-object", "-w", "--stdin"], { input: bytes, encoding: "utf8" });
  assert.equal(result.status, 0);
  git(f.checkout, "update-index", "--add", "--cacheinfo", `120000,${result.stdout.trim()},pstack/linked`);
  git(f.checkout, "commit", "-qm", "symlink");
  const plan = await f.unchanged(() => f.plan(git(f.checkout, "rev-parse", "HEAD")));
  assert.equal(plan.status, "blocked"); assert.equal(plan.issues.find(issue => issue.code === "UNSUPPORTED_GIT_ENTRY").mode, "120000");
});
test("submodule entries are diagnosed without reading another repository", async t => {
  const f = await fixture(t);
  git(f.checkout, "update-index", "--add", "--cacheinfo", `160000,${f.baseline},pstack/submodule`);
  git(f.checkout, "commit", "-qm", "submodule");
  const plan = await f.unchanged(() => f.plan(git(f.checkout, "rev-parse", "HEAD")));
  assert.equal(plan.status, "blocked"); assert.equal(plan.issues.find(issue => issue.code === "UNSUPPORTED_GIT_ENTRY").type, "commit");
});
test("dirty candidate working files are ignored in favor of exact committed bytes", async t => {
  const f = await fixture(t); await put(f.checkout, "pstack/skills/example/SKILL.md", "Not committed and missing the anchor.");
  const plan = await f.unchanged(() => f.plan()); assert.equal(plan.status, "unchanged");
});
test("reference fork origin cannot be used as official input", async t => {
  const f = await fixture(t); git(f.checkout, "remote", "set-url", "origin", "https://github.com/michael-denyer/pstack-claude.git");
  await f.unchanged(() => assert.rejects(f.plan(), /Only the official/));
});
test("unrelated candidate history cannot replace the baseline", async t => {
  const f = await fixture(t); git(f.checkout, "checkout", "--orphan", "unrelated");
  const revision = f.commit(); await f.unchanged(() => assert.rejects(f.plan(revision), /must descend/));
});
for (const mutation of ["receipt", "snapshot", "extra-snapshot", "traversal"]) test(`invalid ${mutation} fails closed with zero writes`, async t => {
  const f = await fixture(t);
  if (mutation === "receipt") { f.receipt.files.pop(); await put(f.root, "upstream/receipt.json", JSON.stringify(f.receipt)); }
  if (mutation === "snapshot") await put(f.root, `${f.sourceRoot}/LICENSE`, "Changed snapshot.");
  if (mutation === "extra-snapshot") await put(f.root, `${f.sourceRoot}/extra.md`, "Undeclared.");
  if (mutation === "traversal") { f.manifest.entries[0].source = "../outside.md"; await put(f.root, "upstream/parity-derivations.json", JSON.stringify(f.manifest)); }
  await f.unchanged(() => assert.rejects(f.plan(), /mismatch|traversal/));
});
test("local symlink escapes are rejected without writing through them", async t => {
  const f = await fixture(t), outside = join(f.root, "outside.md"), output = join(f.root, "src/core/skills/example/SKILL.md");
  await put(f.root, "outside.md", "Outside evidence."); await rm(output);
  try { await symlink(outside, output); } catch (error) { if (["EPERM", "EACCES"].includes(error.code)) return t.skip(error.code); throw error; }
  await f.unchanged(() => assert.rejects(f.plan(), /Symlink in local path/));
  assert.equal(await readFile(outside, "utf8"), "Outside evidence.");
});
test("CLI prints JSON, uses bounded exit states, and has no apply flag", async t => {
  const f = await fixture(t);
  const args = [tool, "--root", f.root, "--source-checkout", f.checkout, "--revision", f.baseline];
  const run = extra => spawnSync(process.execPath, [...args, ...extra], { encoding: "utf8" });
  const clean = await f.unchanged(() => run([])); assert.equal(clean.status, 0, clean.stderr); assert.equal(JSON.parse(clean.stdout).status, "unchanged");
  await put(f.root, "src/core/skills/example/SKILL.md", "Local edit.");
  const blocked = await f.unchanged(() => run([])); assert.equal(blocked.status, 1); assert.equal(JSON.parse(blocked.stdout).status, "blocked");
  for (const extra of [["--apply", "yes"], ["--revision", f.baseline], ["--unknown"], ["--root"]]) {
    const invalid = await f.unchanged(() => run(extra)); assert.equal(invalid.status, 2); assert.equal(invalid.stdout, ""); assert.match(invalid.stderr, /Usage/);
  }
});
