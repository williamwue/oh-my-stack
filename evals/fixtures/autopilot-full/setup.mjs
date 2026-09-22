#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { writeJson } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

await mkdir(project, { recursive: true });
await Promise.all([
  mkdir(join(root, "reviews"), { recursive: true }),
  mkdir(join(root, "aggregates"), { recursive: true }),
  mkdir(join(root, "authorizations"), { recursive: true }),
  mkdir(join(root, "trails"), { recursive: true }),
]);
git("init", "-q", "-b", "main");
git("config", "user.name", "Fixture Author");
git("config", "user.email", "fixture@example.com");
await writeFile(join(project, "README.md"), "# Autopilot full fixture\n");
git("add", "README.md");
git("commit", "-qm", "fixture base");
const base = git("rev-parse", "HEAD");

await writeJson(join(root, "provider.json"), {
  schemaVersion: 1,
  workflow: "autopilot-full",
  operatorGo: true,
  fullAutonomy: true,
  targetBranch: "main",
  initialTargetSha: base,
  verdictOwner: "root-coordinator",
  provider: "disposable-local",
  autonomousQueue: [61, 62],
  operatorQueue: [63],
  merged: [],
  countersigns: [],
  gateRaises: [],
  lanes: [
    { id: 61, state: "planned", ownerSession: null, headRef: "change-61", baseSha: base, headSha: null, patchId: null, checks: null, changeRequestState: "PLANNED", authorization: null, mergedBy: null },
    { id: 62, state: "planned", ownerSession: null, headRef: "change-62", baseSha: base, headSha: null, patchId: null, checks: null, changeRequestState: "PLANNED", authorization: null, mergedBy: null },
    { id: 63, state: "WAIT_OPERATOR", operatorOwned: true, ownerSession: null, headRef: null, baseSha: base, headSha: null, patchId: null, checks: null, changeRequestState: "OPERATOR_GATE", authorization: null, mergedBy: null },
  ],
}, { flag: "wx" });

console.log(`AUTOPILOT_FULL_FIXTURE_READY=${base}`);
