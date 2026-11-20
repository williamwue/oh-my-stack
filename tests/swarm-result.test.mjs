import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectSlice } from "../tools/swarm-result.mjs";
import { nextAction } from "../.agents/skills/oms-swarm/scripts/collect.mjs";

const required = { sha: "abc", method: "git-show" };
const complete = { ...required, status: "PASS" };

test("accepts complete evidence on the first attempt", async () => {
  assert.equal((await collectSlice(complete, required, assert.fail)).attempt, 1);
});

test("retries only the slice missing its required SHA and preserves findings", async () => {
  const result = await collectSlice({ method: required.method, status: "PASS" }, required,
    () => ({ ...complete, status: "ISSUES" }));
  assert.equal(result.status, "ISSUES");
  assert.equal(result.attempt, 2);
});

test("two invalid reports leave a gap after exactly one new dispatch", async () => {
  let calls = 0;
  const result = await collectSlice({ ...complete, sha: "wrong" }, required, () => {
    calls++;
    return { ...complete, method: undefined };
  });
  assert.deepEqual(result, { status: "gap", attempt: 2 });
  assert.equal(calls, 1);
});

test("blocked or dropped workers leave gaps", async () => {
  for (const first of [null, { status: "BLOCKED" }]) {
    assert.deepEqual(await collectSlice(first, required, assert.fail), { status: "gap", attempt: 1 });
  }
});

test("a replay of the same host completion cannot count as a fresh dispatch", () => {
  const receipt = { id: "worker-1", text: '{"status":"PASS"}' };
  assert.throws(() => nextAction({ required, attempts: [receipt, receipt] }), /distinct/);
});

test("an unreadable first message can recover with a fresh terminal message", () => {
  const attempts = [{ id: "first", text: "unstructured output" }];
  assert.equal(nextAction({ required, attempts }).action, "retry");
  attempts.push({ id: "second", text: JSON.stringify(complete) });
  assert.equal(nextAction({ required, attempts }).action, "PASS");
  assert.throws(() => nextAction({ required, attempts: [...attempts].reverse() }), /terminal/);
});

test("the host CLI returns a retry for an otherwise valid report missing only sha", () => {
  const collector = fileURLToPath(new URL("../.agents/skills/oms-swarm/scripts/collect.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [collector], {
    input: JSON.stringify({ required, attempts: [
      { id: "version-1", text: '{"status":"PASS","method":"git-show","value":"2.0.2"}' },
    ] }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { action: "retry", attempt: 1, missing: ["sha"] });
});
