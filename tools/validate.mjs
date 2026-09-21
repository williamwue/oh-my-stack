#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  filesUnder,
  loadModel,
  readJson,
  repoRoot,
  validateRenderedTarget,
} from "./generate.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function validateLocalMarkdownLinks(root) {
  const markdownFiles = (await filesUnder(root)).filter(
    (path) => path.endsWith(".md") && !path.includes(`${join(root, "node_modules")}`),
  );
  for (const path of markdownFiles) {
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(?:https?:\/\/|mailto:|#)/.test(target)) continue;
      const fileTarget = target.replace(/#.*$/, "");
      if (!fileTarget) continue;
      const resolved = resolve(dirname(path), decodeURIComponent(fileTarget));
      assert(resolved.startsWith(`${root}/`) || resolved === root, `${relative(root, path)}: link escapes repository`);
      assert(await exists(resolved), `${relative(root, path)}: missing local link ${target}`);
    }
  }
}

async function validateExecutableInventory(root) {
  const inventory = await readJson(join(root, "security", "executables.json"));
  assert(inventory.schemaVersion === 1, "security/executables.json: schemaVersion must be 1");
  const seen = new Set();
  for (const entry of inventory.entries) {
    assert(!seen.has(entry.path), `duplicate executable inventory entry ${entry.path}`);
    seen.add(entry.path);
    assert(await exists(join(root, entry.path)), `missing executable ${entry.path}`);
    assert(typeof entry.network === "boolean", `${entry.path}: network must be explicit`);
    assert(Array.isArray(entry.writes), `${entry.path}: writes must be an array`);
    assert(entry.owner && entry.purpose && entry.uninstallBehavior, `${entry.path}: incomplete inventory entry`);
  }
  for (const path of await filesUnder(join(root, "tools"))) {
    if (!path.endsWith(".mjs")) continue;
    const key = relative(root, path);
    assert(seen.has(key), `${key}: executable is missing from security inventory`);
  }
}

async function validateJsonDocuments(root) {
  const roots = ["src", "packages", "evals", "security"];
  for (const directory of roots) {
    for (const path of await filesUnder(join(root, directory))) {
      if (!path.endsWith(".json")) continue;
      try {
        await readJson(path);
      } catch (error) {
        throw new Error(`${relative(root, path)}: invalid JSON: ${error.message}`);
      }
    }
  }
  await readJson(join(root, "package.json"));
  await readJson(join(root, "package-lock.json"));
}

async function validateRuntimeEvidence(root, model) {
  const evidenceByPath = new Map();
  const evidenceRoot = join(root, "evals", "evidence");
  for (const path of await filesUnder(evidenceRoot)) {
    if (!path.endsWith(".json")) continue;
    const document = await readJson(path);
    const key = relative(root, path);
    assert(document.schemaVersion === 1, `${key}: schemaVersion must be 1`);
    assert(document.result === "pass" || document.result === "fail", `${key}: invalid result`);
    assert(/^D[0-3]$/.test(document.claims?.deliveryTarget), `${key}: invalid delivery target`);
    assert(/^D[0-3]$/.test(document.claims?.deliveryAchieved), `${key}: invalid achieved delivery`);
    assert(/^W[0-4]$/.test(document.claims?.workflowAchieved), `${key}: invalid workflow claim`);
    assert(Array.isArray(document.claims?.observedDeliveryChecks), `${key}: observed delivery checks are required`);
    assert(model.profiles.has(document.profile), `${key}: unknown profile ${document.profile}`);
    assert(Array.isArray(document.capabilities), `${key}: capabilities are required`);
    for (const capability of document.capabilities) {
      assert(model.registry.has(capability), `${key}: unknown capability ${capability}`);
    }
    assert(Array.isArray(document.assertions) && document.assertions.length > 0, `${key}: assertions are required`);
    if (document.result === "pass") {
      assert(document.assertions.every((entry) => entry.status === "pass"), `${key}: passing evidence has a failed assertion`);
    }
    evidenceByPath.set(key, document);
  }

  for (const [key, document] of evidenceByPath) {
    for (const related of document.relatedEvidence ?? []) {
      assert(evidenceByPath.has(related), `${key}: missing related evidence ${related}`);
    }
  }

  for (const profile of model.profiles.values()) {
    for (const [capability, record] of Object.entries(profile.capabilities)) {
      if (record.evidence === null) continue;
      const evidence = evidenceByPath.get(record.evidence);
      assert(evidence, `${profile.id}.${capability}: missing evidence ${record.evidence}`);
      assert(evidence.profile === profile.id, `${profile.id}.${capability}: evidence belongs to ${evidence.profile}`);
      assert(evidence.result === "pass", `${profile.id}.${capability}: capability cites non-passing evidence`);
      assert(evidence.capabilities.includes(capability), `${profile.id}.${capability}: evidence omits capability`);
    }
  }
}

export async function validate(root = repoRoot) {
  const model = await loadModel(root);
  for (const adapter of model.adapters) {
    await validateRenderedTarget(join(root, adapter.packageDir), adapter, model);
  }
  await validateJsonDocuments(root);
  await validateRuntimeEvidence(root, model);
  await validateLocalMarkdownLinks(root);
  await validateExecutableInventory(root);
  return model;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  validate().then((model) => {
    console.log(`Validated ${model.adapters.length} targets, ${model.profiles.size} profiles, and ${model.skills.length} Skill.`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
