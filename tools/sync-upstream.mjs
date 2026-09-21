#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseSkillFrontmatter,
  repoRoot,
  validateCoreText,
} from "./generate.mjs";

const toolPath = fileURLToPath(import.meta.url);

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

function portablePath(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label}: path is required`);
  assert(!isAbsolute(value), `${label}: absolute paths are forbidden`);
  const parts = value.split("/");
  assert(parts.every((part) => part && part !== "." && part !== ".."), `${label}: unsafe path`);
  return parts.join("/");
}

function inside(root, path, label) {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(root, path);
  assert(
    resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`),
    `${label}: path escapes root`,
  );
  return resolvedPath;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function isBinaryContent(value) {
  return Buffer.isBuffer(value) && value.includes(0);
}

function yamlValue(raw) {
  const value = raw.trim();
  if (value === "null") return null;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function readSourceRecord(text, sourceId) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === `  - id: ${sourceId}`);
  assert(start >= 0, `upstream/sources.yaml: missing source ${sourceId}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("  - id: ")) {
      end = index;
      break;
    }
  }
  const fields = { id: sourceId };
  for (const line of lines.slice(start + 1, end)) {
    const match = line.match(/^    ([a-z_]+):\s*(.*)$/);
    if (match) fields[match[1]] = yamlValue(match[2]);
  }
  return { fields, lines, start, end };
}

export function updateSourceRecord(text, sourceId, updates) {
  const { lines, start, end } = readSourceRecord(text, sourceId);
  for (const [field, value] of Object.entries(updates)) {
    const prefix = `    ${field}:`;
    const index = lines.slice(start + 1, end).findIndex((line) => line.startsWith(prefix));
    assert(index >= 0, `upstream/sources.yaml: source ${sourceId} omits ${field}`);
    lines[start + 1 + index] = `${prefix} ${value === null ? "null" : value}`;
  }
  return lines.join("\n");
}

function git(checkout, args) {
  const result = spawnSync("git", ["-C", checkout, ...args], { encoding: "utf8" });
  assert(result.status === 0, `git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function normalizedSkillMetadata(name) {
  return `${JSON.stringify({
    $schema: "../../../schemas/skill.schema.json",
    schemaVersion: 1,
    name,
    invocation: "explicit",
    deliveryTarget: "D3",
    workflowTarget: "W1",
    requires: [],
    fallbacks: {},
  }, null, 2)}\n`;
}

export function transformPortableSkill(raw, context = "upstream Skill") {
  assert(!isBinaryContent(raw), `${context}: binary Skill content is unsupported`);
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert(match, `${context}: missing YAML frontmatter`);
  const parsed = parseSkillFrontmatter(text, context);
  const keys = match[1].split("\n").map((line) => line.match(/^([a-z][a-z0-9_-]*):/)?.[1]);
  assert(keys.every((key) => ["name", "description", "disable-model-invocation"].includes(key)), `${context}: unsupported frontmatter field`);
  assert(
    match[1].split("\n").some((line) => line === "disable-model-invocation: true"),
    `${context}: expected explicit-invocation source policy`,
  );
  const transformed = [
    "---",
    `name: ${parsed.name}`,
    `description: ${JSON.stringify(parsed.description)}`,
    "---",
    match[2].trim(),
    "",
  ].join("\n");
  validateCoreText(context, transformed);
  return transformed;
}

export async function mergeText({ base, local, candidate, path = "file" }) {
  if (local === base) return { status: "clean-update", text: candidate };
  if (candidate === base) return { status: "local-fork", text: local };
  if (local === candidate) return { status: "already-current", text: local };

  const directory = await mkdtemp(join(tmpdir(), "oh-my-stack-merge-"));
  try {
    const localPath = join(directory, "local");
    const basePath = join(directory, "base");
    const candidatePath = join(directory, "candidate");
    await Promise.all([
      writeFile(localPath, local),
      writeFile(basePath, base),
      writeFile(candidatePath, candidate),
    ]);
    const result = spawnSync(
      "git",
      ["merge-file", "-p", "-L", `${path}:local`, "-L", `${path}:base`, "-L", `${path}:upstream`, localPath, basePath, candidatePath],
      { encoding: "utf8" },
    );
    if (result.status === 0) return { status: "merged", text: result.stdout };
    if (result.status === 1) return { status: "conflict", text: result.stdout };
    throw new Error(`git merge-file failed for ${path}: ${(result.stderr || result.stdout).trim()}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function classifyDeletion({ base, local }) {
  if (local === null) return { status: "already-deleted" };
  if (isBinaryContent(base) || isBinaryContent(local)) {
    return { status: "conflict", type: "binary" };
  }
  if (local.toString("utf8") === base.toString("utf8")) return { status: "deleted" };
  return { status: "conflict", type: "delete-modified" };
}

function sourceSnapshotPath(config, commit, upstreamPath) {
  return `upstream/snapshots/${config.sourceId}/${commit}/${config.sourceRoot}/${upstreamPath}`;
}

async function readOptional(path) {
  return (await exists(path)) ? readFile(path) : null;
}

async function readRegularFile(path, label) {
  const stat = await lstat(path);
  assert(stat.isFile() && !stat.isSymbolicLink(), `${label}: expected a regular non-symlink file`);
  return readFile(path);
}

function addWrite(plan, path, content) {
  const value = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const previous = plan.writes.get(path);
  assert(!previous || previous.equals(value), `${path}: conflicting planned writes`);
  plan.writes.set(path, value);
}

function addConflict(plan, type, path, detail) {
  plan.conflicts.push({ type, path, detail });
}

function renderOwnership(config, commit, outcomes) {
  const active = new Set(
    outcomes
      .filter((outcome) => !["deleted", "already-deleted"].includes(outcome.status))
      .map((outcome) => outcome.path),
  );
  const lines = ["schema_version: 1", "entries:"];
  for (const entry of config.entries.filter((candidate) => active.has(candidate.target))) {
    lines.push(
      `  - path: ${entry.target}`,
      "    owner: upstream-derived",
      `    source_id: ${config.sourceId}`,
      `    source_path: ${config.sourceRoot}/${entry.upstreamPath}`,
      `    source_revision: ${commit}`,
      "    license: MIT",
      `    transform: ${entry.transform}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderPatchRecord(config, oldCommit, newCommit, outcomes) {
  return `${JSON.stringify({
    schemaVersion: 1,
    sourceId: config.sourceId,
    oldCommit,
    newCommit,
    transform: "portable-explicit-skill",
    outcomes,
  }, null, 2)}\n`;
}

export async function planSync({ root = repoRoot, sourceCheckout }) {
  assert(sourceCheckout, "--source is required for sync planning");
  const config = JSON.parse(await readFile(join(root, "upstream/imports.json"), "utf8"));
  assert(config.schemaVersion === 1, "upstream/imports.json: unsupported schemaVersion");
  assert(Array.isArray(config.entries) && config.entries.length > 0, "upstream/imports.json: entries are required");
  portablePath(config.sourceRoot, "sourceRoot");
  portablePath(config.licensePath, "licensePath");
  const targetSet = new Set();
  const upstreamSet = new Set();
  for (const entry of config.entries) {
    portablePath(entry.upstreamPath, `${entry.target}.upstreamPath`);
    portablePath(entry.target, `${entry.upstreamPath}.target`);
    assert(entry.target.startsWith("src/core/skills/"), `${entry.target}: target must be under src/core/skills`);
    assert(entry.transform === "portable-explicit-skill", `${entry.target}: unknown transform`);
    assert(!targetSet.has(entry.target), `${entry.target}: duplicate target`);
    assert(!upstreamSet.has(entry.upstreamPath), `${entry.upstreamPath}: duplicate source path`);
    targetSet.add(entry.target);
    upstreamSet.add(entry.upstreamPath);
  }

  const sourceText = await readFile(join(root, "upstream/sources.yaml"), "utf8");
  const record = readSourceRecord(sourceText, config.sourceId).fields;
  const commit = git(sourceCheckout, ["rev-parse", "HEAD"]);
  assert(/^[0-9a-f]{40}$/.test(commit), `invalid candidate commit ${commit}`);
  assert(!record.candidate_commit || record.candidate_commit === commit, `pending candidate ${record.candidate_commit} differs from ${commit}`);

  const plan = {
    sourceId: config.sourceId,
    oldCommit: record.baseline_commit,
    candidateCommit: commit,
    writes: new Map(),
    deletes: new Set(),
    conflicts: [],
    outcomes: [],
  };

  const sourceRoot = inside(sourceCheckout, config.sourceRoot, "source checkout");
  const licenseSource = inside(sourceRoot, config.licensePath, "license source");
  const license = await readRegularFile(licenseSource, "upstream license");
  const licenseSnapshot = sourceSnapshotPath(config, commit, config.licensePath);
  const existingLicense = await readOptional(join(root, licenseSnapshot));
  if (existingLicense && !existingLicense.equals(license)) {
    addConflict(plan, "immutable-snapshot", licenseSnapshot, "existing snapshot differs from candidate license");
  } else if (!existingLicense) {
    addWrite(plan, licenseSnapshot, license);
  }

  for (const entry of config.entries) {
    const sourcePath = inside(sourceRoot, entry.upstreamPath, entry.upstreamPath);
    const targetPath = inside(root, entry.target, entry.target);
    const metadataRelative = `${dirname(entry.target)}/skill.json`;
    const metadataPath = inside(root, metadataRelative, metadataRelative);
    const candidateRaw = (await exists(sourcePath))
      ? await readRegularFile(sourcePath, entry.upstreamPath)
      : null;
    const localRaw = await readOptional(targetPath);
    const snapshotRelative = sourceSnapshotPath(config, commit, entry.upstreamPath);

    if (candidateRaw === null) {
      if (!record.baseline_commit) {
        addConflict(plan, "missing-candidate", entry.upstreamPath, "selected source file does not exist");
        continue;
      }
      const oldSnapshot = join(root, sourceSnapshotPath(config, record.baseline_commit, entry.upstreamPath));
      const oldRaw = await readOptional(oldSnapshot);
      if (!oldRaw) {
        addConflict(plan, "missing-baseline", entry.target, "baseline snapshot does not exist");
        continue;
      }
      if (isBinaryContent(oldRaw) || isBinaryContent(localRaw)) {
        addConflict(plan, "binary", entry.target, "deletion merge supports text only");
        continue;
      }
      const oldText = transformPortableSkill(oldRaw, `${entry.target}:baseline`);
      const deletion = classifyDeletion({ base: Buffer.from(oldText), local: localRaw });
      if (deletion.status === "already-deleted") {
        plan.outcomes.push({ path: entry.target, status: deletion.status });
        continue;
      }
      if (deletion.status === "conflict") {
        addConflict(plan, deletion.type, entry.target, "upstream deleted a locally modified or binary file");
        continue;
      }
      plan.deletes.add(entry.target);
      plan.deletes.add(metadataRelative);
      plan.outcomes.push({ path: entry.target, status: "deleted" });
      continue;
    }

    if (isBinaryContent(candidateRaw)) {
      addConflict(plan, "binary", entry.upstreamPath, "binary imports require an explicit strategy");
      continue;
    }
    const existingSnapshot = await readOptional(join(root, snapshotRelative));
    if (existingSnapshot && !existingSnapshot.equals(candidateRaw)) {
      addConflict(plan, "immutable-snapshot", snapshotRelative, "existing snapshot differs from candidate");
      continue;
    }
    if (!existingSnapshot) addWrite(plan, snapshotRelative, candidateRaw);

    let candidateText;
    try {
      candidateText = transformPortableSkill(candidateRaw, `${entry.target}:candidate`);
    } catch (error) {
      addConflict(plan, "transform", entry.target, error.message);
      continue;
    }

    let nextText = candidateText;
    let status = "imported";
    if (record.baseline_commit) {
      const oldSnapshot = join(root, sourceSnapshotPath(config, record.baseline_commit, entry.upstreamPath));
      const oldRaw = await readOptional(oldSnapshot);
      if (!oldRaw && record.baseline_commit === commit) {
        if (localRaw && localRaw.toString("utf8") !== candidateText) {
          addConflict(plan, "untracked-local", entry.target, "new pinned entry would overwrite an existing file");
          continue;
        }
        status = localRaw ? "already-current" : "imported";
      } else if (!oldRaw) {
        addConflict(plan, "missing-baseline", entry.target, "baseline snapshot does not exist");
        continue;
      } else if (!localRaw) {
        addConflict(plan, "local-deletion", entry.target, "local file is missing while upstream still selects it");
        continue;
      } else if (isBinaryContent(oldRaw) || isBinaryContent(localRaw)) {
        addConflict(plan, "binary", entry.target, "three-way merge supports text only");
        continue;
      } else {
        const baseText = transformPortableSkill(oldRaw, `${entry.target}:baseline`);
        const merged = await mergeText({
          base: baseText,
          local: localRaw.toString("utf8"),
          candidate: candidateText,
          path: entry.target,
        });
        if (merged.status === "conflict") {
          addConflict(plan, "content", entry.target, "overlapping local and upstream edits");
          continue;
        }
        nextText = merged.text;
        status = merged.status;
      }
    } else if (localRaw && localRaw.toString("utf8") !== candidateText) {
      addConflict(plan, "untracked-local", entry.target, "initial import would overwrite an existing file");
      continue;
    } else if (localRaw) {
      status = "already-current";
    }

    try {
      validateCoreText(entry.target, nextText);
    } catch (error) {
      addConflict(plan, "denylist", entry.target, error.message);
      continue;
    }
    if (!localRaw || localRaw.toString("utf8") !== nextText) addWrite(plan, entry.target, nextText);

    const expectedMetadata = normalizedSkillMetadata(basename(dirname(entry.target)));
    const currentMetadata = await readOptional(metadataPath);
    if (currentMetadata && currentMetadata.toString("utf8") !== expectedMetadata) {
      addConflict(plan, "metadata-modified", metadataRelative, "generated import metadata has local changes");
      continue;
    }
    if (!currentMetadata) addWrite(plan, metadataRelative, expectedMetadata);
    plan.outcomes.push({
      path: entry.target,
      status,
      sourceSha256: sha256(candidateRaw),
      resultSha256: sha256(nextText),
    });
  }

  const hasContentChanges = plan.writes.size > 0 || plan.deletes.size > 0;
  if (plan.conflicts.length === 0 && hasContentChanges) {
    addWrite(plan, "upstream/ownership.yaml", renderOwnership(config, commit, plan.outcomes));
    const transition = record.baseline_commit === commit
      ? `${commit}-extend-${sha256(JSON.stringify(plan.outcomes)).slice(0, 12)}`
      : `${record.baseline_commit ?? "bootstrap"}-to-${commit}`;
    const patchName = `${transition}.json`;
    addWrite(
      plan,
      `upstream/patches/${config.sourceId}/${patchName}`,
      renderPatchRecord(config, record.baseline_commit, commit, plan.outcomes),
    );
    addWrite(
      plan,
      "upstream/sources.yaml",
      updateSourceRecord(sourceText, config.sourceId, {
        inspected_commit: commit,
        candidate_commit: commit,
      }),
    );
  }
  return plan;
}

export function summarizePlan(plan) {
  return {
    sourceId: plan.sourceId,
    oldCommit: plan.oldCommit,
    candidateCommit: plan.candidateCommit,
    writes: [...plan.writes.keys()].sort(),
    deletes: [...plan.deletes].sort(),
    outcomes: plan.outcomes,
    conflicts: plan.conflicts,
  };
}

export async function applyPlan(root, plan) {
  assert(plan.conflicts.length === 0, `sync has ${plan.conflicts.length} conflict(s)`);
  const mutations = [
    ...[...plan.writes.entries()]
      .filter(([path]) => path !== "upstream/sources.yaml")
      .map(([path, value]) => ({ path, value, remove: false })),
    ...[...plan.deletes].map((path) => ({ path, value: null, remove: true })),
    ...[...plan.writes.entries()]
      .filter(([path]) => path === "upstream/sources.yaml")
      .map(([path, value]) => ({ path, value, remove: false })),
  ];
  const backups = [];
  try {
    for (const mutation of mutations) {
      const target = inside(root, mutation.path, mutation.path);
      const previous = await readOptional(target);
      backups.push({ target, previous });
      if (mutation.remove) {
        await rm(target, { force: true });
        continue;
      }
      await mkdir(dirname(target), { recursive: true });
      const temporary = join(dirname(target), `.${basename(target)}.oms-tmp-${process.pid}`);
      await writeFile(temporary, mutation.value);
      await rename(temporary, target);
    }
  } catch (error) {
    for (const backup of backups.reverse()) {
      if (backup.previous === null) await rm(backup.target, { force: true });
      else {
        await mkdir(dirname(backup.target), { recursive: true });
        await writeFile(backup.target, backup.previous);
      }
    }
    throw error;
  }
}

export async function acceptCandidate(root = repoRoot, { runChecks = true, checkRunner = null } = {}) {
  const config = JSON.parse(await readFile(join(root, "upstream/imports.json"), "utf8"));
  const sourcePath = join(root, "upstream/sources.yaml");
  const sourceText = await readFile(sourcePath, "utf8");
  const record = readSourceRecord(sourceText, config.sourceId).fields;
  assert(record.candidate_commit, `source ${config.sourceId} has no candidate commit`);
  if (runChecks) {
    if (checkRunner) await checkRunner(root);
    else {
      const result = spawnSync("npm", ["run", "check"], { cwd: root, encoding: "utf8", stdio: "inherit" });
      assert(result.status === 0, "candidate verification failed; baseline pin was not advanced");
    }
  }
  const accepted = updateSourceRecord(sourceText, config.sourceId, {
    candidate_commit: null,
    baseline_commit: record.candidate_commit,
    verified_commit: record.candidate_commit,
  });
  const plan = { conflicts: [], writes: new Map([["upstream/sources.yaml", Buffer.from(accepted)]]), deletes: new Set() };
  await applyPlan(root, plan);
  return record.candidate_commit;
}

function parseArguments(argv) {
  const options = { apply: false, accept: false, sourceCheckout: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--accept") options.accept = true;
    else if (argument === "--source") options.sourceCheckout = argv[++index];
    else throw new Error(`unknown argument ${argument}`);
  }
  assert(!(options.apply && options.accept), "--apply and --accept are mutually exclusive");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.accept) {
    const commit = await acceptCandidate();
    console.log(`Accepted ${commit} as the verified cursor-pstack baseline.`);
    return;
  }
  const plan = await planSync({ sourceCheckout: options.sourceCheckout });
  console.log(JSON.stringify(summarizePlan(plan), null, 2));
  if (plan.conflicts.length > 0) {
    process.exitCode = 2;
    return;
  }
  if (options.apply) {
    await applyPlan(repoRoot, plan);
    console.log(`Applied candidate ${plan.candidateCommit}; run generation and --accept after verification.`);
  }
}

if (resolve(process.argv[1] ?? "") === toolPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
