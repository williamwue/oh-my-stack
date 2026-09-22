#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { git, writeJson } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
await mkdir(project, { recursive: true });
execFileSync("git", ["init", "-q", "-b", "main"], { cwd: project });
git(project, "config", "user.name", "Benny Fixture");
git(project, "config", "user.email", "benny@example.com");
await writeFile(join(project, "feature.txt"), "broken\n");
git(project, "add", "feature.txt");
git(project, "commit", "-qm", "fixture baseline");
const base = git(project, "rev-parse", "HEAD");

await writeJson(join(root, "provider.json"), {
  schemaVersion: 1,
  workflow: "benny",
  phase: "DORMANT",
  configuration: {
    sourceChannelId: "C-SOURCE",
    sourceThreadTs: "1000.0001",
    sourcePermalink: "https://messages.example/archives/C-SOURCE/p10000001",
    operationsChannelId: "C-OPS",
    triageIdentity: "U-BENNY-TRIAGE",
    repository: "https://github.com/example/app",
    defaultBranch: "main",
    trackerTarget: "TEAM/PROJECT",
    controlSkillName: "control-example-app",
    featureMapPath: ".benny/feature-map.md",
    verdictMarkers: {
      bug: "[benny:bug]",
      performance: "[benny:performance]",
      other: "[benny:other]"
    },
    reproAttempts: 2,
    fixBudget: 1,
    operatorApprovedAutomationCreation: true
  },
  capabilities: {
    automationRecurring: true,
    threadRead: true,
    threadReply: true,
    attachmentsRead: true,
    trackerLifecycle: true,
    appControl: true,
    mediaCapture: true,
    draftPullRequest: true,
    featureMapComplete: true,
    childSlackIsolation: true
  },
  automations: {
    triage: { state: "ABSENT" },
    reproduce: { state: "ABSENT" }
  },
  messages: [
    {
      channel: "C-SOURCE",
      ts: "1000.0001",
      threadTs: null,
      author: "U-REPORTER",
      deleted: false,
      text: "Saving the example form returns success but keeps the old value.",
      attachments: [{ id: "A-1", kind: "screenshot", readable: true }]
    }
  ],
  trackerIssues: [],
  uiRuns: [],
  mediaReviews: [],
  pullRequests: [],
  gateRaises: [],
  sourceWrites: 0,
  baseSha: base,
  simulateReplyFailure: false
}, { flag: "wx" });

console.log(`BENNY_FIXTURE_READY=${base}`);

