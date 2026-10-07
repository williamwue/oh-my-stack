#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { installArchive, packageInventory, uninstallOwned, verifyInstalledTree } from "./release-lib.mjs";

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
  if (!["install", "update", "rollback", "uninstall", "verify", "inspect", "plan"].includes(action)) throw new Error("action must be install, update, rollback, uninstall, verify, inspect, or plan");
  if (!options.target || !options.destination) throw new Error("--target and --destination are required");
  if (!["uninstall", "inspect"].includes(action) && !options.manifest) throw new Error("--manifest is required for install, update, rollback, verify, and plan");
  return options;
}

async function installedState(destination, target) {
  const marker = JSON.parse(await readFile(join(destination, "GENERATION.json"), "utf8"));
  if (marker.generatedBy !== "tools/generate.mjs" || marker.target !== target) {
    throw new Error(`${destination} is not an Oh My Stack ${target} installation`);
  }
  return { target, destination, version: marker.sourceVersion, files: await packageInventory(destination) };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.action === "uninstall") {
    await uninstallOwned({ destination: options.destination, target: options.target });
    console.log(`Uninstalled ${options.target} package from ${options.destination}.`);
    return;
  }
  if (options.action === "inspect") {
    const installed = await installedState(options.destination, options.target);
    console.log(JSON.stringify({ target: installed.target, destination: installed.destination,
      installedVersion: installed.version, installedFileCount: installed.files.length }, null, 2));
    return;
  }
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  const artifact = manifest.artifacts.find((entry) => entry.target === options.target);
  if (!artifact) throw new Error(`manifest has no ${options.target} artifact`);
  if (options.action === "plan") {
    let installed = null;
    try { installed = await installedState(options.destination, options.target); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const before = new Map((installed?.files ?? []).map((file) => [file.path, file]));
    const after = new Map(artifact.files.map((file) => [file.path, file]));
    const added = [...after.keys()].filter((path) => !before.has(path));
    const removed = [...before.keys()].filter((path) => !after.has(path));
    const changed = [...after.keys()].filter((path) => before.has(path)
      && JSON.stringify(before.get(path)) !== JSON.stringify(after.get(path)));
    console.log(JSON.stringify({ target: options.target, destination: options.destination,
      installedVersion: installed?.version ?? null, candidateVersion: manifest.version,
      changes: { added, changed, removed }, writes: false,
      note: "Package files only; runtime registration and model setup are separate." }, null, 2));
    return;
  }
  if (options.action === "verify") {
    await verifyInstalledTree(options.destination, artifact.files);
    console.log(`Verified ${options.target} package at ${options.destination}.`);
    return;
  }
  const archive = await readFile(join(dirname(options.manifest), artifact.file));
  await installArchive({
    archive,
    artifact,
    destination: options.destination,
    archiveRoot: manifest.archiveRoot,
  });
  console.log(`${options.action === "install" ? "Installed" : options.action === "rollback" ? "Rolled back" : "Updated"} ${options.target} package at ${options.destination}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
