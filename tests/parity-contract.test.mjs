import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import { derivePstack } from "../tools/derive-pstack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "upstream/parity-derivations.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const read = (path) => readFile(join(root, path), "utf8");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function paths(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await paths(join(directory, entry.name), path));
    else result.push(path);
  }
  return result.sort();
}

async function fixture(t, sourceName = "skills/no-comments/SKILL.md") {
  const temporary = await mkdtemp(join(tmpdir(), "oms-parity-contract-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const entry = structuredClone(manifest.entries.find((value) => value.source === sourceName));
  assert.ok(entry);
  const document = { ...structuredClone(manifest), entries: [entry] };
  const sourcePath = join(temporary, manifest.sourceRoot, entry.source);
  const outputPath = join(temporary, entry.output);
  await mkdir(dirname(sourcePath), { recursive: true });
  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(join(temporary, "upstream"), { recursive: true });
  await cp(join(root, manifest.sourceRoot, entry.source), sourcePath);
  await cp(join(root, entry.output), outputPath);
  const save = () => writeFile(join(temporary, "upstream/parity-derivations.json"), `${JSON.stringify(document)}\n`);
  await save();
  return { root: temporary, document, entry, sourcePath, outputPath, save };
}

test("complete pinned runtime bodies, references, helpers, and promoted playbooks derive exactly", async () => {
  assert.equal(manifest.revision, "99743e9c151c8537cbbf1f98bb38f34ef3368453");
  assert.equal(manifest.sourceRoot, `upstream/snapshots/cursor-pstack-october-16/${manifest.revision}/pstack`);
  const sourceRoot = join(root, manifest.sourceRoot);
  const sources = await paths(sourceRoot);
  const runtimeSources = sources.filter((path) => path.startsWith("skills/") || path.startsWith("agents/") || path.startsWith("automations/benny/skills/") || path.startsWith("automations/benny/templates/"));
  const recorded = [...new Set(manifest.entries.map((entry) => entry.source))].sort();
  assert.deepEqual(recorded, runtimeSources);
  const playbooks = sources.filter((path) => path.startsWith("skills/poteto-mode/playbooks/") && path.endsWith(".md"));
  assert.equal(playbooks.length, 23);
  for (const source of playbooks) {
    const entries = manifest.entries.filter((entry) => entry.source === source);
    const name = source.split("/").at(-1).replace(/\.md$/, "");
    assert.deepEqual(entries.map((entry) => entry.output).sort(), [`src/core/${source}`, `src/core/skills/${name}/SKILL.md`].sort());
  }
  const result = await derivePstack({ root, check: true });
  assert.equal(result.entries, manifest.entries.length);
  assert.equal(result.checked, true);
});

test("mode retains combined triggers, complete principle index, and large-task precedence", async () => {
  const mode = await read("src/core/skills/poteto-mode/SKILL.md");
  for (const text of ["Nontrivial change, architecture decision", "the **how** skill", "Code crossing a function boundary", "the **architect** skill", "the **unslop** skill", "Before review", "the **no-comments** skill", "Read the leaf skill in full", "even when a narrower playbook like Feature fits", "routes to the **figure-it-out** skill", "defaults to a fresh", "Code delegates tier by difficulty"] ) {
    if (text === "defaults to a fresh") assert.match(mode, /\*\*Fresh subagents by default\.\*\*/);
    else assert.ok(mode.includes(text), `missing upstream mode contract: ${text}`);
  }
  const index = mode.slice(mode.indexOf("## Principles"), mode.indexOf("## Autonomy"));
  assert.equal((index.match(/^- \*\*/gm) ?? []).length, 24);
  assert.match(mode, /Continue already authorized implementation through its checks/);
  assert.doesNotMatch(mode, /Select one primary workflow|Do not combine workflows|Automatically\s+routed narrow work/);
});

test("How and Interrogate preserve upstream stage ownership without extra acceptance phases", async () => {
  const how = await read("src/core/skills/how/SKILL.md");
  assert.deepEqual([...how.matchAll(/^## \d\. (.*)$/gm)].map((match) => match[1]), ["Assess complexity", "Explore (complex only)", "Synthesize (complex only)", "Present"]);
  assert.match(how, /no explorers\. Spawn one explainer/);
  assert.match(how, /Present the explainer's output/);
  assert.doesNotMatch(how, /root.*(?:recheck|re-review)|machine acceptance|frozen evidence contract/i);
  const interrogate = await read("src/core/skills/interrogate/SKILL.md");
  assert.deepEqual([...interrogate.matchAll(/^## Step \d, (.*)$/gm)].map((match) => match[1]), ["Scope", "Intent", "Spawn Reviewers", "Synthesize", "Lead Judgment"]);
  assert.match(interrogate, /As results come back, build a unified picture/);
  assert.match(interrogate, /You are the lead reviewer/);
  assert.doesNotMatch(interrogate, /spawn (?:one |an? )?(?:independent )?synthesizer/i);
  assert.equal((interrogate.match(/^\| Reviewer [AB] \|/gm) ?? []).length, 2);
});

test("review and comment rules preserve presumptive blockers and delete unenforced constraints", async () => {
  const quality = await read("src/core/skills/interrogate/references/code-quality-review.md");
  assert.match(quality, /Treat these as presumptive blockers/);
  assert.match(quality, /Pushes a file from below 1000 lines to above 1000 lines/);
  assert.match(quality, /a code-judo move would delete it/);
  const comments = await read("src/core/skills/no-comments/SKILL.md");
  assert.match(comments, /Otherwise delete, report the constraint open/);
  assert.match(comments, /Reject a second, report it open, and fail/);
  assert.match(comments, /Reject application-code edits/);
  const sicko = await read("src/core/roles/comment-sicko/instructions.md");
  assert.match(sicko, /Yes\.\.\. Ha ha ha\.\.\. Yes!/);
  assert.match(sicko, /I never write application code/);
  assert.match(sicko, /When I am not sure a keep clause applies, the comment dies/);
  assert.equal(JSON.parse(await read("src/core/roles/comment-sicko/role.json")).writes, true);
});

test("default source workflows do not acquire the optional OMS machine-evidence contract", async () => {
  for (const entry of manifest.entries.filter((entry) => entry.output.endsWith(".md"))) {
    const text = await read(entry.output);
    assert.doesNotMatch(text, /delivery-evidence\.mjs|delivery-evidence\.md|subagent-handoff\.md|delivery-plan\.json|oms-enhanced-delivery/, entry.output);
  }
  const enhanced = await read("src/core/skills/oms-enhanced-delivery/SKILL.md");
  assert.match(enhanced, /references\/poteto-mode\/delivery-evidence\.md/);
  assert.match(enhanced, /Use this entry only when the user selects enhanced delivery/);
  const setup = await read("src/core/skills/setup-oh-my-stack/SKILL.md");
  assert.deepEqual([...setup.matchAll(/^### \d\. (.*)$/gm)].map((match) => match[1]), ["Detect available models", "Load current state", "Budget, map, and confirm", "Validate", "Write the host configuration", "Confirm", "Offer a verification skill (optional)"]);
  assert.doesNotMatch(setup, /Choose automatic routing|Enable automatic routing/);
  assert.match(await read("src/core/skills/oms-auto/references/routing-setup.md"), /Enable automatic routing/);
  assert.match(await read("src/core/roles/synthesizer/instructions.md"), /spot-check citations through available evidence/);
});

test("an output mutation that weakens no-comments fails exact check and is not silently repaired", async (t) => {
  const f = await fixture(t);
  await derivePstack({ root: f.root, check: true });
  const original = await readFile(f.outputPath, "utf8");
  const changed = original.replace("Otherwise delete, report the constraint open", "Otherwise keep the useful comment, report the constraint open");
  assert.notEqual(changed, original);
  await writeFile(f.outputPath, changed);
  await assert.rejects(derivePstack({ root: f.root, check: true }), /parity derivation drift/);
  assert.equal(await readFile(f.outputPath, "utf8"), changed);
  await derivePstack({ root: f.root });
  assert.equal(await readFile(f.outputPath, "utf8"), original);
});

test("even a one-byte source mutation fails the pinned source check", async (t) => {
  const f = await fixture(t);
  await writeFile(f.sourcePath, `${await readFile(f.sourcePath, "utf8")} `);
  await assert.rejects(derivePstack({ root: f.root, check: true }), /pinned source hash mismatch/);
});

test("changed occurrence counts and weakened replacement output fail before writes", async (t) => {
  const f = await fixture(t);
  const original = await readFile(f.outputPath);
  f.entry.replacements[0].expectedOccurrences += 1;
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /expected \d+ occurrences, observed/);
  assert.deepEqual(await readFile(f.outputPath), original);
  f.entry.replacements[0].expectedOccurrences -= 1;
  f.entry.replacements[0].after += "\nKeep convenient internal constraint comments.\n";
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /derived output hash mismatch/);
  assert.deepEqual(await readFile(f.outputPath), original);
});

test("manifest cannot substitute regex, undeclared policy, external paths, or out-of-scope writes", async (t) => {
  const f = await fixture(t);
  f.entry.replacements[0].pattern = ".*";
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /unsupported key pattern/);
  delete f.entry.replacements[0].pattern;
  f.document.extensions = ["extras"];
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /unsupported key extensions/);
  delete f.document.extensions;
  f.entry.output = "../escape.md";
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /traversal is forbidden/);
  f.entry.output = "packages/host/skills/example/SKILL.md";
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /outside semantic ownership/);
  f.entry.output = "src/core/skills/example/SKILL.md";
  f.entry.source = "../other/SKILL.md";
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /traversal is forbidden/);
});

test("derivation checks byte identity rather than whitespace or token equivalence", async (t) => {
  const f = await fixture(t);
  const original = await readFile(f.outputPath, "utf8");
  await writeFile(f.outputPath, original.replace(/\n/g, "\r\n"));
  assert.notEqual(hash(await readFile(f.outputPath)), f.entry.outputSha256);
  await assert.rejects(derivePstack({ root: f.root, check: true }), /parity derivation drift/);
});

test("source and output directory symlinks or junctions cannot escape their boundaries", async (t) => {
  const f = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), "oms-parity-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await cp(f.sourcePath, join(outside, "SKILL.md"));
  const sourceLink = join(f.root, manifest.sourceRoot, "linked-source");
  try {
    await symlink(outside, sourceLink, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
    t.skip(`native symlink/junction creation unavailable: ${error.code}`);
    return;
  }
  const originalSource = f.entry.source;
  f.entry.source = "linked-source/SKILL.md";
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /source: symlink or junction escapes boundary/);
  f.entry.source = originalSource;
  const outputLink = join(f.root, "src/core/skills/linked-output");
  await symlink(outside, outputLink, process.platform === "win32" ? "junction" : "dir");
  f.entry.output = "src/core/skills/linked-output/new-output.md";
  await f.save();
  await assert.rejects(derivePstack({ root: f.root }), /output: symlink or junction escapes boundary/);
  assert.deepEqual((await readdir(outside)).sort(), ["SKILL.md"]);
});
