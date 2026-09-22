import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const fixture = new URL("../evals/fixtures/benny/", import.meta.url);

async function fresh() {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-benny-"));
  await cp(fixture, root, { recursive: true });
  execFileSync("node", ["setup.mjs", root], { cwd: root });
  return root;
}

const run = (root, action, actor) => execFileSync("node", ["run.mjs", action, root, ...(actor ? [actor] : [])], { cwd: root, encoding: "utf8" });

test("Benny stays dormant until thread-safe triage and repro pass end to end", async () => {
  const root = await fresh();
  assert.match(run(root, "plan"), /BENNY_PLAN=DRAFT_READY/);
  assert.match(run(root, "triage", "triage-coordinator"), /BENNY_TRIAGE=ISSUE-701:THREAD_ONLY/);
  assert.match(run(root, "reproduce", "reviewer-media-1"), /BENNY_REPRO=PR-801:[0-9a-f]{40}:DRAFT/);
  assert.match(run(root, "enable", "setup-coordinator"), /BENNY_AUTOMATIONS=ENABLED/);
  const verified = execFileSync("node", ["verify.mjs", root], { cwd: root, encoding: "utf8" });
  assert.match(verified, /BENNY_OK=[0-9a-f]{40}/);
});

test("Benny compensates a tracker write when its thread-only verdict cannot land", async () => {
  const root = await fresh();
  run(root, "plan");
  const path = join(root, "provider.json");
  const state = JSON.parse(await readFile(path, "utf8"));
  state.simulateReplyFailure = true;
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
  const result = spawnSync("node", ["run.mjs", "triage", root, "triage-coordinator"], { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  const after = JSON.parse(await readFile(path, "utf8"));
  assert.equal(after.trackerIssues[0].state, "CANCELED");
  assert.equal(after.trackerIssues[0].compensated, true);
  assert.equal(after.sourceWrites, 0);
});

test("Benny refuses missing parents, untrusted markers, and insufficient UI proof", async () => {
  const missingParent = await fresh();
  run(missingParent, "plan");
  const missingPath = join(missingParent, "provider.json");
  const missing = JSON.parse(await readFile(missingPath, "utf8"));
  missing.messages[0].deleted = true;
  await writeFile(missingPath, `${JSON.stringify(missing, null, 2)}\n`);
  assert.notEqual(spawnSync("node", ["run.mjs", "triage", missingParent, "triage-coordinator"], { cwd: missingParent }).status, 0);

  const untrusted = await fresh();
  run(untrusted, "plan");
  run(untrusted, "triage", "triage-coordinator");
  const untrustedPath = join(untrusted, "provider.json");
  const untrustedState = JSON.parse(await readFile(untrustedPath, "utf8"));
  untrustedState.messages.find((message) => message.threadTs).author = "U-IMPOSTOR";
  await writeFile(untrustedPath, `${JSON.stringify(untrustedState, null, 2)}\n`);
  assert.notEqual(spawnSync("node", ["run.mjs", "reproduce", untrusted, "reviewer-media-2"], { cwd: untrusted }).status, 0);

  const insufficient = await fresh();
  run(insufficient, "plan");
  run(insufficient, "triage", "triage-coordinator");
  const insufficientPath = join(insufficient, "provider.json");
  const insufficientState = JSON.parse(await readFile(insufficientPath, "utf8"));
  insufficientState.configuration.reproAttempts = 1;
  await writeFile(insufficientPath, `${JSON.stringify(insufficientState, null, 2)}\n`);
  assert.notEqual(spawnSync("node", ["run.mjs", "reproduce", insufficient, "reviewer-media-3"], { cwd: insufficient }).status, 0);
  const after = JSON.parse(await readFile(insufficientPath, "utf8"));
  assert.deepEqual(after.pullRequests, []);
  assert.equal(gitBranchExists(join(insufficient, "project"), "benny-fix-701"), false);
});

function gitBranchExists(project, branch) {
  return spawnSync("git", ["show-ref", "--verify", `refs/heads/${branch}`], { cwd: project }).status === 0;
}

