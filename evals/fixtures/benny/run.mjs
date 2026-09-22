#!/usr/bin/env node

import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  assertCapabilities,
  assertNoSourceRootWrites,
  assertParent,
  git,
  load,
  save,
  sourceReplies,
  writeJson,
} from "./lib.mjs";

const [action, rootArg = ".", actor] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await load(root);

if (action === "plan") {
  assert.equal(state.phase, "DORMANT");
  assert.equal(state.configuration.operatorApprovedAutomationCreation, true);
  assertCapabilities(state, [
    "automationRecurring",
    "threadRead",
    "threadReply",
    "attachmentsRead",
    "trackerLifecycle",
    "appControl",
    "mediaCapture",
    "draftPullRequest",
    "featureMapComplete",
    "childSlackIsolation",
  ]);
  assertParent(state);
  assert.ok(state.configuration.controlSkillName);
  assert.ok(state.configuration.featureMapPath);
  state.automations = {
    triage: { state: "DRAFT", skill: "skills/triage-issue-reports/SKILL.md" },
    reproduce: { state: "DRAFT", skill: "skills/reproduce-and-fix-issues/SKILL.md" },
  };
  state.phase = "DRAFT_READY";
  await writeJson(join(root, "automation-drafts.json"), state.automations, { flag: "wx" });
  await save(root, state);
  console.log("BENNY_PLAN=DRAFT_READY");
} else if (action === "triage") {
  assert.equal(actor, "triage-coordinator");
  assert.equal(state.phase, "DRAFT_READY");
  assertCapabilities(state, ["threadRead", "threadReply", "attachmentsRead", "trackerLifecycle"]);
  assertParent(state);
  assertNoSourceRootWrites(state);
  assert.equal(state.trackerIssues.some((issue) => issue.sourcePermalink === state.configuration.sourcePermalink), false, "duplicate source link");

  const issue = {
    id: "ISSUE-701",
    state: "OPEN",
    title: "Example form reports success without saving the new value",
    sourcePermalink: state.configuration.sourcePermalink,
    classification: "bug",
    compensationAvailable: true,
  };
  state.trackerIssues.push(issue);
  if (state.simulateReplyFailure) {
    issue.state = "CANCELED";
    issue.compensated = true;
    await save(root, state);
    throw new Error("thread verdict failed; tracker issue compensated");
  }

  assertParent(state);
  state.messages.push({
    channel: state.configuration.sourceChannelId,
    ts: "1000.0002",
    threadTs: state.configuration.sourceThreadTs,
    author: state.configuration.triageIdentity,
    deleted: false,
    text: `Confirmed as a new bug: ${issue.title}.\n${state.configuration.verdictMarkers.bug} tracker=https://tracker.example/${issue.id}`,
  });
  state.sourceWrites += 1;
  assertParent(state);
  const verdicts = sourceReplies(state).filter((message) => message.author === state.configuration.triageIdentity);
  assert.equal(verdicts.length, 1);
  state.phase = "TRIAGED";
  await save(root, state);
  console.log(`BENNY_TRIAGE=${issue.id}:THREAD_ONLY`);
} else if (action === "reproduce") {
  assert.match(actor ?? "", /^reviewer-[A-Za-z0-9._:/-]+$/, "independent media reviewer is required");
  assert.equal(state.phase, "TRIAGED");
  assertCapabilities(state, ["threadRead", "threadReply", "appControl", "mediaCapture", "draftPullRequest", "featureMapComplete"]);
  assertParent(state);
  const trusted = sourceReplies(state).filter((message) => {
    const markers = Object.values(state.configuration.verdictMarkers).filter((marker) => message.text.includes(marker));
    return message.author === state.configuration.triageIdentity && markers.length === 1;
  });
  assert.equal(trusted.length, 1, "trusted triage marker required");
  assert.match(trusted[0].text, /\[benny:bug\]|\[benny:performance\]/);

  for (let attempt = 1; attempt <= state.configuration.reproAttempts; attempt += 1) {
    state.uiRuns.push({ phase: "baseline", attempt, path: "Example form -> Save", observed: "old value remains", realUserActions: true });
  }
  assert.equal(state.uiRuns.filter((run) => run.phase === "baseline").length, 2, "two independent baseline repros required");
  state.mediaReviews.push({ reviewer: actor, verdict: "VISIBLE_BROKEN_STATE", screenshot: "/tmp/benny/before.png", recording: "/tmp/benny/before.mov" });

  git(project, "checkout", "-q", "-b", "benny-fix-701");
  await writeFile(join(project, "feature.txt"), "fixed\n");
  git(project, "add", "feature.txt");
  git(project, "commit", "-qm", "fix example form persistence");
  const head = git(project, "rev-parse", "HEAD");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    state.uiRuns.push({ phase: "patched", attempt, path: "Example form -> Save", observed: "new value persists", realUserActions: true });
  }
  state.pullRequests.push({
    id: "PR-801",
    state: "DRAFT",
    baseSha: state.baseSha,
    headSha: head,
    tracker: "ISSUE-701",
    beforeEvidence: 2,
    afterEvidence: 2,
    merged: false,
    deployed: false,
  });
  assertParent(state);
  state.messages.push({
    channel: state.configuration.sourceChannelId,
    ts: "1000.0003",
    threadTs: state.configuration.sourceThreadTs,
    author: "U-BENNY-REPRO",
    deleted: false,
    text: "Reproduced twice through the mapped UI; a bounded draft fix is ready for review.",
  });
  state.sourceWrites += 1;
  state.phase = "THREAD_SAFETY_PROVED";
  await save(root, state);
  console.log(`BENNY_REPRO=PR-801:${head}:DRAFT`);
} else if (action === "enable") {
  assert.equal(actor, "setup-coordinator");
  assert.equal(state.phase, "THREAD_SAFETY_PROVED");
  assert.equal(state.sourceWrites, 2);
  assertNoSourceRootWrites(state);
  assertParent(state);
  assert.equal(sourceReplies(state).filter((message) => message.author === state.configuration.triageIdentity).length, 1);
  assert.equal(state.pullRequests.length, 1);
  assert.equal(state.pullRequests[0].state, "DRAFT");
  state.automations.triage.state = "ENABLED";
  state.automations.reproduce.state = "ENABLED";
  state.phase = "ENABLED";
  await save(root, state);
  console.log("BENNY_AUTOMATIONS=ENABLED");
} else {
  throw new Error("usage: node run.mjs <plan|triage|reproduce|enable> <root> [actor]");
}

