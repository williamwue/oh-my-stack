import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { sha256 } from "../tools/pstack-source.mjs";
import { readReferenceAdoptions } from "../tools/reference-adoptions.mjs";
import { planReferenceUpdate } from "../tools/plan-reference-update.mjs";
import { readPstackDerivations } from "../tools/derive-pstack.mjs";

const git = (cwd, ...args) => {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
const put = async (root, path, bytes) => { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), bytes); };
const json = (root, path, value) => put(root, path, JSON.stringify(value, null, 2) + "\n");
const load = async (root, path) => JSON.parse(await readFile(join(root, path), "utf8"));
const document = "---\nname: example\ndescription: Example\n---\n\nOriginal behavior.\n";
async function initialize(path, origin) {
  await mkdir(path); git(path, "init", "-q"); git(path, "config", "user.name", "Fixture");
  git(path, "config", "user.email", "fixture@example.test"); git(path, "remote", "add", "origin", origin);
}
function commit(path) { git(path, "add", "."); git(path, "commit", "-qm", "fixture"); return git(path, "rev-parse", "HEAD"); }
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "oms-dual-reference-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "oms"), official = join(directory, "official"), reference = join(directory, "reference");
  await mkdir(root); await initialize(official, "https://github.com/cursor/plugins.git");
  await initialize(reference, "git@github.com:michael-denyer/pstack-claude.git");
  const officialFiles = { "skills/example/SKILL.md": document,
    "plugin.json": '{"name":"pstack","version":"1.0.0"}',
    ".cursor-plugin/plugin.json": '{"name":"pstack","version":"1.0.0"}' };
  for (const [path, bytes] of Object.entries(officialFiles)) await put(official, `pstack/${path}`, bytes);
  const officialRevision = commit(official), sourceRoot = `upstream/snapshots/official/${officialRevision}/pstack`;
  const receipt = { repository: "https://github.com/cursor/plugins", revision: officialRevision, files: [] };
  for (const [path, bytes] of Object.entries(officialFiles)) {
    await put(root, `${sourceRoot}/${path}`, bytes);
    receipt.files.push({ upstreamPath: `pstack/${path}`, path: `${sourceRoot}/${path}`, sha256: sha256(bytes), blobSha1: git(official, "rev-parse", `${officialRevision}:pstack/${path}`) });
  }
  await json(root, "upstream/official-receipt.json", receipt);
  const output = "src/core/skills/example/SKILL.md";
  await put(root, output, document); await mkdir(join(root, "src/adapters"), { recursive: true });
  await json(root, "upstream/parity-derivations.json", { schemaVersion: 1, sourceRoot, revision: officialRevision,
    entries: [{ source: "skills/example/SKILL.md", output, sourceSha256: sha256(document), outputSha256: sha256(document), replacements: [] }] });
  await json(root, "upstream/imports.json", { schemaVersion: 2, revision: officialRevision,
    derivationManifest: "upstream/parity-derivations.json", sourceReceipt: "upstream/official-receipt.json" });
  const referenceFiles = { LICENSE: "MIT fixture\n", "tools/upstream.json": JSON.stringify({ remote: receipt.repository, components: { pstack: { sha: officialRevision } } }),
    "tools/forks.json": "{}", "tools/helper.mjs": "baseline helper\n", "plugins/pstack/skills/example/SKILL.md": document };
  for (const [path, bytes] of Object.entries(referenceFiles)) await put(reference, path, bytes);
  const referenceRevision = commit(reference);
  const refReceipt = { repository: "https://github.com/michael-denyer/pstack-claude", revision: referenceRevision, officialRevision, files: [] };
  for (const [path, bytes] of Object.entries(referenceFiles)) {
    const snapshot = `upstream/snapshots/pstack-claude/${referenceRevision}/${path}`;
    await put(root, snapshot, bytes);
    refReceipt.files.push({ path, snapshot, mode: "100644", blobSha1: git(reference, "rev-parse", `${referenceRevision}:${path}`), sha256: sha256(bytes) });
  }
  await json(root, "upstream/ref-receipt.json", refReceipt);
  await put(root, "upstream/sources.yaml", `sources:\n  - id: pstack-claude\n    inspected_commit: ${referenceRevision}\n`);
  await put(root, "tools/helper.mjs", "local adaptation\n"); await put(root, "evidence.txt", "fixture assertions\n");
  await json(root, "upstream/reference-adoptions.json", { schemaVersion: 1,
    sources: { official: { repository: receipt.repository, assessedRevision: officialRevision }, reference: { repository: refReceipt.repository, assessedRevision: referenceRevision, receipts: ["upstream/ref-receipt.json"] } },
    adoptions: [{ id: "example-helper", decision: "adapted", kind: "implementation", referenceRevision, assessedRevision: referenceRevision,
      referencePaths: ["tools/helper.mjs", "plugins/pstack/skills/example/SKILL.md"], officialPaths: ["pstack/skills/example/SKILL.md"], officialNote: "Compare original behavior.",
      outputs: [{ path: "tools/helper.mjs", sha256: sha256("local adaptation\n") }], evidence: ["evidence.txt"], rationale: "Preserve local host boundary.", revisit: "Reassess changed helper behavior." }] });
  return { root, official, reference, officialRevision, referenceRevision, output,
    options: { root, sourceCheckout: official, revision: officialRevision, referenceCheckout: reference, referenceRevision } };
}
async function snapshot(root, prefix = "") {
  const result = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, path));
    else if (entry.isFile()) result[path] = sha256(await readFile(join(root, path)));
  }
  return result;
}

test("both fixed sources produce a deterministic unchanged plan without any writes", async t => {
  const f = await fixture(t), before = await snapshot(dirname(f.root));
  const first = await planReferenceUpdate(f.options), second = await planReferenceUpdate(f.options);
  assert.equal(first.status, "unchanged"); assert.deepEqual(first, second);
  assert.deepEqual(await snapshot(dirname(f.root)), before);
  await put(f.reference, "tools/helper.mjs", "dirty working file ignored\n");
  assert.deepEqual(await planReferenceUpdate(f.options), first);
});

test("both source deltas expose adoption impacts, unmapped changes and byte convergence", async t => {
  const f = await fixture(t), changed = document.replace("Original", "Updated");
  await put(f.official, "pstack/skills/example/SKILL.md", changed); const revision = commit(f.official);
  await put(f.reference, "plugins/pstack/skills/example/SKILL.md", changed);
  await put(f.reference, "tools/helper.mjs", "changed helper\n"); await put(f.reference, "new-feature.txt", "unassessed\n");
  await json(f.reference, "tools/upstream.json", { remote: "https://github.com/cursor/plugins", components: { pstack: { sha: revision } } });
  const referenceRevision = commit(f.reference);
  const plan = await planReferenceUpdate({ ...f.options, revision, referenceRevision });
  assert.equal(plan.status, "review-required"); assert.equal(plan.reference.upstreamChanged, true);
  assert(plan.reference.unmappedChanges.includes("new-feature.txt"));
  assert.equal(plan.adoptionImpacts[0].status, "reassess");
  assert(plan.adoptionImpacts[0].officialChanges.includes("pstack/skills/example/SKILL.md"));
  assert(plan.adoptionImpacts[0].referenceChanges.includes("tools/helper.mjs"));
  assert.deepEqual(plan.adoptionImpacts[0].convergenceCandidates, ["plugins/pstack/skills/example/SKILL.md"]);
});

test("deletions and unsupported source entries remain visible and block unsafe candidates", async t => {
  const f = await fixture(t);
  await rm(join(f.reference, "tools/helper.mjs")); await symlink("LICENSE", join(f.reference, "alias"));
  const referenceRevision = commit(f.reference), plan = await planReferenceUpdate({ ...f.options, referenceRevision });
  assert.equal(plan.status, "blocked"); assert(plan.reference.issues.some(issue => issue.code === "UNSUPPORTED_GIT_ENTRY"));
  assert(plan.adoptionImpacts[0].referenceChanges.includes("tools/helper.mjs"));
});

test("local output drift and tampered source snapshots fail before a plan is accepted", async t => {
  const f = await fixture(t);
  await put(f.root, "tools/helper.mjs", "unreviewed change\n");
  await assert.rejects(readReferenceAdoptions({ root: f.root }), /Adoption output drift/);
  await put(f.root, "tools/helper.mjs", "local adaptation\n");
  const receipt = await load(f.root, "upstream/ref-receipt.json");
  await put(f.root, receipt.files[0].snapshot, "changed license\n");
  await assert.rejects(planReferenceUpdate(f.options), /Reference snapshot drift/);
});

test("unknown paths, traversal, missing evidence and assessed pin drift are rejected", async t => {
  const f = await fixture(t), original = await load(f.root, "upstream/reference-adoptions.json");
  for (const [edit, error] of [
    [r => r.adoptions[0].referencePaths.push("unreceipted.txt"), /Unreceipted/],
    [r => r.adoptions[0].officialPaths.push("pstack/absent"), /Unknown official/],
    [r => r.adoptions[0].evidence.push("../escape"), /Unsafe path/],
    [r => r.adoptions[0].evidence.push("missing.txt"), /ENOENT/],
    [r => r.sources.reference.assessedRevision = "0".repeat(40), /source record disagree/],
  ]) {
    const record = structuredClone(original); edit(record); await json(f.root, "upstream/reference-adoptions.json", record);
    await assert.rejects(readReferenceAdoptions({ root: f.root }), error);
  }
});

test("policy changes require a named adopted decision and exact derivation in both directions", async t => {
  const f = await fixture(t), manifest = await load(f.root, "upstream/parity-derivations.json");
  manifest.entries[0].replacements = [{ before: "Original", after: "Policy", category: "policy", adoptionId: "example-helper", expectedOccurrences: 1, reason: "example-helper: selected policy" }];
  manifest.entries[0].outputSha256 = sha256(document.replace("Original", "Policy"));
  await json(f.root, "upstream/parity-derivations.json", manifest);
  await assert.rejects(readPstackDerivations({ root: f.root }), /named adopted decision/);
  const registry = await load(f.root, "upstream/reference-adoptions.json");
  registry.adoptions[0].kind = "policy"; registry.adoptions[0].derivations = [f.output];
  registry.adoptions[0].outputs.push({ path: f.output, sha256: manifest.entries[0].outputSha256 });
  await put(f.root, f.output, document.replace("Original", "Policy"));
  await json(f.root, "upstream/reference-adoptions.json", registry);
  await readPstackDerivations({ root: f.root }); await readReferenceAdoptions({ root: f.root });
  manifest.entries[0].replacements[0].adoptionId = "unregistered-policy";
  await json(f.root, "upstream/parity-derivations.json", manifest);
  await assert.rejects(readReferenceAdoptions({ root: f.root }), /lacks exact derivation/);
});

test("reference origin, missing objects and snapshot symlinks cannot substitute evidence", async t => {
  const f = await fixture(t);
  git(f.reference, "remote", "set-url", "origin", "https://github.com/other/fork.git");
  await assert.rejects(planReferenceUpdate(f.options), /reference origin/);
  git(f.reference, "remote", "set-url", "origin", "https://github.com/michael-denyer/pstack-claude.git");
  await assert.rejects(planReferenceUpdate({ ...f.options, referenceRevision: "0".repeat(40) }), /Git rev-parse failed/);
  const receipt = await load(f.root, "upstream/ref-receipt.json"), target = join(f.root, receipt.files[0].snapshot);
  await rm(target); await symlink(join(f.root, "evidence.txt"), target);
  await assert.rejects(readReferenceAdoptions({ root: f.root }), /Symlink/);
});

test("a capability can assess a newer reference while retaining its older adopted source", async t => {
  const f = await fixture(t);
  await put(f.reference, "tools/helper.mjs", "new upstream alternative\n");
  const newer = commit(f.reference);
  const oldReceipt = await load(f.root, "upstream/ref-receipt.json"), next = { ...oldReceipt, revision: newer, files: [] };
  for (const old of oldReceipt.files) {
    // Preserve exact Git bytes, including files whose JSON has no trailing newline.
    const exact = spawnSync("git", ["-C", f.reference, "show", `${newer}:${old.path}`]).stdout;
    const snapshot = `upstream/snapshots/pstack-claude/${newer}/${old.path}`;
    await put(f.root, snapshot, exact);
    next.files.push({ ...old, snapshot, sha256: sha256(exact), blobSha1: git(f.reference, "rev-parse", `${newer}:${old.path}`) });
  }
  await json(f.root, "upstream/ref-next.json", next);
  const registry = await load(f.root, "upstream/reference-adoptions.json");
  registry.sources.reference.receipts.push("upstream/ref-next.json");
  registry.sources.reference.assessedRevision = newer;
  await put(f.root, "upstream/sources.yaml", `sources:\n  - id: pstack-claude\n    inspected_commit: ${newer}\n`);
  await json(f.root, "upstream/reference-adoptions.json", registry);
  const options = { ...f.options, referenceRevision: newer };
  assert.equal((await planReferenceUpdate(options)).adoptionImpacts[0].status, "reassess");
  registry.adoptions[0].assessedRevision = newer;
  await json(f.root, "upstream/reference-adoptions.json", registry);
  const plan = await planReferenceUpdate(options);
  assert.equal(plan.status, "unchanged");
  assert.equal(plan.adoptionImpacts[0].referenceRevision, f.referenceRevision);
  assert.deepEqual(plan.adoptionImpacts[0].referenceChanges, ["tools/helper.mjs"]);
  assert.deepEqual(plan.adoptionImpacts[0].unassessedReferenceChanges, []);
});
