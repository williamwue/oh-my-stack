#!/usr/bin/env node
// What changed in chhoumann/t3-pstack since the commit OMS last carried its
// T3 work from. OMS takes upstream pstack through pstack-claude, so only the
// T3 files listed in t3-upstream.json are ported from t3-pstack, by hand.
//
//   bun tools/t3-upstream.mjs <t3-pstack clone> [<ref>]            list changed files and their diff stat
//   bun tools/t3-upstream.mjs <t3-pstack clone> <ref> --advance    record <ref> as carried
//
// <ref> defaults to the clone's origin/main after a fetch.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PIN = fileURLToPath(new URL("t3-upstream.json", import.meta.url));

const git = (clone, ...args) => execFileSync("git", ["-C", clone, ...args], { encoding: "utf8" }).trim();

const [clone, refArg, flag] = process.argv.slice(2);
if (!clone || (flag !== undefined && flag !== "--advance")) {
  console.error("usage: t3-upstream.mjs <t3-pstack clone> [<ref>] [--advance]");
  process.exit(2);
}
const pin = JSON.parse(readFileSync(PIN, "utf8"));
if (refArg === undefined) git(clone, "fetch", "--quiet", "origin");
const sha = git(clone, "rev-parse", `${refArg ?? "origin/main"}^{commit}`);

if (flag === "--advance") {
  const version = git(clone, "show", `${sha}:VERSION`);
  writeFileSync(PIN, JSON.stringify({ ...pin, version, sha }, null, 2) + "\n");
  console.log(`t3-upstream.json: ${pin.version} (${pin.sha.slice(0, 7)}) -> ${version} (${sha.slice(0, 7)})`);
} else {
  const stat = git(clone, "diff", "--stat", `${pin.sha}..${sha}`, "--", ...pin.paths);
  console.log(stat === "" ? `no T3 file changed between ${pin.sha.slice(0, 7)} and ${sha.slice(0, 7)}` : stat);
}
