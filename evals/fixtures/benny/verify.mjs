#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { assertNoSourceRootWrites, assertParent, git, load, sourceReplies } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const state = await load(root);

assert.equal(state.phase, "ENABLED");
assert.equal(state.automations.triage.state, "ENABLED");
assert.equal(state.automations.reproduce.state, "ENABLED");
assertParent(state);
assertNoSourceRootWrites(state);
assert.equal(state.sourceWrites, 2);
assert.equal(sourceReplies(state).length, 2);
assert.equal(state.trackerIssues.length, 1);
assert.equal(state.trackerIssues[0].state, "OPEN");
assert.equal(state.uiRuns.filter((run) => run.phase === "baseline").length, 2);
assert.equal(state.uiRuns.filter((run) => run.phase === "patched").length, 2);
assert.equal(state.mediaReviews.length, 1);
assert.match(state.mediaReviews[0].reviewer, /^reviewer-/);
assert.equal(state.pullRequests.length, 1);
assert.equal(state.pullRequests[0].state, "DRAFT");
assert.equal(state.pullRequests[0].merged, false);
assert.equal(state.pullRequests[0].deployed, false);
assert.equal(state.gateRaises.length, 0);
assert.equal(`${git(project, "show", "benny-fix-701:feature.txt")}\n`, "fixed\n");
assert.equal(`${git(project, "show", "main:feature.txt")}\n`, "broken\n");
assert.notEqual(spawnSync("git", ["merge-base", "--is-ancestor", "benny-fix-701", "main"], { cwd: project }).status, 0);
console.log(`BENNY_OK=${state.pullRequests[0].headSha}`);

