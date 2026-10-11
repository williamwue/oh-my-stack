#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const categories = new Set(["frontmatter", "name", "path", "tools", "model-selection", "authorization"]);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function contained(root, path, label) {
  assert(typeof path === "string" && path.length > 0 && !isAbsolute(path) && !/^[A-Za-z]:/.test(path) && !path.includes("\\"), `${label}: expected repository-relative POSIX path`);
  assert(!path.split("/").includes(".."), `${label}: traversal is forbidden`);
  const target = resolve(root, path);
  const relation = relative(root, target);
  assert(relation !== "" && !isAbsolute(relation) && !relation.split(sep).includes(".."), `${label}: path escapes root`);
  return target;
}

function exactKeys(value, keys, context) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${context}: expected object`);
  for (const key of Object.keys(value)) assert(keys.includes(key), `${context}: unsupported key ${key}`);
}

async function physicalContainment(boundary, target, label) {
  const physicalBoundary = await realpath(boundary);
  let existing = target;
  let physical;
  while (true) {
    try { physical = await realpath(existing); break; }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = dirname(existing);
      assert(parent !== existing, `${label}: no existing path ancestor`);
      existing = parent;
    }
  }
  const relation = relative(physicalBoundary, physical);
  assert(!isAbsolute(relation) && !relation.split(sep).includes(".."), `${label}: symlink or junction escapes boundary`);
}

export async function derivePstack({ root = defaultRoot, check = false } = {}) {
  root = resolve(root);
  await physicalContainment(root, resolve(root, "upstream/parity-derivations.json"), "parity manifest");
  const manifest = JSON.parse(await readFile(resolve(root, "upstream/parity-derivations.json"), "utf8"));
  exactKeys(manifest, ["schemaVersion", "sourceRoot", "revision", "entries"], "parity manifest");
  assert(manifest.schemaVersion === 1, "parity manifest: schemaVersion must be 1");
  assert(/^[a-f0-9]{40}$/.test(manifest.revision), "parity manifest: invalid pinned revision");
  const sourceRoot = contained(root, manifest.sourceRoot, "sourceRoot");
  await physicalContainment(root, sourceRoot, "sourceRoot");
  assert(Array.isArray(manifest.entries) && manifest.entries.length > 0, "parity manifest: entries are required");
  const outputs = new Set();
  const prepared = [];
  for (const entry of manifest.entries) {
    exactKeys(entry, ["source", "output", "sourceSha256", "outputSha256", "replacements"], "derivation");
    const label = `${entry.source} -> ${entry.output}`;
    const sourcePath = contained(sourceRoot, entry.source, `${label} source`);
    const outputPath = contained(root, entry.output, `${label} output`);
    await physicalContainment(sourceRoot, sourcePath, `${label} source`);
    await physicalContainment(root, outputPath, `${label} output`);
    assert(/^src\/core\/(?:skills|roles)\//.test(entry.output), `${label}: output is outside semantic ownership`);
    assert(!outputs.has(entry.output), `${label}: duplicate output`);
    outputs.add(entry.output);
    assert(/^[a-f0-9]{64}$/.test(entry.sourceSha256) && /^[a-f0-9]{64}$/.test(entry.outputSha256), `${label}: exact hashes are required`);
    const source = await readFile(sourcePath);
    assert(hash(source) === entry.sourceSha256, `${label}: pinned source hash mismatch`);
    let output = source.toString("utf8");
    assert(Buffer.from(output).equals(source), `${label}: source is not UTF-8 text`);
    assert(Array.isArray(entry.replacements), `${label}: replacements must be an array`);
    for (const [index, replacement] of entry.replacements.entries()) {
      const context = `${label} replacement ${index + 1}`;
      exactKeys(replacement, ["before", "after", "expectedOccurrences", "category", "reason"], context);
      assert(typeof replacement.before === "string" && replacement.before.length > 0, `${context}: empty anchor`);
      assert(typeof replacement.after === "string" && replacement.before !== replacement.after, `${context}: invalid replacement`);
      assert(Number.isSafeInteger(replacement.expectedOccurrences) && replacement.expectedOccurrences > 0, `${context}: expectedOccurrences must be positive`);
      assert(categories.has(replacement.category), `${context}: unsupported adaptation category`);
      assert(typeof replacement.reason === "string" && replacement.reason.trim().length > 0, `${context}: rationale is required`);
      const count = output.split(replacement.before).length - 1;
      assert(count === replacement.expectedOccurrences, `${context}: expected ${replacement.expectedOccurrences} occurrences, observed ${count}`);
      output = output.split(replacement.before).join(replacement.after);
    }
    assert(hash(Buffer.from(output)) === entry.outputSha256, `${label}: derived output hash mismatch`);
    prepared.push({ path: outputPath, relativePath: entry.output, bytes: Buffer.from(output) });
  }
  if (check) {
    const mismatches = [];
    for (const output of prepared) {
      let current;
      try { current = await readFile(output.path); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (!current?.equals(output.bytes)) mismatches.push(output.relativePath);
    }
    assert(mismatches.length === 0, `parity derivation drift:\n${mismatches.join("\n")}`);
  } else {
    for (const output of prepared) {
      await mkdir(dirname(output.path), { recursive: true });
      await writeFile(output.path, output.bytes);
    }
  }
  return { revision: manifest.revision, sourceRoot: manifest.sourceRoot, entries: prepared.length, checked: check, files: prepared.map((entry) => entry.relativePath) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    assert(args.every((arg) => arg === "--check") && args.length <= 1, "usage: node tools/derive-pstack.mjs [--check]");
    const result = await derivePstack({ check: args.includes("--check") });
    console.log(`pstack ${result.revision}: ${result.entries} exact derivations ${result.checked ? "verified" : "written"}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
