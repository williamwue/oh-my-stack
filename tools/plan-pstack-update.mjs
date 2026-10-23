#!/usr/bin/env node
import { readdir, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blobs, collisions, compare, git, localBytes, localCollision, localFiles, portablePath, sha256, tree } from "./pstack-source.mjs";
import { readPstackDerivations } from "./derive-pstack.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = "https://github.com/cursor/plugins";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const officialOrigin = value => /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)cursor\/plugins(?:\.git)?\/?$/i.test(value);

/** Read committed official Git objects; never fetch, materialize, or advance a pin. */
export async function planPstackUpdate({ root = defaultRoot, sourceCheckout, revision } = {}) {
  root = await realpath(resolve(root));
  assert(typeof sourceCheckout === "string" && sourceCheckout.length, "sourceCheckout is required");
  assert(typeof revision === "string" && /^[a-f0-9]{40}$/.test(revision), "revision must be a full 40-character commit SHA");
  sourceCheckout = await realpath(resolve(sourceCheckout));
  const json = async path => JSON.parse((await localBytes(root, path)).toString("utf8"));
  const imports = await json("upstream/imports.json");
  assert(imports.schemaVersion === 2 && imports.derivationManifest === "upstream/parity-derivations.json", "Expected active schema-2 parity imports");
  const { manifest, outputs } = await readPstackDerivations({ root });
  const receipt = await json(imports.sourceReceipt);
  assert(imports.revision === manifest.revision && receipt.revision === manifest.revision
    && receipt.repository === repository && Array.isArray(receipt.files) && receipt.files.length > 0, "Inconsistent official baseline receipt");
  assert((await realpath(git(sourceCheckout, ["rev-parse", "--show-toplevel"]).toString().trim())) === sourceCheckout, "sourceCheckout must be a Git root");
  const origins = git(sourceCheckout, ["config", "--get-all", "remote.origin.url"]).toString().trim().split("\n");
  assert(origins.length === 1 && officialOrigin(origins[0]), "Only the official cursor/plugins origin is accepted");
  for (const commit of [manifest.revision, revision])
    assert(git(sourceCheckout, ["rev-parse", "--verify", `${commit}^{commit}`]).toString().trim() === commit, "Expected exact commit identity");
  assert(git(sourceCheckout, ["merge-base", "--is-ancestor", manifest.revision, revision], { allowOne: true }) === 0, "Candidate must descend from the pinned official revision");
  const before = tree(sourceCheckout, manifest.revision), after = tree(sourceCheckout, revision);
  const content = blobs(sourceCheckout, [before, after]);
  const expected = new Map();
  for (const file of receipt.files) {
    const path = portablePath(file.upstreamPath);
    assert(path.startsWith("pstack/") && file.path === `${manifest.sourceRoot}/${path.slice(7)}`, "Receipt path does not match the active snapshot");
    const name = path.slice(7), item = before.get(name);
    assert(!expected.has(name) && item?.type === "blob" && ["100644", "100755"].includes(item.mode)
      && item.oid === file.blobSha1, `Baseline Git inventory mismatch: ${name}`);
    const bytes = await localBytes(root, file.path);
    assert(sha256(bytes) === file.sha256 && bytes.equals(content.get(item.oid)), `Baseline snapshot mismatch: ${name}`);
    expected.set(name, file.path);
  }
  const snapshotFiles = await localFiles(root, manifest.sourceRoot);
  assert(expected.size === before.size && snapshotFiles.length === expected.size
    && snapshotFiles.every(path => [...expected.values()].includes(path)), "Complete baseline inventory mismatch");

  const issues = [], derivations = [], metadataReviews = [];
  const issue = (code, path, details = {}, severity = "blocking") => issues.push({ code, path, severity, ...details });
  for (const { path, other } of collisions(after.keys())) issue("PORTABLE_PATH_COLLISION", path, { other });
  for (const file of after.values()) if (file.type !== "blob" || !["100644", "100755"].includes(file.mode))
    issue("UNSUPPORTED_GIT_ENTRY", file.path, { mode: file.mode, type: file.type });
  const version = files => {
    const values = [".cursor-plugin/plugin.json", "plugin.json"].map(path => {
      const file = files.get(path);
      const plugin = JSON.parse(content.get(file?.oid)?.toString("utf8") ?? "null");
      assert(plugin?.name === "pstack" && typeof plugin.version === "string" && /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(plugin.version), `Invalid official plugin metadata: ${path}`);
      return plugin.version;
    });
    assert(values[0] === values[1], "Official plugin versions disagree");
    return values[0];
  };
  const baselineVersion = version(before), candidateVersion = version(after);
  for (const output of outputs) {
    const { entry } = output;
    assert(expected.has(entry.source) && output.sourceBytes.equals(content.get(before.get(entry.source)?.oid)), `Derivation source absent from receipt: ${entry.source}`);
    const local = await localBytes(root, entry.output, true);
    const localState = local === null ? "missing" : local.equals(output.bytes) ? "clean" : "modified";
    if (localState !== "clean") issue(after.has(entry.source) ? "LOCAL_OUTPUT_DRIFT" : "DELETE_MODIFIED_OUTPUT", entry.source,
      { output: entry.output, localState, expectedSha256: entry.outputSha256, actualSha256: local === null ? null : sha256(local) });
    const candidate = after.get(entry.source);
    const detail = { source: entry.source, output: entry.output, localState, anchorChecks: [], proposedOutputSha256: null };
    derivations.push(detail);
    if (!candidate) { issue("DERIVED_SOURCE_DELETED", entry.source, { output: entry.output }); continue; }
    if (candidate.type !== "blob" || !["100644", "100755"].includes(candidate.mode)) continue;
    const bytes = content.get(candidate.oid);
    let text = bytes.toString("utf8");
    if (!Buffer.from(text).equals(bytes)) { issue("DERIVED_SOURCE_NOT_UTF8", entry.source); continue; }
    for (const [index, replacement] of entry.replacements.entries()) {
      const observed = text.split(replacement.before).length - 1;
      const check = { replacement: index + 1, category: replacement.category, expected: replacement.expectedOccurrences, observed };
      detail.anchorChecks.push(check);
      if (observed !== replacement.expectedOccurrences) {
        issue("ANCHOR_OCCURRENCE_MISMATCH", entry.source, { output: entry.output, ...check });
        break;
      }
      text = text.split(replacement.before).join(replacement.after);
    }
    if (detail.anchorChecks.every(check => check.observed === check.expected)) detail.proposedOutputSha256 = sha256(Buffer.from(text));
  }
  const derivedSources = new Set(outputs.map(output => output.entry.source));
  for (const path of after.keys()) {
    if (derivedSources.has(path)) continue;
    const skill = /^skills\/([^/]+)\/SKILL\.md$/.exec(path);
    const role = /^agents\/([^/]+)\.md$/.exec(path);
    if (skill || role) {
      const name = (skill ?? role)[1];
      const metadata = `src/core/${skill ? "skills" : "roles"}/${name}/${skill ? "skill" : "role"}.json`;
      const proposedOutput = skill ? `src/core/${path}` : `src/core/roles/${name}/instructions.md`;
      metadataReviews.push({ source: path, kind: skill ? "skill" : "role", name, metadata, proposedOutput });
      issue("SEMANTIC_MAPPING_REQUIRED", path, { metadata, proposedOutput }, "review");
      const collision = await localCollision(root, metadata) ?? await localCollision(root, proposedOutput);
      if (collision) issue("LOCAL_PATH_COLLISION", path, { metadata, proposedOutput, collision });
    }
  }
  const files = [...new Set([...before.keys(), ...after.keys()])].sort(compare).map(path => {
    const old = before.get(path), candidate = after.get(path);
    return { path, change: !old ? "added" : !candidate ? "deleted" : old.oid !== candidate.oid || old.mode !== candidate.mode ? "modified" : "unchanged",
      ownership: derivedSources.has(path) ? "derived" : "source-only",
      oldMode: old?.mode ?? null, newMode: candidate?.mode ?? null,
      oldSha256: old?.type === "blob" ? sha256(content.get(old.oid)) : null,
      newSha256: candidate?.type === "blob" ? sha256(content.get(candidate.oid)) : null };
  });
  const targets = (await readdir(join(root, "src/adapters"), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort(compare);
  const changed = files.some(file => file.change !== "unchanged");
  return { schemaVersion: 1, operation: "preview-only", repository,
    baseline: { revision: manifest.revision, version: baselineVersion, sourceRoot: manifest.sourceRoot, fileCount: before.size },
    candidate: { revision, version: candidateVersion, fileCount: after.size },
    status: issues.some(issue => issue.severity === "blocking") ? "blocked" : changed || issues.length ? "review-required" : "unchanged",
    files, derivations, metadataReviews, issues, targets,
    requiredChecks: ["node tools/derive-pstack.mjs --check", "npm run generate", "npm run check"],
    application: "Review mappings, metadata and provenance before using the existing exact derivation and generation flow. This plan cannot be applied." };
}

const usage = "Usage: node tools/plan-pstack-update.mjs --source-checkout OFFICIAL_GIT_ROOT --revision FULL_SHA [--root OMS_ROOT]\nRead-only JSON preview. Exit 0: unchanged/review-required; 1: blocked; 2: invalid input. No fetch or apply mode.";
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    if (args.length === 1 && args[0] === "--help") console.log(usage);
    else {
      const names = { "--root": "root", "--source-checkout": "sourceCheckout", "--revision": "revision" };
      for (let i = 0; i < args.length; i += 2) {
        assert(Object.hasOwn(names, args[i]) && args[i + 1] && !args[i + 1].startsWith("--") && !Object.hasOwn(options, names[args[i]]), usage);
        options[names[args[i]]] = args[i + 1];
      }
      const plan = await planPstackUpdate(options);
      console.log(JSON.stringify(plan, null, 2));
      if (plan.status === "blocked") process.exitCode = 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
