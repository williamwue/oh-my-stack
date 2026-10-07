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
    for (const path of item.targets) await readFile(join(repoRoot, path));
  }
});

test("all host catalogs expose the four new explicit entries with readable help and handoff resources", async () => {
  const model = await loadModel();
  for (const host of ["codex", "omp", "claude-code"]) {
    const root = join(repoRoot, "packages", host);
    const catalog = JSON.parse(await readFile(join(root, "SKILL_CATALOG.json"), "utf8"));
    for (const name of ["correct", "poteto-help", "benchmark-checklist", "principle-explain-the-number"]) {
      assert.ok(catalog.skills.some((item) => item.name === name));
      assert.equal(model.skills.find((item) => item.metadata.name === name).metadata.invocation, "explicit");
      const text = await readFile(join(root, "skills", name, "SKILL.md"), "utf8");
      if (host !== "codex") assert.match(text, /disable-model-invocation: true/);
    }
    const help = await readFile(join(root, "skills/poteto-help/SKILL.md"), "utf8");
    assert.match(help, /\.\.\/\.\.\/SKILL_CATALOG\.json/);
    await readFile(join(root, "skills/poteto-help/references/prompting.md"));
    const swarm = await readFile(join(root, "skills/swarm/SKILL.md"), "utf8");
    assert.match(swarm, /Child session handoff/);
    await readFile(join(root, "skills/poteto-mode/references/subagent-handoff.md"));
  }
});

test("optional performance delegates inherit fresh handoff and host precedence on every host", async () => {
  for (const host of ["codex", "omp", "claude-code"]) {
    for (const name of ["perf-issue", "hillclimb"]) {
      const text = await readFile(join(repoRoot, "packages", host, "skills", name, "SKILL.md"), "utf8");
      assert.match(text, /Child session handoff/);
      assert.match(text, /repair rounds, retries, and queue items use fresh child sessions/);
      assert.match(text, /prior findings and responses/);
      assert.match(text, /Stop and fence active writers before replacement/);
      assert.match(text, /review-round rules take precedence over the native binding/);
    }
  }
});

test("generated Codex PR procedures prefer host tools while retaining bounded adapter authority gates", async () => {
  for (const name of ["opening-a-pr", "babysit", "shipping"]) {
    const text = await readFile(join(repoRoot, "packages/codex/skills", name, "SKILL.md"), "utf8");
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
