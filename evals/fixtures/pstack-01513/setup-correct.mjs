#!/usr/bin/env node

import { cp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const root = resolve(process.argv[2]);
await mkdir(join(root, "tools"), { recursive: true });
await cp(join(here, "historical", "install-release.mjs"), join(root, "tools", "install-release.mjs"));
await cp(join(repo, "tools", "release-lib.mjs"), join(root, "tools", "release-lib.mjs"));
await symlink(join(root, "tools", "install-release.mjs"), join(root, "installer.mjs"), "file");
await symlink(root, join(root, "source"), process.platform === "win32" ? "junction" : "dir");
await writeFile(join(root, "history.json"), await readFile(join(here, "historical", "source.json")));
console.log(JSON.stringify({ root, historicalSource: "history.json", aliases: ["installer.mjs", "source/tools/install-release.mjs"] }));
