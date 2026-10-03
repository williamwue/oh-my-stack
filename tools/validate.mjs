#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  filesUnder,
  loadModel,
  readJson,
  repoRoot,
  validateRenderedTarget,
} from "./generate.mjs";
import { readSourceRecord, transformPortableSkill } from "./sync-upstream.mjs";

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

function within(root, candidate, allowRoot = false) {
  const difference = relative(root, candidate);
  return (allowRoot || difference !== "")
    && difference !== ".." && !difference.startsWith(`..${sep}`) && !isAbsolute(difference);
}

function manifestFile(root, input, context) {
  assert(typeof input === "string" && input.length > 0, `${context}: invalid path`);
  assert(!/[\0\\:]/.test(input) && !input.startsWith("/")
    && input.split("/").every((part) => part && part !== "." && part !== ".."),
  `${context}: unsafe path ${input}`);
  const path = resolve(root, input);
  assert(within(root, path), `${context}: path escapes repository: ${input}`);
  return path;
}

function validationFiles(root, directory, { excludeSnapshots = false } = {}) {
  const scratch = join(root, ".tmp");
  const snapshots = join(root, "upstream", "snapshots");
  const sourceModel = join(root, "src");
  return filesUnder(directory, {
    excludeDirectory: (path) => {
      if (["node_modules", ".git"].includes(basename(path)) && within(sourceModel, path)) {
        throw new Error(`${relative(root, path)}: nested dependency or metadata directory inside the source model is unsupported`);
      }
      return path === scratch || (excludeSnapshots && path === snapshots)
        || basename(path) === "node_modules" || basename(path) === ".git";
    },
  });
}

export async function validateLocalMarkdownLinks(root) {
  // Immutable third-party snapshots contain upstream links and template URLs.
  // Validate their integrity through provenance hashes, not local link resolution.
  const markdownFiles = (await validationFiles(root, root, { excludeSnapshots: true }))
    .filter((path) => path.endsWith(".md"));
  for (const path of markdownFiles) {
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(?:https?:\/\/|mailto:|#)/.test(target)) continue;
      const fileTarget = target.replace(/#.*$/, "");
      if (!fileTarget) continue;
      let decoded;
      try { decoded = decodeURIComponent(fileTarget); }
      catch { throw new Error(`${relative(root, path)}: malformed local link ${target}`); }
      const resolved = resolve(dirname(path), decoded);
      assert(within(root, resolved, true), `${relative(root, path)}: link escapes repository`);
      assert(await exists(resolved), `${relative(root, path)}: missing local link ${target}`);
    }
  }
}

export async function validateExecutableInventory(root) {
  const inventory = await readJson(join(root, "security", "executables.json"));
  assert(inventory.schemaVersion === 1, "security/executables.json: schemaVersion must be 1");
  const seen = new Set();
  for (const entry of inventory.entries) {
    const path = manifestFile(root, entry.path, `executable ${entry.path}`);
    assert(!seen.has(path), `duplicate executable inventory entry ${entry.path}`);
    seen.add(path);
    assert(await exists(path), `missing executable ${entry.path}`);
    assert(typeof entry.network === "boolean", `${entry.path}: network must be explicit`);
    assert(Array.isArray(entry.writes), `${entry.path}: writes must be an array`);
    assert(entry.owner && entry.purpose && entry.uninstallBehavior, `${entry.path}: incomplete inventory entry`);
  }
  const executableRoots = [join(root, "tools"), join(root, "src", "core", "skills")];
  for (const executableRoot of executableRoots) {
    for (const path of await validationFiles(root, executableRoot)) {
      const key = relative(root, path);
      const isTool = within(join(root, "tools"), path) && path.endsWith(".mjs");
      const isSkillScript = relative(join(root, "src", "core", "skills"), path)
        .split(sep).includes("scripts") && /\.(?:mjs|sh)$/.test(path);
      if (!isTool && !isSkillScript) continue;
      assert(seen.has(path), `${key}: executable is missing from security inventory`);
    }
  }
}

export async function validateSemanticDerivations(root) {
  const manifest = await readJson(join(root, "upstream", "semantic-derivations.json"));
  assert(manifest.schemaVersion === 1, "upstream/semantic-derivations.json: schemaVersion must be 1");
  assert(Array.isArray(manifest.entries), "upstream/semantic-derivations.json: entries are required");
  const sourcesText = await readFile(join(root, "upstream", "sources.yaml"), "utf8");
  const ids = new Set();
  const outputs = new Set();
  for (const entry of manifest.entries) {
    assert(entry.id && !ids.has(entry.id), `duplicate semantic derivation ${entry.id}`);
    ids.add(entry.id);
    const source = readSourceRecord(sourcesText, entry.sourceId).fields;
    assert(
      [source.baseline_commit, source.verified_commit].includes(entry.sourceRevision),
      `${entry.id}: source revision is not an accepted baseline for ${entry.sourceId}`,
    );
    assert(entry.transformation, `${entry.id}: transformation rationale is required`);
    assert(Array.isArray(entry.sourceFiles) && entry.sourceFiles.length > 0, `${entry.id}: sourceFiles are required`);
    assert(Array.isArray(entry.outputFiles) && entry.outputFiles.length > 0, `${entry.id}: outputFiles are required`);
    const snapshotRoot = manifestFile(root,
      `upstream/snapshots/${entry.sourceId}/${entry.sourceRevision}`,
      `${entry.id}: snapshot root`);
    const coreRoot = join(root, "src", "core");
    for (const file of entry.sourceFiles) {
      const path = manifestFile(root, file.path, `${entry.id}: source`);
      assert(within(snapshotRoot, path), `${entry.id}: source is outside its immutable snapshot`);
    }
    for (const file of entry.outputFiles) {
      const path = manifestFile(root, file.path, `${entry.id}: output`);
      assert(within(coreRoot, path), `${entry.id}: derived output must be under src/core`);
    }
    for (const file of [...entry.sourceFiles, ...entry.outputFiles]) {
      const resolved = manifestFile(root, file.path, `${entry.id}: derivation file`);
      assert(await exists(resolved), `${entry.id}: missing derivation file ${file.path}`);
      assert(sha256(await readFile(resolved)) === file.sha256, `${entry.id}: hash drift in ${file.path}`);
    }
    for (const file of entry.outputFiles) {
      assert(["derived", "local-core"].includes(file.owner), `${entry.id}: invalid owner for ${file.path}`);
      const path = manifestFile(root, file.path, `${entry.id}: output`);
      assert(!outputs.has(path), `${file.path}: owned by multiple semantic derivations`);
      outputs.add(path);
    }
  }
}

async function validateJsonDocuments(root) {
  const roots = ["src", "packages", "evals", "security"];
  for (const directory of roots) {
    for (const path of await validationFiles(root, join(root, directory))) {
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

// Dated evidence is immutable. These exact documents also have narrowly scoped
// Markdown style overrides; hash drift requires explicit provenance review.
const historicalEvidence = new Map([
  ["docs/operations/cloud-management-acceptance-2026-10-01.md",
    "b05a97a10e579751b187d5e5d06e7150841aea9f85e4c994931594ec101dcce8"],
  ["docs/omp-18.2.9-live-test-plan.md",
    "17c558f6a5ccb28c6c2434b1877bb94ea9151d7f7339cc5c2160a4be7876b7ac"],
]);

export async function validatePublicHygiene(root) {
  const roots = [
    ".github",
    "docs",
    "evals",
    "security",
    "src",
    "tests",
    "tools",
    "upstream",
  ];
  const paths = [];
  for (const directory of roots) paths.push(...await validationFiles(root, join(root, directory)));
  for (const name of [
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "package.json",
    "package-lock.json",
  ]) {
    paths.push(join(root, name));
  }

  for (const path of paths) {
    const key = relative(root, path);
    assert(!/\.env(?:\.|$)|\.(?:jsonl|sqlite3?|db|pem|key)$/.test(key), `${key}: private runtime or credential file cannot be published`);
    if (!/\.(?:c?js|json|md|mjs|toml|txt|ya?ml)$/.test(path) && basename(path) !== "LICENSE") continue;
    const bytes = await readFile(path);
    const text = bytes.toString("utf8");
    const historicalHash = historicalEvidence.get(key.split(sep).join("/"));
    if (historicalHash) assert(sha256(bytes) === historicalHash, `${key}: historical evidence hash drift`);
    const macHomePrefix = ["", "Users", ""].join("/");
    // Third-party source is retained byte-for-byte for provenance, including
    // its path examples. It is not part of a generated user-facing Skill.
    if (!historicalHash && !within(join(root, "upstream", "snapshots"), path)) {
      assert(!text.includes(macHomePrefix), `${key}: contains an absolute macOS home path`);
    }
    assert(!/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(text), `${key}: contains a private key`);
    assert(!/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/.test(text), `${key}: contains a GitHub token-shaped value`);
    assert(!/\bsk-[A-Za-z0-9_-]{20,}\b/.test(text), `${key}: contains a secret-key-shaped value`);
  }
}

export async function validateRuntimeEvidence(root, model) {
  const evidenceByPath = new Map();
  const evidenceRoot = join(root, "evals", "evidence");
  for (const path of await validationFiles(root, evidenceRoot)) {
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
    evidenceByPath.set(path, document);
  }

  for (const [evidencePath, document] of evidenceByPath) {
    const key = relative(root, evidencePath);
    for (const related of document.relatedEvidence ?? []) {
      const path = manifestFile(root, related, `${key}: related evidence`);
      assert(within(evidenceRoot, path), `${key}: related evidence is outside evals/evidence`);
      assert(evidenceByPath.has(path), `${key}: missing related evidence ${related}`);
    }
  }

  for (const profile of model.profiles.values()) {
    for (const [capability, record] of Object.entries(profile.capabilities)) {
      if (record.evidence === null) continue;
      const path = manifestFile(root, record.evidence, `${profile.id}.${capability}: evidence`);
      assert(within(evidenceRoot, path), `${profile.id}.${capability}: evidence is outside evals/evidence`);
      const evidence = evidenceByPath.get(path);
      assert(evidence, `${profile.id}.${capability}: missing evidence ${record.evidence}`);
      assert(evidence.profile === profile.id, `${profile.id}.${capability}: evidence belongs to ${evidence.profile}`);
      if (record.status === "unsupported") {
        assert(evidence.result === "fail", `${profile.id}.${capability}: unsupported capability must cite failing evidence`);
      } else {
        assert(evidence.result === "pass", `${profile.id}.${capability}: supported capability cites non-passing evidence`);
      }
      assert(evidence.capabilities.includes(capability), `${profile.id}.${capability}: evidence omits capability`);
    }
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function validateUpstreamState(root) {
  const config = await readJson(join(root, "upstream/imports.json"));
  assert(config.schemaVersion === 1, "upstream/imports.json: schemaVersion must be 1");
  const sourcesText = await readFile(join(root, "upstream/sources.yaml"), "utf8");
  const source = readSourceRecord(sourcesText, config.sourceId).fields;
  const revision = source.candidate_commit ?? source.verified_commit;
  assert(revision && /^[0-9a-f]{40}$/.test(revision), `${config.sourceId}: candidate or verified revision is required`);
  if (!source.candidate_commit) {
    assert(source.baseline_commit === source.verified_commit, `${config.sourceId}: baseline and verified revisions differ`);
  }

  const sourceSnapshotRoot = manifestFile(root,
    `upstream/snapshots/${config.sourceId}/${revision}`,
    `${config.sourceId}: snapshot root`);
  const sourceRoot = manifestFile(sourceSnapshotRoot, config.sourceRoot, `${config.sourceId}: sourceRoot`);
  const coreRoot = join(root, "src", "core");
  const entries = config.entries.map((entry) => {
    const target = manifestFile(root, entry.target, `${config.sourceId}: target`);
    assert(within(coreRoot, target), `${entry.target}: imported target is outside src/core`);
    const snapshot = manifestFile(sourceRoot, entry.upstreamPath, `${entry.target}: upstreamPath`);
    return { entry, target, snapshot };
  });
  const patchRoot = manifestFile(root, `upstream/patches/${config.sourceId}`, `${config.sourceId}: patch root`);
  const patchFiles = (await validationFiles(root, patchRoot))
    .filter((path) => path.endsWith(".json"));
  const patches = await Promise.all(patchFiles.map((path) => readJson(path)));
  const targets = new Set(entries.map(({ target }) => target));
  const matching = patches.filter(
    (patch) => patch.newCommit === revision
      && targets.size === new Set(patch.outcomes.map((outcome) =>
        manifestFile(root, outcome.path, `${config.sourceId}: patch outcome`))).size
      && patch.outcomes.every((outcome) => targets.has(
        manifestFile(root, outcome.path, `${config.sourceId}: patch outcome`))),
  );
  assert(matching.length === 1, `${config.sourceId}: expected one complete patch record for ${revision}`);
  const patch = matching[0];
  const outcomes = new Map(patch.outcomes.map((outcome) => [
    manifestFile(root, outcome.path, `${config.sourceId}: patch outcome`), outcome,
  ]));
  const ownership = await readFile(join(root, "upstream/ownership.yaml"), "utf8");

  const licenseSnapshot = manifestFile(sourceRoot, config.licensePath, `${config.sourceId}: licensePath`);
  assert(within(sourceRoot, licenseSnapshot), `${config.sourceId}: license is outside source root`);
  assert(await exists(licenseSnapshot), `${config.sourceId}: missing license snapshot for ${revision}`);

  for (const { entry, target, snapshot } of entries) {
    const outcome = outcomes.get(target);
    assert(outcome, `${entry.target}: missing patch outcome for ${revision}`);
    if (["deleted", "already-deleted"].includes(outcome.status)) {
      assert(!(await exists(target)), `${entry.target}: deleted upstream entry still exists`);
      continue;
    }
    assert(await exists(snapshot), `${entry.target}: missing immutable source snapshot`);
    const sourceRaw = await readFile(snapshot);
    assert(sha256(sourceRaw) === outcome.sourceSha256, `${entry.target}: source snapshot hash drift`);
    transformPortableSkill(sourceRaw, `${entry.target}:snapshot`);
    assert(await exists(target), `${entry.target}: imported target is missing`);
    const current = await readFile(target);
    assert(sha256(current) === outcome.resultSha256, `${entry.target}: imported result lacks a patch record`);
    const metadata = await readJson(join(dirname(target), "skill.json"));
    assert(metadata.name === basename(dirname(target)), `${entry.target}: metadata name drift`);
    assert(metadata.invocation === "explicit", `${entry.target}: invocation policy drift`);
    const ownershipMarker = [
      `  - path: ${entry.target}`,
      "    owner: upstream-derived",
      `    source_id: ${config.sourceId}`,
      `    source_path: ${config.sourceRoot}/${entry.upstreamPath}`,
      `    source_revision: ${revision}`,
    ].join("\n");
    assert(ownership.includes(ownershipMarker), `${entry.target}: missing or stale ownership entry`);
  }

  const notices = await readFile(join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
  assert(notices.includes(revision), `${config.sourceId}: third-party notice omits active revision`);
}

export async function validate(root = repoRoot) {
  // Keep dependencies out of the source model before loading or packaging it.
  await validationFiles(root, join(root, "src"));
  const model = await loadModel(root);
  for (const adapter of model.adapters) {
    await validateRenderedTarget(join(root, adapter.packageDir), adapter, model);
  }
  await validateJsonDocuments(root);
  await validateRuntimeEvidence(root, model);
  await validateUpstreamState(root);
  await validateSemanticDerivations(root);
  await validateLocalMarkdownLinks(root);
  await validateExecutableInventory(root);
  await validatePublicHygiene(root);
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
