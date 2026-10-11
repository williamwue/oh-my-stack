import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadModel, repoRoot } from "../tools/generate.mjs";

const fixture = join(repoRoot, "evals", "fixtures", "pstack-01513");
const run = (file, ...args) => spawnSync(process.execPath, [join(fixture, file), ...args], { encoding: "utf8" });
const movedTargets = {
  "src/core/skills/poteto-mode/references/subagent-handoff.md": "src/core/skills/oms-enhanced-delivery/references/poteto-mode/subagent-handoff.md",
  "src/core/skills/architect/references/design-contract.md": "src/core/skills/oms-enhanced-delivery/references/architect/design-contract.md",
};
const hosts = ["codex", "omp", "claude-code", "pi"];

async function generatedWorkflow(host, name) {
  const directory = join(repoRoot, "packages", host, "skills", name);
  const entry = await readFile(join(directory, "SKILL.md"), "utf8");
  return entry.includes("[complete workflow](WORKFLOW.md)")
    ? readFile(join(directory, "WORKFLOW.md"), "utf8") : entry;
}

test("pstack delta decisions cover exact source blobs and existing target paths", async () => {
  const receipt = JSON.parse(await readFile(join(repoRoot, "docs/acceptance/2026-10-06/upstream-files.json"), "utf8"));
  const decisions = JSON.parse(await readFile(join(repoRoot, "docs/acceptance/2026-10-06/upstream-decisions.json"), "utf8"));
  assert.equal(decisions.fileCount, 33);
  assert.equal(new Set(decisions.decisions.map((item) => item.upstreamPath)).size, 33);
  for (const item of receipt.files) {
    const bytes = await readFile(join(repoRoot, "upstream", "snapshots", receipt.sourceId, item.revision, item.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
    assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), item.gitBlob);
  }
  for (const item of decisions.decisions) {
    assert.ok(receipt.files.some((file) => file.revision === receipt.head && file.path === item.upstreamPath));
    assert.ok(item.rationale.length > 20);
    for (const path of item.targets) await readFile(join(repoRoot, movedTargets[path] ?? path));
  }
});

test("all host catalogs expose explicit upstream entries without selecting enhanced handoff resources", async () => {
  const model = await loadModel();
  assert.ok(!model.skills.some((item) => item.metadata.name === "oms-enhanced-delivery"));
  const enhanced = await loadModel(repoRoot, { extensions: ["enhanced-delivery"] });
  assert.equal(enhanced.skills.find((item) => item.metadata.name === "oms-enhanced-delivery").metadata.invocation, "explicit");
  for (const host of hosts) {
    const root = join(repoRoot, "packages", host);
    const catalog = JSON.parse(await readFile(join(root, "SKILL_CATALOG.json"), "utf8"));
    for (const name of ["correct", "poteto-help", "benchmark-checklist", "principle-explain-the-number"]) {
      assert.ok(catalog.skills.some((item) => item.name === name));
      assert.equal(model.skills.find((item) => item.metadata.name === name).metadata.invocation, "explicit");
      const text = await readFile(join(root, "skills", name, "SKILL.md"), "utf8");
      if (host !== "codex") assert.match(text, /disable-model-invocation: true/);
    }
    const help = await generatedWorkflow(host, "poteto-help");
    assert.match(help, /references\/prompting.md/);
    await readFile(join(root, "skills/poteto-help/references/prompting.md"));
    assert.ok(!catalog.skills.some((item) => item.name === "oms-enhanced-delivery"));
    assert.ok(!catalog.resources.some((item) => item.distribution === "enhanced-delivery"));
    const swarm = await generatedWorkflow(host, "swarm");
    assert.doesNotMatch(swarm, /Child session handoff|subagent-handoff.md/);
    await readFile(join(root, "docs/runtime-binding.md"));
    await readFile(join(root, "docs/model-selection.md"));
  }
});

test("fresh delegation is upstream policy while enhanced fencing remains optional", async () => {
  const handoff = await readFile(join(repoRoot, movedTargets["src/core/skills/poteto-mode/references/subagent-handoff.md"]), "utf8");
  assert.match(handoff, /fresh session for a new task, fix round, follow-up, retry, or queue item/);
  assert.match(handoff, /Host restrictions still win/);
  assert.match(handoff, /stop and fence it or use distinct ownership/);
  assert.match(handoff, /late result from the old generation cannot write or become current evidence/);
  assert.match(handoff, /does not authorize discarding uncommitted work/);
  for (const host of hosts) {
    const mode = await generatedWorkflow(host, "poteto-mode");
    assert.match(mode, /Fresh subagents by default/);
    assert.match(mode, /original brief, every later directive, and the prior agent's report and branch/);
    assert.match(mode, /only when the new work strictly needs state that lives in that agent and is costly to move/);
    for (const name of ["perf-issue", "hillclimb"]) {
      const text = await generatedWorkflow(host, name);
      assert.match(text, /\[runtime binding\]\(\.\.\/\.\.\/docs\/runtime-binding.md\)/);
      assert.match(text, new RegExp(`configured ${name} model`));
      if (host === "codex" || host === "omp") {
        assert.ok(text.includes(`For this workflow's implementers use \`code.${name}\``));
      }
      assert.doesNotMatch(text, /Child session handoff|subagent-handoff.md|delivery-evidence.md/);
    }
  }
});

test("generated Codex PR procedures prefer host tools while retaining bounded adapter authority gates", async () => {
  for (const name of ["opening-a-pr", "babysit", "shipping"]) {
    const text = await generatedWorkflow("codex", name);
    assert.match(text, /host-owned PR tool, use that\ntool first/);
    assert.match(text, /executeGitHubWorkflow\(request\)` only as the bounded fallback/);
    assert.match(text, /does not expand the workflow's authorization or target gates/);
    assert.match(text, /exact target and account/);
    assert.match(text, /Select no provider by inference/);
  }
});

test("correction verifier rejects the authentic historical alias bug and accepts the actual fixed installer", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-correct-regression-"));
  try {
    const setup = run("setup-correct.mjs", root);
    assert.equal(setup.status, 0, setup.stderr);
    const before = run("verify-correct.mjs", root);
    assert.notEqual(before.status, 0);
    assert.match(before.stderr, /silently skipped the CLI/);
    await cp(join(repoRoot, "tools/install-release.mjs"), join(root, "tools/install-release.mjs"));
    const after = run("verify-correct.mjs", root);
    assert.equal(after.status, 0, after.stderr);
    assert.deepEqual(JSON.parse(after.stdout), {
      outcomes: [{ alias: "file", inspect: "pass", malformed: "rejected" },
        { alias: "directory", inspect: "pass", malformed: "rejected" }], importExecutedCli: false,
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("measurement verifier refuses false winners, incomplete coverage, and stale receipt claims", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-measurement-report-"));
  try {
    const receipts = join(fixture, "measurements.json");
    const bytes = await readFile(receipts);
    const report = { receiptSha256: createHash("sha256").update(bytes).digest("hex"),
      cases: JSON.parse(bytes).cases.map(({ id }) => ({ id, verdict: "inconclusive", reason: "Evidence does not establish equivalent successful work." })) };
    const path = join(root, "report.json");
    await writeFile(path, JSON.stringify(report));
    assert.equal(run("verify-measurements.mjs", receipts, path).status, 0);
    report.cases[0].verdict = "faster";
    await writeFile(path, JSON.stringify(report));
    assert.match(run("verify-measurements.mjs", receipts, path).stderr, /false performance verdict/);
    report.cases[0].verdict = "inconclusive";
    report.cases.pop();
    await writeFile(path, JSON.stringify(report));
    assert.match(run("verify-measurements.mjs", receipts, path).stderr, /case coverage drift/);
    report.receiptSha256 = "0".repeat(64);
    await writeFile(path, JSON.stringify(report));
    assert.match(run("verify-measurements.mjs", receipts, path).stderr, /not bound to the receipts/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
