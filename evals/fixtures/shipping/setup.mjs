#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();
const commit = async (branch, path, content, message) => {
  git("checkout", "-q", "-b", branch);
  await mkdir(join(project, path, ".."), { recursive: true });
  await writeFile(join(project, path), content);
  git("add", path);
  git("commit", "-qm", message);
  return git("rev-parse", "HEAD");
};

await mkdir(project, { recursive: true });
await mkdir(join(root, "verdicts"), { recursive: true });
git("init", "-q", "-b", "main");
git("config", "user.name", "Fixture Author");
git("config", "user.email", "fixture@example.com");
await writeFile(join(project, "README.md"), "# Shipping fixture\n");
git("add", "README.md");
git("commit", "-qm", "fixture base");
const base = git("rev-parse", "HEAD");
const one = await commit("stack-1", "features/one.txt", "alpha\n", "add first change");
const two = await commit("stack-2", "features/two.txt", "beta\n", "add second change");
const three = await commit("stack-3", "features/three.txt", "BROKEN\n", "add failing third change");
git("checkout", "-q", "main");

const state = {
  schemaVersion: 1,
  targetBranch: "main",
  authorizedMode: "merge-now",
  order: [41, 42, 43],
  reads: 0,
  merges: [],
  pullRequests: [
    { id: 41, baseRef: "main", baseSha: base, headRef: "stack-1", headSha: one, writerSession: "writer-41", state: "OPEN", checks: "PASS", mergeable: true },
    { id: 42, baseRef: "stack-1", baseSha: one, headRef: "stack-2", headSha: two, writerSession: "writer-42", state: "OPEN", checks: "PASS", mergeable: true },
    { id: 43, baseRef: "stack-2", baseSha: two, headRef: "stack-3", headSha: three, writerSession: "writer-43", state: "OPEN", checks: "PASS", mergeable: true }
  ]
};
await writeFile(join(root, "provider.json"), `${JSON.stringify(state, null, 2)}\n`, { flag: "wx" });
console.log(`SHIPPING_FIXTURE_READY=${base}`);
