#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { installArchive, uninstallOwned } from "./release-lib.mjs";

function parseArgs(argv) {
  const action = argv.shift();
  const options = { action, manifest: null, target: null, destination: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") options.manifest = resolve(argv[++index]);
    else if (arg === "--target") options.target = argv[++index];
    else if (arg === "--destination") options.destination = resolve(argv[++index]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!["install", "update", "uninstall"].includes(action)) throw new Error("action must be install, update, or uninstall");
  if (!options.target || !options.destination) throw new Error("--target and --destination are required");
  if (action !== "uninstall" && !options.manifest) throw new Error("--manifest is required for install and update");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.action === "uninstall") {
    await uninstallOwned({ destination: options.destination, target: options.target });
    console.log(`Uninstalled ${options.target} package from ${options.destination}.`);
    return;
  }
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  const artifact = manifest.artifacts.find((entry) => entry.target === options.target);
  if (!artifact) throw new Error(`manifest has no ${options.target} artifact`);
  const archive = await readFile(join(dirname(options.manifest), artifact.file));
  await installArchive({
    archive,
    artifact,
    destination: options.destination,
    archiveRoot: manifest.archiveRoot,
  });
  console.log(`${options.action === "install" ? "Installed" : "Updated"} ${options.target} package at ${options.destination}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
