import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { derivePstack } from "../tools/derive-pstack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");
const json = async (path) => JSON.parse(await read(path));
const receipt = await json("docs/acceptance/2026-10-16-pstack-sync/source/provenance.json");
const manifest = await json("upstream/parity-derivations.json");

async function paths(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await paths(join(directory, entry.name), path));
    else result.push(path);
  }
  return result.sort();
}

test("the active 0.15.25 snapshot matches every official Git blob and retains all 0.15.23 bytes", async () => {
  assert.equal(receipt.repository, "https://github.com/cursor/plugins");
  assert.equal(receipt.revision, "99743e9c151c8537cbbf1f98bb38f34ef3368453");
  assert.equal(receipt.tree, "3b74ce7f478b3c2d4f6fd9c70a5d39f8664dc862");
  assert.equal(receipt.version, "0.15.25");
  assert.equal(receipt.files.length, 169);
  assert.deepEqual(await paths(join(root, receipt.sourceRoot)), receipt.files.map(file => file.path));
  const previous = await json("docs/acceptance/2026-10-14-pstack-sync/source/provenance.json");
  for (const snapshot of [receipt, previous]) {
    for (const file of snapshot.files) {
      const bytes = await readFile(join(root, snapshot.sourceRoot, file.path));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, file.path);
      assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), file.gitBlob, file.path);
      assert.equal(bytes.length, file.size, file.path);
    }
  }
  for (const path of [".cursor-plugin/plugin.json", "plugin.json"])
    assert.equal((await json(`${receipt.sourceRoot}/${path}`)).version, "0.15.25");
  assert.equal(manifest.revision, receipt.revision);
  assert.equal(manifest.sourceRoot, receipt.sourceRoot);
  assert.equal(receipt.previousRevision, previous.revision);
  const before = new Map(previous.files.map(file => [file.path, file.sha256]));
  const after = new Map(receipt.files.map(file => [file.path, file.sha256]));
  assert.deepEqual(receipt.delta, {
    oldCount: 168, newCount: 169,
    modified: [...before.keys()].filter(path => after.has(path) && after.get(path) !== before.get(path)).sort(),
    added: ["skills/sharpen/SKILL.md"], deleted: [],
  });
  assert.equal(receipt.delta.modified.length, 19);
  assert.equal((await derivePstack({ root, check: true })).entries, 167);
});

test("sharpen preserves the official task execution and outside-check contract on all native targets", async () => {
  const official = await read(`${receipt.sourceRoot}/skills/sharpen/SKILL.md`);
  const body = official.slice(official.indexOf("\n---\n") + 5);
  assert.match(official, /always keep one outside check that the result is right/);
  assert.match(official, /then do the work\. Don't hand back a rewritten prompt/);
  assert.equal((await json("src/core/skills/sharpen/skill.json")).invocation, "explicit");
  assert.ok((await json("src/core/skill-catalog.json")).public.includes("sharpen"));
  assert.ok((await read("src/core/skills/sharpen/SKILL.md")).endsWith(body));
  for (const host of ["codex", "claude-code", "omp", "pi"]) {
    const catalog = await json(`packages/${host}/SKILL_CATALOG.json`);
    const entry = catalog.skills.find(skill => skill.name === "sharpen");
    assert.ok(entry, host);
    assert.equal(entry.audience, "public", host);
    assert.equal(entry.invocation, "explicit", host);
    const text = await read(`packages/${host}/skills/sharpen/SKILL.md`);
    assert.ok(text.endsWith(body), host);
    assert.match(await read(`packages/${host}/skills/poteto-help/${host === "codex" ? "WORKFLOW.md" : "SKILL.md"}`), /\[.*sharpen.*\]\(\.\.\/sharpen\/SKILL\.md\)/);
  }
});

test("official principle rewrites and concise review guidance survive exact derivation", async () => {
  for (const name of ["principle-attack-the-premise", "principle-fix-root-causes", "principle-make-operations-idempotent", "principle-test-behavior-not-implementation", "principle-type-system-discipline", "principle-migrate-callers-then-delete-legacy-apis"]) {
    const source = await read(`${receipt.sourceRoot}/skills/${name}/SKILL.md`);
    const body = source.slice(source.indexOf("\n---\n") + 5);
    assert.ok((await read(`src/core/skills/${name}/SKILL.md`)).endsWith(body), name);
  }
  assert.equal(await read("src/core/skills/interrogate/references/lead-judgment.md"), await read(`${receipt.sourceRoot}/skills/interrogate/references/lead-judgment.md`));
  const ketchup = await read("src/core/skills/ketchup/SKILL.md");
  assert.match(ketchup, /under 150 words, not counting visuals/);
  assert.match(ketchup, /list the action items as plain bullets/);
  assert.match(ketchup, /Never invent a number/);
  for (const name of ["autopilot-full", "autopilot-stack"])
    assert.match(await read(`src/core/skills/${name}/SKILL.md`), /catch the operator up per the \*\*ketchup\*\* skill/);
});
