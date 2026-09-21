#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

git("init", "-q", "-b", "main");
git("config", "user.email", "fixture@example.invalid");
git("config", "user.name", "Fixture");
git("add", ".");
git("commit", "-qm", "initial autonomous-run queue");
const head = git("rev-parse", "HEAD");
git("switch", "-qc", "feature/autonomous-units");
await writeFile(join(root, "before.json"), `${JSON.stringify({ head }, null, 2)}\n`);
await writeFile(join(root, "state.json"), `${JSON.stringify({
  schemaVersion: 1,
  completed: 0,
  total: 3,
  active: "unit-a",
  head,
  events: [],
}, null, 2)}\n`);
console.log(`AUTONOMOUS_RUN_READY=${head}`);
