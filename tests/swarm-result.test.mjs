import assert from "node:assert/strict";
import test from "node:test";
import { collectSlice } from "../tools/swarm-result.mjs";

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
