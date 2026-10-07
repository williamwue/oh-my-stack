import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { filesUnder } from "../tools/generate.mjs";
import {
  validateExecutableInventory,
  validateLocalMarkdownLinks,
  validateRuntimeEvidence,
  validateSemanticDerivations,
  validateUpstreamState,
} from "../tools/validate.mjs";

test("literal fenced glossary examples do not require files, but real links still do", async () => fixture(async (root) => {
  await put(root, "README.md", "# Guide\n\n````md\n[Ordering](./src/ordering/GLOSSARY.md)\n```\n[Billing](./src/billing/GLOSSARY.md)\n````\n\n~~~md\n[Example](./missing.md)\n~~~\n");
  await validateLocalMarkdownLinks(root);
  await put(root, "README.md", "# Guide\n\n```md\n[Example](./missing.md)\n```\n\n[Real resource](./missing.md)\n");
  await assert.rejects(validateLocalMarkdownLinks(root), /missing local link/);
  await put(root, "missing.md", "# Resource\n");
  await validateLocalMarkdownLinks(root);
  await put(root, "README.md", "# Guide\n\n[Outside](../outside.md)\n");
  await assert.rejects(validateLocalMarkdownLinks(root), /link escapes repository/);
}));

async function fixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-validator-"));
  try { await callback(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

async function put(root, path, value) {
  const target = join(root, path);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value));
}

function evidence(profile = "alpha", relatedEvidence = []) {
  return {
    schemaVersion: 1, result: "pass", profile, capabilities: ["feature"],
    claims: {
      deliveryTarget: "D0", deliveryAchieved: "D0", workflowAchieved: "W0",
      observedDeliveryChecks: [],
    },
    assertions: [{ status: "pass" }], relatedEvidence,
  };
}

test("slash-form related and profile evidence resolve to native files", async () => fixture(async (root) => {
  const first = "evals/evidence/alpha/first.json";
  const second = "evals/evidence/alpha/second.json";
  await put(root, first, evidence("alpha", [second]));
  await put(root, second, evidence());
  const model = {
    registry: new Set(["feature"]),
    profiles: new Map([["alpha", {
      id: "alpha", capabilities: { feature: { evidence: first, status: "native" } },
    }]]),
  };
  await validateRuntimeEvidence(root, model);
  await put(root, first, evidence("alpha", ["evals/evidence/alpha/missing.json"]));
  await assert.rejects(validateRuntimeEvidence(root, model), /missing related evidence/);
  await put(root, first, evidence());
  await put(root, second, evidence("other"));
  model.profiles.set("other", { id: "other", capabilities: {} });
  model.profiles.get("alpha").capabilities.feature.evidence = second;
  await assert.rejects(validateRuntimeEvidence(root, model), /evidence belongs to other/);
}));

test("evidence references reject malformed, sibling, and absolute paths", async () => fixture(async (root) => {
  const first = "evals/evidence/alpha/first.json";
  await put(root, first, evidence());
  const model = {
    registry: new Set(["feature"]),
    profiles: new Map([["alpha", {
      id: "alpha", capabilities: { feature: { evidence: first, status: "native" } },
    }]]),
  };
  for (const reference of ["../sibling.json", "evals/evidence-old/other.json", "C:relative.json",
    "C:/absolute.json", "evals/evidence/a//b.json", "evals/evidence/a/../b.json",
    "evals/evidence/a\\b.json", "evals/evidence/a.json:stream", "/absolute.json", ""]) {
    model.profiles.get("alpha").capabilities.feature.evidence = reference;
    await assert.rejects(validateRuntimeEvidence(root, model), /invalid path|unsafe path|outside evals\/evidence/,
      `accepted ${JSON.stringify(reference)}`);
  }
  model.profiles.get("alpha").capabilities.feature.evidence = first;
  await put(root, first, evidence("alpha", ["evals/evidence-old/other.json"]));
  await assert.rejects(validateRuntimeEvidence(root, model), /related evidence is outside evals\/evidence/);
}));

test("semantic derivations use native scope checks and raw-byte hashes", async () => fixture(async (root) => {
  const source = "upstream/snapshots/source/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/core/source.md";
  const output = "src/core/skills/derived/SKILL.md";
  const bytes = Buffer.from("source\r\n", "utf8");
  await put(root, "upstream/sources.yaml", "sources:\n  - id: source\n    baseline_commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n    verified_commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");
  await put(root, source, bytes);
  await put(root, output, "output\n");
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  const entry = {
    id: "derivation", sourceId: "source", sourceRevision: "a".repeat(40), transformation: "copy",
    sourceFiles: [{ path: source, sha256: digest(bytes) }],
    outputFiles: [{ path: output, sha256: digest("output\n"), owner: "derived" }],
  };
  const save = () => put(root, "upstream/semantic-derivations.json", { schemaVersion: 1, entries: [entry] });
  await save();
  await validateSemanticDerivations(root);
  await put(root, source, "source\n");
  await assert.rejects(validateSemanticDerivations(root), /hash drift/);
  await put(root, source, bytes);
  entry.outputFiles[0].path = "src/core-old/skills/derived/SKILL.md";
  await save();
  await assert.rejects(validateSemanticDerivations(root), /derived output must be under src\/core/);
  entry.outputFiles[0].path = "src/core/skills/derived/SKILL.md:stream";
  await save();
  await assert.rejects(validateSemanticDerivations(root), /unsafe path/);
}));

test("unlisted tool and skill scripts reject while dependency directories are pruned", async () => fixture(async (root) => {
  await put(root, "security/executables.json", { schemaVersion: 1, entries: [] });
  await put(root, "tools/new.mjs", "// executable\n");
  await assert.rejects(validateExecutableInventory(root), /tools.*new\.mjs: executable is missing/);
  await rm(join(root, "tools", "new.mjs"));
  await put(root, "src/core/skills/example/scripts/run.sh", "#!/bin/sh\n");
  await assert.rejects(validateExecutableInventory(root), /run\.sh: executable is missing/);
  await rm(join(root, "src", "core", "skills", "example", "scripts", "run.sh"));
  await put(root, "tools/node_modules/dependency.mjs", "// ignored dependency\n");
  await validateExecutableInventory(root);
  const all = await filesUnder(join(root, "tools"));
  const pruned = await filesUnder(join(root, "tools"), {
    excludeDirectory: (directory) => directory === join(root, "tools", "node_modules"),
  });
  assert.equal(all.length, 1);
  assert.equal(pruned.length, 0);
}));

test("upstream import source and target fields reject escapes before file reads", async () => fixture(async (root) => {
  await put(root, "upstream/sources.yaml", "sources:\n  - id: source\n    baseline_commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n    verified_commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");
  const config = {
    schemaVersion: 1, sourceId: "source", sourceRoot: "../other", licensePath: "LICENSE",
    entries: [{ target: "src/core/skills/example/SKILL.md", upstreamPath: "skills/example/SKILL.md" }],
  };
  await put(root, "upstream/imports.json", config);
  await assert.rejects(validateUpstreamState(root), /unsafe path/);
  config.sourceRoot = "core";
  config.entries[0].target = "src/core-old/skills/example/SKILL.md";
  await put(root, "upstream/imports.json", config);
  await assert.rejects(validateUpstreamState(root), /outside src\/core/);
  config.entries[0].target = "src/core/skills/example/SKILL.md";
  config.entries[0].upstreamPath = "skills/example/SKILL.md:stream";
  await put(root, "upstream/imports.json", config);
  await assert.rejects(validateUpstreamState(root), /unsafe path/);
}));
