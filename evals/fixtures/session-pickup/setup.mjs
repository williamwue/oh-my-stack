#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const remote = join(root, "remote.git");
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

await mkdir(remote, { recursive: true });
execFileSync("git", ["init", "-q", "--bare", remote]);
git("init", "-q", "-b", "main");
git("config", "user.email", "fixture@example.invalid");
git("config", "user.name", "Fixture");
git("add", ".");
git("commit", "-qm", "initial label behavior");
const main = git("rev-parse", "HEAD");
git("remote", "add", "origin", remote);
git("push", "-q", "-u", "origin", "main");
git("switch", "-qc", "feature/labels");
git("push", "-q", "-u", "origin", "feature/labels");
const feature = git("rev-parse", "HEAD");

await writeFile(join(project, "lib", "labels.mjs"), [
  "export function displayLabel(label) {",
  "  return label;",
  "}",
  "",
  "export function labelKey() {",
  "  return \"pending\";",
  "}",
  "",
].join("\n"));
await writeFile(join(root, "before.json"), `${JSON.stringify({ main, feature }, null, 2)}\n`);
console.log(`SESSION_PICKUP_READY=${feature}`);
