import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  acceptCandidate,
  applyPlan,
  classifyDeletion,
  isBinaryContent,
  mergeText,
  planSync,
  readSourceRecord,
  transformPortableSkill,
  updateSourceRecord,
} from "../tools/sync-upstream.mjs";

const sourceText = `schema_version: 1
sources:
  - id: cursor-pstack
    repository: https://example.invalid/repo.git
    inspected_commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    candidate_commit: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    baseline_commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    verified_commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
`;

const skillText = `---
name: principle-example
description: "Apply this example."
disable-model-invocation: true
---

# Example

Keep the behavior portable.
`;

test("source records update one pin without rewriting unrelated fields", () => {
  const updated = updateSourceRecord(sourceText, "cursor-pstack", {
    candidate_commit: null,
    baseline_commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  });
  const record = readSourceRecord(updated, "cursor-pstack").fields;
  assert.equal(record.candidate_commit, null);
  assert.equal(record.baseline_commit, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assert.match(updated, /repository: https:\/\/example\.invalid\/repo\.git/);
});

test("portable Skill transform preserves prose and moves invocation policy out of core", () => {
  const transformed = transformPortableSkill(skillText);
  assert.match(transformed, /name: principle-example/);
  assert.match(transformed, /Keep the behavior portable\./);
  assert.doesNotMatch(transformed, /disable-model-invocation/);
});

test("portable Skill transform rejects runtime bindings and binary content", () => {
  assert.throws(
    () => transformPortableSkill(skillText.replace("portable.", "portable in Codex.")),
    /runtime name Codex/,
  );
  assert.equal(isBinaryContent(Buffer.from([65, 0, 66])), true);
  assert.throws(() => transformPortableSkill(Buffer.from([65, 0, 66])), /binary Skill content/);
});

test("three-way merge covers clean updates, local forks, and non-overlapping edits", async () => {
  assert.deepEqual(
    await mergeText({ base: "a\nb\n", local: "a\nb\n", candidate: "a\nB\n" }),
    { status: "clean-update", text: "a\nB\n" },
  );
  assert.deepEqual(
    await mergeText({ base: "a\nb\n", local: "A\nb\n", candidate: "a\nb\n" }),
    { status: "local-fork", text: "A\nb\n" },
  );
  const merged = await mergeText({
    base: "first\nmiddle\nlast\n",
    local: "FIRST\nmiddle\nlast\n",
    candidate: "first\nmiddle\nLAST\n",
  });
  assert.equal(merged.status, "merged");
  assert.equal(merged.text, "FIRST\nmiddle\nLAST\n");
});

test("three-way merge classifies overlapping edits as a typed conflict", async () => {
  const merged = await mergeText({
    base: "same\n",
    local: "local\n",
    candidate: "upstream\n",
    path: "example.md",
  });
  assert.equal(merged.status, "conflict");
  assert.match(merged.text, /<<<<<<< example\.md:local/);
});

test("deletion distinguishes unchanged, missing, modified, and binary local state", () => {
  const base = Buffer.from("unchanged\n");
  assert.deepEqual(classifyDeletion({ base, local: null }), { status: "already-deleted" });
  assert.deepEqual(classifyDeletion({ base, local: Buffer.from("unchanged\n") }), { status: "deleted" });
  assert.deepEqual(classifyDeletion({ base, local: Buffer.from("modified\n") }), {
    status: "conflict",
    type: "delete-modified",
  });
  assert.deepEqual(classifyDeletion({ base, local: Buffer.from([0]) }), {
    status: "conflict",
    type: "binary",
  });
});

test("atomic apply restores earlier writes when a later target escapes the root", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-atomic-"));
  try {
    await writeFile(join(root, "state.txt"), "before\n");
    const plan = {
      conflicts: [],
      writes: new Map([
        ["state.txt", Buffer.from("after\n")],
        ["../escape.txt", Buffer.from("never\n")],
      ]),
      deletes: new Set(),
    };
    await assert.rejects(() => applyPlan(root, plan), /path escapes root/);
    assert.equal(await readFile(join(root, "state.txt"), "utf8"), "before\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("candidate pin advances only after verification succeeds", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-accept-"));
  try {
    await mkdir(join(root, "upstream"), { recursive: true });
    await writeFile(join(root, "upstream/imports.json"), JSON.stringify({ sourceId: "cursor-pstack" }));
    await writeFile(join(root, "upstream/sources.yaml"), sourceText);
    await assert.rejects(
      () => acceptCandidate(root, { checkRunner: async () => { throw new Error("verification failed"); } }),
      /verification failed/,
    );
    assert.equal(await readFile(join(root, "upstream/sources.yaml"), "utf8"), sourceText);

    const accepted = await acceptCandidate(root, { checkRunner: async () => {} });
    assert.equal(accepted, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    const record = readSourceRecord(await readFile(join(root, "upstream/sources.yaml"), "utf8"), "cursor-pstack").fields;
    assert.equal(record.candidate_commit, null);
    assert.equal(record.baseline_commit, accepted);
    assert.equal(record.verified_commit, accepted);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a sync against the accepted commit is a no-op", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-noop-root-"));
  const source = await mkdtemp(join(tmpdir(), "oh-my-stack-noop-source-"));
  try {
    await mkdir(join(root, "upstream"), { recursive: true });
    await mkdir(join(source, "pstack/skills/principle-example"), { recursive: true });
    await writeFile(join(source, "pstack/LICENSE"), "MIT\n");
    await writeFile(join(source, "pstack/skills/principle-example/SKILL.md"), skillText);
    for (const args of [
      ["init", "-q"],
      ["config", "user.email", "test@example.invalid"],
      ["config", "user.name", "Test"],
      ["add", "."],
      ["commit", "-qm", "fixture"],
    ]) {
      const result = spawnSync("git", ["-C", source, ...args], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const commit = spawnSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
    await writeFile(join(root, "upstream/imports.json"), JSON.stringify({
      schemaVersion: 1,
      sourceId: "cursor-pstack",
      sourceRoot: "pstack",
      licensePath: "LICENSE",
      entries: [{
        upstreamPath: "skills/principle-example/SKILL.md",
        target: "src/core/skills/principle-example/SKILL.md",
        transform: "portable-explicit-skill",
      }],
    }));
    await writeFile(
      join(root, "upstream/sources.yaml"),
      sourceText
        .replaceAll("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", commit)
        .replace("    candidate_commit: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "    candidate_commit: null"),
    );
    const snapshotRoot = join(root, "upstream/snapshots/cursor-pstack", commit, "pstack");
    const skillRoot = join(root, "src/core/skills/principle-example");
    await mkdir(join(snapshotRoot, "skills/principle-example"), { recursive: true });
    await mkdir(skillRoot, { recursive: true });
    await writeFile(join(snapshotRoot, "LICENSE"), "MIT\n");
    await writeFile(join(snapshotRoot, "skills/principle-example/SKILL.md"), skillText);
    await writeFile(join(skillRoot, "SKILL.md"), transformPortableSkill(skillText));
    await writeFile(join(skillRoot, "skill.json"), `${JSON.stringify({
      $schema: "../../../schemas/skill.schema.json",
      schemaVersion: 1,
      name: "principle-example",
      invocation: "explicit",
      deliveryTarget: "D3",
      workflowTarget: "W1",
      requires: [],
      fallbacks: {},
    }, null, 2)}\n`);
    const plan = await planSync({ root, sourceCheckout: source });
    assert.equal(plan.writes.size, 0);
    assert.equal(plan.deletes.size, 0);
    assert.deepEqual(plan.conflicts, []);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(source, { recursive: true, force: true });
  }
});

test("an accepted commit can extend its pinned import set", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-extend-root-"));
  const source = await mkdtemp(join(tmpdir(), "oh-my-stack-extend-source-"));
  try {
    const secondSkill = skillText
      .replaceAll("principle-example", "tdd")
      .replace("Apply this example.", "Develop with tests first.");
    await mkdir(join(root, "upstream"), { recursive: true });
    await mkdir(join(source, "pstack/skills/principle-example"), { recursive: true });
    await mkdir(join(source, "pstack/skills/tdd"), { recursive: true });
    await writeFile(join(source, "pstack/LICENSE"), "MIT\n");
    await writeFile(join(source, "pstack/skills/principle-example/SKILL.md"), skillText);
    await writeFile(join(source, "pstack/skills/tdd/SKILL.md"), secondSkill);
    for (const args of [
      ["init", "-q"],
      ["config", "user.email", "test@example.invalid"],
      ["config", "user.name", "Test"],
      ["add", "."],
      ["commit", "-qm", "fixture"],
    ]) {
      const result = spawnSync("git", ["-C", source, ...args], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const commit = spawnSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
    const entries = [
      {
        upstreamPath: "skills/principle-example/SKILL.md",
        target: "src/core/skills/principle-example/SKILL.md",
        transform: "portable-explicit-skill",
      },
      {
        upstreamPath: "skills/tdd/SKILL.md",
        target: "src/core/skills/tdd/SKILL.md",
        transform: "portable-explicit-skill",
      },
    ];
    await writeFile(join(root, "upstream/imports.json"), JSON.stringify({
      schemaVersion: 1,
      sourceId: "cursor-pstack",
      sourceRoot: "pstack",
      licensePath: "LICENSE",
      entries,
    }));
    await writeFile(
      join(root, "upstream/sources.yaml"),
      sourceText
        .replaceAll("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", commit)
        .replace("    candidate_commit: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "    candidate_commit: null"),
    );
    const snapshotRoot = join(root, "upstream/snapshots/cursor-pstack", commit, "pstack");
    const existingSkillRoot = join(root, "src/core/skills/principle-example");
    await mkdir(join(snapshotRoot, "skills/principle-example"), { recursive: true });
    await mkdir(existingSkillRoot, { recursive: true });
    await writeFile(join(snapshotRoot, "LICENSE"), "MIT\n");
    await writeFile(join(snapshotRoot, "skills/principle-example/SKILL.md"), skillText);
    await writeFile(join(existingSkillRoot, "SKILL.md"), transformPortableSkill(skillText));
    await writeFile(join(existingSkillRoot, "skill.json"), `${JSON.stringify({
      $schema: "../../../schemas/skill.schema.json",
      schemaVersion: 1,
      name: "principle-example",
      invocation: "explicit",
      deliveryTarget: "D3",
      workflowTarget: "W1",
      requires: [],
      fallbacks: {},
    }, null, 2)}\n`);

    const plan = await planSync({ root, sourceCheckout: source });
    assert.deepEqual(plan.conflicts, []);
    assert(!plan.writes.has("src/core/skills/principle-example/SKILL.md"));
    assert(plan.writes.has("src/core/skills/tdd/SKILL.md"));
    assert(plan.writes.has("src/core/skills/tdd/skill.json"));
    assert(plan.writes.has(`upstream/snapshots/cursor-pstack/${commit}/pstack/skills/tdd/SKILL.md`));
    assert(
      [...plan.writes.keys()].some((path) => path.startsWith(`upstream/patches/cursor-pstack/${commit}-extend-`)),
    );
    assert.equal(plan.outcomes.find((outcome) => outcome.path.endsWith("/tdd/SKILL.md")).status, "imported");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(source, { recursive: true, force: true });
  }
});

test("sync planning rejects paths that escape configured roots", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-path-root-"));
  try {
    await mkdir(join(root, "upstream"), { recursive: true });
    await writeFile(join(root, "upstream/imports.json"), JSON.stringify({
      schemaVersion: 1,
      sourceId: "cursor-pstack",
      sourceRoot: "pstack",
      licensePath: "LICENSE",
      entries: [{
        upstreamPath: "../escape.md",
        target: "src/core/skills/principle-example/SKILL.md",
        transform: "portable-explicit-skill",
      }],
    }));
    await assert.rejects(() => planSync({ root, sourceCheckout: root }), /unsafe path/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
