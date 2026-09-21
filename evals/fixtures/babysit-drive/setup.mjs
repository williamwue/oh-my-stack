#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const remote = join(root, "remote.git");
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

await mkdir(remote, { recursive: true });
await mkdir(join(root, "forge"), { recursive: true });
execFileSync("git", ["init", "-q", "--bare", remote]);
git("init", "-q", "-b", "main");
git("config", "user.email", "fixture@example.invalid");
git("config", "user.name", "Fixture");
git("add", ".");
git("commit", "-qm", "initial receipt behavior");
const main = git("rev-parse", "HEAD");
git("remote", "add", "origin", remote);
git("push", "-q", "-u", "origin", "main");
git("switch", "-qc", "feature/normalize-note");
await writeFile(join(project, "lib", "receipt.mjs"), [
  "export function renderReceipt(note) {",
  "  return note ? `Note: ${note.trim()}` : \"No note\";",
  "}",
  "",
].join("\n"));
git("add", "lib/receipt.mjs");
git("commit", "-qm", "normalize receipt note");
git("push", "-q", "-u", "origin", "feature/normalize-note");
const feature = git("rev-parse", "HEAD");
await writeFile(join(root, "forge", "pr.json"), `${JSON.stringify({
  schemaVersion: 1,
  number: 23,
  state: "OPEN",
  base: "main",
  head: "feature/normalize-note",
  headSha: feature,
  mergeState: "BLOCKED",
  checks: [
    { name: "lint", status: "SUCCESS" },
    { name: "test", status: "FAILURE" },
  ],
  threads: [{
    id: "T1",
    resolved: false,
    path: "lib/receipt.mjs",
    line: 2,
    body: "This trim changes operator-authored content; preserve the exact note.",
  }],
  events: [],
}, null, 2)}\n`);
await writeFile(join(root, "before.json"), `${JSON.stringify({ main, feature }, null, 2)}\n`);
console.log(`BABYSIT_DRIVE_READY=${feature}`);
