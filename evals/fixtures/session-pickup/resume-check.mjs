#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

assert.equal(checkpoint.schemaVersion, 1);
assert.equal(checkpoint.kind, "oh-my-stack-resume");
assert.equal(git("branch", "--show-current"), checkpoint.repository.branch, "checkpoint branch is stale");
assert.equal(git("rev-parse", "HEAD"), checkpoint.repository.head, "checkpoint head is stale");
assert.equal(git("status", "--porcelain"), "", "checkpoint expected a clean worktree");
assert.equal(checkpoint.repository.clean, true);
assert.equal(git("merge-base", checkpoint.repository.base, "HEAD"), checkpoint.repository.base);
console.log(`RESUME_ANCHOR_OK=${checkpoint.repository.head}`);
