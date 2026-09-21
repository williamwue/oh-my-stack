#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

git("init", "-q", "-b", "main");
git("config", "user.email", "fixture@example.invalid");
git("config", "user.name", "Fixture");
git("add", ".");
git("commit", "-qm", "initial receipt");
const main = git("rev-parse", "HEAD");
git("switch", "-qc", "feature/receipt-note");
await writeFile(join(project, "feature.txt"), "feature marker\n");
git("add", "feature.txt");
git("commit", "-qm", "add receipt note marker");
const feature = git("rev-parse", "HEAD");
const forge = await readFile(join(root, "forge", "pr.json"));
await writeFile(join(root, "before.json"), `${JSON.stringify({
  main,
  feature,
  forgeSha256: createHash("sha256").update(forge).digest("hex"),
}, null, 2)}\n`);
console.log(`BABYSIT_FIXTURE_READY=${feature}`);
