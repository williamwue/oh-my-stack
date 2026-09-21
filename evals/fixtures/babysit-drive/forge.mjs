#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [action, rootArg = "."] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const statePath = join(root, "forge", "pr.json");
const state = JSON.parse(await readFile(statePath, "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

if (action === "view") {
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
} else if (action === "refresh") {
  const head = git("rev-parse", "refs/heads/feature/normalize-note");
  const remoteHead = git("rev-parse", "refs/remotes/origin/feature/normalize-note");
  assert.equal(head, remoteHead, "owning branch must be pushed before refresh");
  assert.notEqual(head, state.headSha, "refresh requires a new pushed head");
  assert.equal(git("status", "--porcelain"), "", "project must be clean before refresh");
  execFileSync(process.execPath, ["--test", "test/receipt.test.mjs"], { cwd: project, stdio: "pipe" });
  const source = await readFile(join(project, "lib", "receipt.mjs"), "utf8");
  assert(!source.includes(".trim()"), "receipt note must preserve exact content");
  state.events.push({ type: "push-wave", from: state.headSha, to: head });
  state.headSha = head;
  state.mergeState = "READY";
  state.checks = state.checks.map((check) => ({ ...check, status: "SUCCESS" }));
  state.threads = state.threads.map((thread) => ({ ...thread, resolved: true }));
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
} else {
  throw new Error("usage: node forge.mjs <view|refresh> <fixture-root>");
}
