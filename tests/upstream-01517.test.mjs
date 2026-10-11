import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { loadModel, repoRoot } from "../tools/generate.mjs";

const read = (path) => readFile(join(repoRoot, path), "utf8");
const json = async (path) => JSON.parse(await read(path));
const movedTargets = {
  "src/core/skills/architect/references/design-contract.md": "src/core/skills/oms-enhanced-delivery/references/architect/design-contract.md",
  "src/core/skills/technical-writing/references/document-structure.md": "src/core/skills/oms-enhanced-delivery/references/technical-writing/document-structure.md",
  "src/core/skills/technical-writing/references/sentence-style.md": "src/core/skills/oms-enhanced-delivery/references/technical-writing/sentence-style.md",
  "src/core/skills/why/references/evidence.md": "src/core/skills/oms-enhanced-delivery/references/why/evidence.md",
  "src/core/skills/why/references/sources.md": "src/core/skills/oms-enhanced-delivery/references/why/sources.md",
};

test("0.15.17 decisions account for all 45 exact source blobs", async () => {
  const receipt = await json("docs/acceptance/2026-10-11/upstream-files.json");
  const decisions = await json("docs/acceptance/2026-10-11/upstream-decisions.json");
  const comparison = await json("docs/acceptance/2026-10-11/upstream-compare.json");
  assert.equal(receipt.head, "978ca6e9c0e012047cd5058b8e829240336e704e");
  assert.equal(decisions.fileCount, 45);
  assert.equal(new Set(decisions.decisions.map((item) => item.upstreamPath)).size, 45);
  assert.deepEqual(decisions.decisions.map((item) => item.upstreamPath).sort(),
    comparison.files.map((item) => item.filename).sort());
  assert.equal(receipt.files.length, 46);
  for (const item of receipt.files) {
    const bytes = await readFile(join(repoRoot, "upstream/snapshots", receipt.sourceId, item.revision, item.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
    assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), item.gitBlob);
  }
  for (const item of decisions.decisions) {
    const source = receipt.files.find((file) => file.path === item.upstreamPath);
    assert.ok(source);
    assert.equal(source.gitBlob, comparison.files.find((file) => file.filename === item.upstreamPath).sha);
    assert.ok(["adapt", "retain", "reference"].includes(item.decision));
    assert.ok(item.rationale.length > 30);
    assert.ok(item.targets.length > 0);
    for (const path of item.targets) await read(movedTargets[path] ?? path);
  }
});

test("ketchup is an explicit public skill on all four generated hosts", async () => {
  const model = await loadModel();
  const skill = model.skills.find((item) => item.metadata.name === "ketchup");
  assert.ok(skill);
  assert.equal(skill.metadata.invocation, "explicit");
  const core = await read("src/core/skills/ketchup/SKILL.md");
  for (const host of ["codex", "omp", "claude-code", "pi"]) {
    const root = `packages/${host}`;
    const catalog = await json(`${root}/SKILL_CATALOG.json`);
    assert.ok(catalog.skills.some((item) => item.name === "ketchup"));
    const rendered = await read(`${root}/skills/ketchup/SKILL.md`);
    if (host === "codex") {
      assert.match(await read(`${root}/skills/ketchup/agents/openai.yaml`), /allow_implicit_invocation: false/);
    } else assert.match(rendered, /disable-model-invocation: true/);
    // Every portable relative Markdown reference must survive generation.
    for (const match of core.matchAll(/\]\((\.\.?\/[^)]+)\)/g)) {
      await readFile(join(repoRoot, root, "skills/ketchup", match[1]));
    }
  }
});

test("the complete pinned parity source remains independently verifiable", async () => {
  const receipt = await json("docs/acceptance/2026-10-11-parity/upstream-files.json");
  assert.equal(receipt.revision, "978ca6e9c0e012047cd5058b8e829240336e704e");
  assert.equal(receipt.files.length, 165);
  assert.equal(new Set(receipt.files.map((file) => file.upstreamPath)).size, 165);
  for (const file of receipt.files) {
    const bytes = await readFile(join(repoRoot, file.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
    assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), file.blobSha1);
  }
});
