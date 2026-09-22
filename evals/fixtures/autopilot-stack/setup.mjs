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
  mkdir(join(root, "trails"), { recursive: true }),
]);
git("init", "-q", "-b", "main");
git("config", "user.name", "Fixture Author");
git("config", "user.email", "fixture@example.com");
await writeFile(join(project, "README.md"), "# Autopilot stack fixture\n");
git("add", "README.md");
git("commit", "-qm", "fixture base");
const base = git("rev-parse", "HEAD");

await writeJson(join(root, "provider.json"), {
  schemaVersion: 1,
  workflow: "autopilot-stack",
  operatorGo: true,
  landingAuthority: false,
  targetBranch: "main",
  targetBaseSha: base,
  topologyWriter: "root-coordinator",
  order: [51, 52],
  stack: [],
  merges: [],
  armed: [],
  lanes: [
    { id: 51, state: "planned", ownerSession: null, headRef: "change-51", baseRef: "main", baseSha: base, headSha: null, patchId: null, checks: null, changeRequestState: "OPEN", autoMerge: false },
    { id: 52, state: "planned", ownerSession: null, headRef: "change-52", baseRef: "main", baseSha: base, headSha: null, patchId: null, checks: null, changeRequestState: "OPEN", autoMerge: false },
  ],
}, { flag: "wx" });

console.log(`AUTOPILOT_STACK_FIXTURE_READY=${base}`);
