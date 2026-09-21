#!/usr/bin/env node

import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const forbiddenCorePatterns = [
  { label: "runtime name OMP", pattern: /\bOMP\b/i },
  { label: "runtime name Codex", pattern: /\bCodex\b/i },
  { label: "runtime name Claude Code", pattern: /\bClaude Code\b/i },
  { label: "runtime path .omp", pattern: /\.omp(?:\b|\/)/i },
  { label: "runtime path .codex", pattern: /\.codex(?:\b|\/)/i },
  { label: "runtime path .claude", pattern: /\.claude(?:\b|\/)/i },
  { label: "spawn_agent tool", pattern: /\bspawn_agent\b/ },
  { label: "Agent tool", pattern: /\bAgent\b/ },
  { label: "agent resource URI", pattern: /agent:\/\//i },
  { label: "history resource URI", pattern: /history:\/\//i },
  { label: "skill resource URI", pattern: /skill:\/\//i },
  { label: "Claude plugin root", pattern: /CLAUDE_PLUGIN_ROOT/ },
  { label: "source-host field", pattern: /\bsubagent_type\b/ },
];

const capabilityStatuses = new Set([
  "native",
  "extension",
  "external",
  "fallback",
  "unsupported",
  "unknown",
]);

const adapterIds = ["omp", "codex", "claude-code"];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value.endsWith("\n") ? value : `${value}\n`);
}

export async function filesUnder(directory) {
  if (!(await exists(directory))) return [];
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else files.push(path);
    }
  }
  await walk(directory);
  return files.sort();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertKeys(value, allowed, context) {
  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${context}: unsupported key ${key}`);
  }
}

function semver(value) {
  return /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/.test(value);
}

export function parseSkillFrontmatter(text, context = "SKILL.md") {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert(match, `${context}: missing YAML frontmatter`);
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-z][a-z0-9_-]*):\s*(.+)$/);
    assert(field, `${context}: unsupported frontmatter line ${JSON.stringify(line)}`);
    frontmatter[field[1]] = field[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  assert(frontmatter.name, `${context}: missing name`);
  assert(frontmatter.description, `${context}: missing description`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(frontmatter.name), `${context}: invalid skill name`);
  assert(frontmatter.description.length <= 1024, `${context}: description exceeds 1024 characters`);
  return frontmatter;
}

export function validateCoreText(path, text) {
  for (const rule of forbiddenCorePatterns) {
    const match = text.match(rule.pattern);
    if (!match) continue;
    const line = text.slice(0, match.index).split("\n").length;
    throw new Error(`${path}:${line}: portable core contains ${rule.label}`);
  }
}

function validateProject(project) {
  assertKeys(
    project,
    new Set(["$schema", "schemaVersion", "name", "displayName", "version", "description"]),
    "project",
  );
  assert(project.schemaVersion === 1, "project: schemaVersion must be 1");
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.name), "project: invalid name");
  assert(semver(project.version), "project: version must be strict semver");
  assert(project.displayName && project.description, "project: displayName and description are required");
}

function validateSkillMetadata(skill, registry, path) {
  assertKeys(
    skill,
    new Set(["$schema", "schemaVersion", "name", "invocation", "deliveryTarget", "workflowTarget", "requires", "fallbacks"]),
    path,
  );
  assert(skill.schemaVersion === 1, `${path}: schemaVersion must be 1`);
  assert(["automatic", "explicit"].includes(skill.invocation), `${path}: invalid invocation policy`);
  assert(/^D[0-3]$/.test(skill.deliveryTarget), `${path}: invalid delivery target`);
  assert(/^W[0-4]$/.test(skill.workflowTarget), `${path}: invalid workflow target`);
  assert(Array.isArray(skill.requires), `${path}: requires must be an array`);
  assert(new Set(skill.requires).size === skill.requires.length, `${path}: duplicate requirement`);
  for (const capability of skill.requires) {
    assert(registry.has(capability), `${path}: unknown capability ${capability}`);
  }
  for (const capability of Object.keys(skill.fallbacks ?? {})) {
    assert(skill.requires.includes(capability), `${path}: fallback for unrequired capability ${capability}`);
  }
}

function validateRoleMetadata(role, path) {
  assertKeys(
    role,
    new Set(["$schema", "schemaVersion", "name", "description", "workload", "constraints", "writes"]),
    path,
  );
  assert(role.schemaVersion === 1, `${path}: schemaVersion must be 1`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(role.name), `${path}: invalid role name`);
  assert(role.description, `${path}: description is required`);
  assert(["fast", "balanced", "deep"].includes(role.workload), `${path}: invalid workload`);
  assert(Array.isArray(role.constraints), `${path}: constraints must be an array`);
  assert(new Set(role.constraints).size === role.constraints.length, `${path}: duplicate constraint`);
  const allowedConstraints = new Set([
    "read_only",
    "independent_session",
    "reasoning_required",
    "model_diversity_preferred",
  ]);
  for (const constraint of role.constraints) {
    assert(allowedConstraints.has(constraint), `${path}: invalid constraint ${constraint}`);
  }
  assert(typeof role.writes === "boolean", `${path}: writes must be boolean`);
  assert(role.writes || role.constraints.includes("read_only"), `${path}: non-writing role must be read_only`);
}

function validateProfile(profile, registry, path) {
  assert(profile.schemaVersion === 1, `${path}: schemaVersion must be 1`);
  assert(profile.id && profile.target && profile.capabilities, `${path}: incomplete profile`);
  const requiredTargetKeys = [
    "runtime",
    "surface",
    "runtimeVersion",
    "platform",
    "configurationFingerprint",
    "permissionProfile",
  ];
  for (const key of requiredTargetKeys) assert(key in profile.target, `${path}: target.${key} is required`);
  assert(Array.isArray(profile.target.installedProviders), `${path}: installedProviders must be an array`);
  if (profile.verification) {
    assert(["active", "pending"].includes(profile.verification.status), `${path}: invalid verification status`);
    assert(profile.verification.reason, `${path}: verification reason is required`);
  }
  for (const [capability, record] of Object.entries(profile.capabilities)) {
    assert(registry.has(capability), `${path}: unknown capability ${capability}`);
    assert(capabilityStatuses.has(record.status), `${path}: invalid status for ${capability}`);
    assert("provider" in record && "evidence" in record, `${path}: incomplete ${capability} record`);
    if (record.status === "unknown") {
      assert(record.evidence === null, `${path}: unknown capability cannot cite pass evidence`);
    }
  }
}

function validateAdapter(adapter, project, profiles, path) {
  assertKeys(
    adapter,
    new Set([
      "$schema",
      "schemaVersion",
      "id",
      "packageDir",
      "skillsDir",
      "manifestPath",
      "portableManifestPath",
      "profiles",
      "manifest",
      "portableManifest",
    ]),
    path,
  );
  assert(adapter.schemaVersion === 1, `${path}: schemaVersion must be 1`);
  assert(adapterIds.includes(adapter.id), `${path}: invalid adapter id`);
  assert(adapter.packageDir === `packages/${adapter.id}`, `${path}: packageDir must match adapter id`);
  assert(adapter.skillsDir === "skills", `${path}: skillsDir must be skills`);
  assert(adapter.manifest.name === project.name, `${path}: manifest name must match project name`);
  assert(Array.isArray(adapter.profiles) && adapter.profiles.length > 0, `${path}: profiles are required`);
  for (const id of adapter.profiles) assert(profiles.has(id), `${path}: missing profile ${id}`);
  if (adapter.id === "codex") {
    assert(adapter.manifestPath === ".codex-plugin/plugin.json", `${path}: invalid Codex manifest path`);
    assert(adapter.portableManifestPath === "plugin.json", `${path}: invalid portable Codex manifest path`);
    assert(
      adapter.portableManifest?.$schema === "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      `${path}: portable Codex schema is required`,
    );
    assert(adapter.portableManifest.name === project.name, `${path}: portable manifest name must match project name`);
    assert(adapter.manifest.interface, `${path}: Codex interface metadata is required`);
    assert(!("hooks" in adapter.manifest), `${path}: unsupported Codex manifest field hooks`);
  }
  if (adapter.id === "claude-code") {
    assert(adapter.manifestPath === ".claude-plugin/plugin.json", `${path}: invalid Claude manifest path`);
  }
  if (adapter.id === "omp") {
    assert(adapter.manifestPath === "package.json", `${path}: invalid OMP manifest path`);
    assert(Array.isArray(adapter.manifest.omp?.skills), `${path}: OMP manifest must declare omp.skills`);
    assert(!("pi" in adapter.manifest), `${path}: use the native omp manifest key, not the legacy pi key`);
  }
}

export function validateRequirementSupport(skill, profiles) {
  for (const profile of profiles) {
    for (const capability of skill.metadata.requires) {
      const record = profile.capabilities[capability];
      assert(record, `${skill.metadata.name}: profile ${profile.id} omits required capability ${capability}`);
      if (record.status !== "unsupported") continue;
      assert(
        skill.metadata.fallbacks[capability],
        `${skill.metadata.name}: profile ${profile.id} does not support ${capability} and has no fallback`,
      );
    }
  }
}

async function validateSchemaReferences(root) {
  const roots = [
    join(root, "src", "core"),
    join(root, "src", "adapters"),
    join(root, "src", "capabilities"),
    join(root, "evals", "evidence"),
  ];
  for (const base of roots) {
    for (const path of await filesUnder(base)) {
      if (!path.endsWith(".json")) continue;
      const value = await readJson(path);
      if (!value.$schema || value.$schema.startsWith("https://")) continue;
      const schemaPath = resolve(dirname(path), value.$schema);
      assert(await exists(schemaPath), `${relative(root, path)}: missing schema ${value.$schema}`);
    }
  }
}

export async function loadModel(root = repoRoot) {
  const project = await readJson(join(root, "src", "core", "project.json"));
  validateProject(project);
  const resolutionPolicy = await readJson(join(root, "src", "runtime-resolution", "policy.json"));
  assert(resolutionPolicy.schemaVersion === 1, "runtime resolution policy schemaVersion must be 1");
  assert(
    JSON.stringify(Object.keys(resolutionPolicy.workloads).sort()) === JSON.stringify(["balanced", "deep", "fast"]),
    "runtime resolution policy must define fast, balanced, and deep",
  );

  const registryDocument = await readJson(join(root, "src", "capabilities", "registry.json"));
  const registry = new Set(registryDocument.capabilities);
  assert(registry.size === registryDocument.capabilities.length, "capability registry contains duplicates");

  const profiles = new Map();
  for (const path of await filesUnder(join(root, "src", "capabilities", "profiles"))) {
    if (!path.endsWith(".json")) continue;
    const profile = await readJson(path);
    validateProfile(profile, registry, relative(root, path));
    assert(!profiles.has(profile.id), `duplicate profile ${profile.id}`);
    profiles.set(profile.id, profile);
  }

  const adapters = [];
  for (const id of adapterIds) {
    const path = join(root, "src", "adapters", id, "adapter.json");
    const adapter = await readJson(path);
    validateAdapter(adapter, project, profiles, relative(root, path));
    adapters.push(adapter);
  }

  const skills = [];
  const skillRoot = join(root, "src", "core", "skills");
  const skillEntries = await readdir(skillRoot, { withFileTypes: true });
  skillEntries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of skillEntries) {
    if (!entry.isDirectory()) continue;
    const directory = join(skillRoot, entry.name);
    const metadataPath = join(directory, "skill.json");
    const skillPath = join(directory, "SKILL.md");
    const metadata = await readJson(metadataPath);
    const text = await readFile(skillPath, "utf8");
    const frontmatter = parseSkillFrontmatter(text, relative(root, skillPath));
    validateSkillMetadata(metadata, registry, relative(root, metadataPath));
    assert(entry.name === metadata.name, `${relative(root, directory)}: folder and metadata name differ`);
    assert(frontmatter.name === metadata.name, `${relative(root, skillPath)}: frontmatter and metadata name differ`);
    skills.push({ directory, metadata, text, frontmatter });
  }
  assert(skills.length > 0, "portable core has no skills");

  const roles = [];
  const roleRoot = join(root, "src", "core", "roles");
  const roleEntries = await readdir(roleRoot, { withFileTypes: true });
  roleEntries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of roleEntries) {
    if (!entry.isDirectory()) continue;
    const directory = join(roleRoot, entry.name);
    const metadataPath = join(directory, "role.json");
    const instructionsPath = join(directory, "instructions.md");
    const metadata = await readJson(metadataPath);
    const instructions = await readFile(instructionsPath, "utf8");
    validateRoleMetadata(metadata, relative(root, metadataPath));
    assert(entry.name === metadata.name, `${relative(root, directory)}: folder and metadata name differ`);
    assert(instructions.trim().length > 0, `${relative(root, instructionsPath)}: instructions are empty`);
    roles.push({ directory, metadata, instructions });
  }
  assert(roles.length > 0, "portable core has no roles");

  for (const path of await filesUnder(join(root, "src", "core"))) {
    if (!/\.(?:md|json)$/.test(path)) continue;
    validateCoreText(relative(root, path), await readFile(path, "utf8"));
  }
  await validateSchemaReferences(root);

  for (const adapter of adapters) {
    const targetProfiles = adapter.profiles.map((id) => profiles.get(id));
    for (const skill of skills) validateRequirementSupport(skill, targetProfiles);
  }

  return { root, project, resolutionPolicy, registry, profiles, adapters, skills, roles };
}

function codexSkillMetadata(skill) {
  const displayName = skill.metadata.name
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
  return [
    "interface:",
    `  display_name: ${yamlQuoted(displayName)}`,
    `  short_description: ${yamlQuoted(`${displayName} workflow`)}`,
    `  default_prompt: ${yamlQuoted(`Use $${skill.metadata.name} for this task.`)}`,
    "policy:",
    `  allow_implicit_invocation: ${skill.metadata.invocation === "automatic"}`,
    "",
  ].join("\n");
}

function renderSkillDocument(skill, adapter) {
  const body = skill.text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const frontmatter = [
    "---",
    `name: ${skill.metadata.name}`,
    `description: ${yamlQuoted(skill.frontmatter.description)}`,
  ];
  if (skill.metadata.invocation === "explicit" && adapter.id !== "codex") {
    frontmatter.push("disable-model-invocation: true");
  }
  return [...frontmatter, "---", "", body, ""].join("\n");
}

function yamlQuoted(value) {
  return JSON.stringify(value);
}

function tomlQuoted(value) {
  return JSON.stringify(value);
}

function renderOmpRole(role) {
  const tools = role.metadata.writes
    ? ["read", "grep", "glob", "bash", "edit", "write", "yield"]
    : ["read", "grep", "glob", "yield"];
  return [
    "---",
    `name: ${role.metadata.name}`,
    `description: ${yamlQuoted(role.metadata.description)}`,
    "tools:",
    ...tools.map((tool) => `  - ${tool}`),
    "---",
    "",
    role.instructions.trim(),
    "",
  ].join("\n");
}

function renderCodexRole(role) {
  return [
    `name = ${tomlQuoted(role.metadata.name.replaceAll("-", "_"))}`,
    `description = ${tomlQuoted(role.metadata.description)}`,
    `sandbox_mode = ${tomlQuoted(role.metadata.writes ? "workspace-write" : "read-only")}`,
    'developer_instructions = """',
    role.instructions.trim(),
    '"""',
    "",
  ].join("\n");
}

function renderClaudeRole(role) {
  const tools = role.metadata.writes
    ? "Read, Grep, Glob, Bash, Edit, Write"
    : "Read, Grep, Glob";
  return [
    "---",
    `name: ${role.metadata.name}`,
    `description: ${yamlQuoted(role.metadata.description)}`,
    `tools: ${tools}`,
    "---",
    "",
    role.instructions.trim(),
    "",
  ].join("\n");
}

export async function renderTarget(stageRoot, model, adapter) {
  const target = join(stageRoot, adapter.packageDir);
  const manifest = { ...adapter.manifest, version: model.project.version };
  await writeJson(join(target, adapter.manifestPath), manifest);
  if (adapter.portableManifestPath) {
    await writeJson(join(target, adapter.portableManifestPath), {
      ...adapter.portableManifest,
      version: model.project.version,
    });
  }

  for (const skill of model.skills) {
    const skillTarget = join(target, adapter.skillsDir, skill.metadata.name);
    await cp(skill.directory, skillTarget, { recursive: true });
    await rm(join(skillTarget, "skill.json"));
    await writeText(join(skillTarget, "SKILL.md"), renderSkillDocument(skill, adapter));
    if (adapter.id === "codex") {
      await writeText(join(skillTarget, "agents", "openai.yaml"), codexSkillMetadata(skill));
    }
  }

  for (const role of model.roles) {
    const extension = adapter.id === "codex" ? "toml" : "md";
    const renderer = adapter.id === "omp"
      ? renderOmpRole
      : adapter.id === "codex"
        ? renderCodexRole
        : renderClaudeRole;
    await writeText(join(target, "agents", `${role.metadata.name}.${extension}`), renderer(role));
  }

  const resolutionAdapters = {
    omp: { format: "yaml", modelField: "model", reasoningField: "thinkingLevel" },
    codex: { format: "toml", modelField: "model", reasoningField: "model_reasoning_effort" },
    "claude-code": { format: "yaml", modelField: "model", reasoningField: null },
  };
  await writeJson(join(target, "config", "runtime-resolution.json"), {
    schemaVersion: 1,
    target: adapter.id,
    workloads: model.resolutionPolicy.workloads,
    roles: model.roles.map((role) => ({
      name: role.metadata.name,
      workload: role.metadata.workload,
      constraints: role.metadata.constraints,
      writes: role.metadata.writes,
    })),
    adapter: resolutionAdapters[adapter.id],
  });
  await mkdir(join(target, "scripts"), { recursive: true });
  await cp(join(model.root, "tools", "collect-model-inventory.mjs"), join(target, "scripts", "collect-model-inventory.mjs"));
  await cp(join(model.root, "tools", "configure-models.mjs"), join(target, "scripts", "configure-models.mjs"));

  await writeJson(join(target, "GENERATION.json"), {
    schemaVersion: 1,
    generatedBy: "tools/generate.mjs",
    target: adapter.id,
    sourceVersion: model.project.version,
    profiles: adapter.profiles,
    claims: {
      delivery: "D0",
      workflow: "W0",
    },
  });

  await writeText(join(target, "LICENSE"), await readFile(join(model.root, "LICENSE"), "utf8"));
  return target;
}

export async function validateRenderedTarget(target, adapter, model) {
  const manifestPath = join(target, adapter.manifestPath);
  assert(await exists(manifestPath), `${adapter.id}: generated manifest is missing`);
  const manifest = await readJson(manifestPath);
  assert(manifest.name === model.project.name, `${adapter.id}: generated manifest name drift`);
  assert(manifest.version === model.project.version, `${adapter.id}: generated manifest version drift`);
  assert(semver(manifest.version), `${adapter.id}: generated version is not strict semver`);
  if (adapter.portableManifestPath) {
    const portableManifest = await readJson(join(target, adapter.portableManifestPath));
    assert(portableManifest.name === model.project.name, `${adapter.id}: portable manifest name drift`);
    assert(portableManifest.version === model.project.version, `${adapter.id}: portable manifest version drift`);
  }

  const generation = await readJson(join(target, "GENERATION.json"));
  assert(generation.claims.delivery === "D0", `${adapter.id}: unprobed package overclaims delivery maturity`);
  assert(generation.claims.workflow === "W0", `${adapter.id}: unprobed package overclaims workflow conformance`);
  assert(JSON.stringify(generation.profiles) === JSON.stringify(adapter.profiles), `${adapter.id}: profile list drift`);

  for (const skill of model.skills) {
    const skillPath = join(target, adapter.skillsDir, skill.metadata.name, "SKILL.md");
    const frontmatter = parseSkillFrontmatter(await readFile(skillPath, "utf8"), skillPath);
    assert(frontmatter.name === skill.metadata.name, `${adapter.id}: generated skill name drift`);
    if (adapter.id === "codex") {
      assert(await exists(join(dirname(skillPath), "agents", "openai.yaml")), "codex: missing Skill UI metadata");
    }
  }
  for (const role of model.roles) {
    const extension = adapter.id === "codex" ? "toml" : "md";
    assert(
      await exists(join(target, "agents", `${role.metadata.name}.${extension}`)),
      `${adapter.id}: missing generated role ${role.metadata.name}`,
    );
  }
  const resolution = await readJson(join(target, "config", "runtime-resolution.json"));
  assert(resolution.target === adapter.id, `${adapter.id}: runtime resolution target drift`);
  assert(resolution.roles.length === model.roles.length, `${adapter.id}: runtime resolution role drift`);
  assert(await exists(join(target, "scripts", "collect-model-inventory.mjs")), `${adapter.id}: inventory tool is missing`);
  assert(await exists(join(target, "scripts", "configure-models.mjs")), `${adapter.id}: setup tool is missing`);
}

export async function treeMap(directory) {
  const map = new Map();
  for (const path of await filesUnder(directory)) {
    const key = relative(directory, path).split(sep).join("/");
    map.set(key, (await readFile(path)).toString("base64"));
  }
  return map;
}

export async function compareTrees(expected, actual) {
  const expectedMap = await treeMap(expected);
  const actualMap = await treeMap(actual);
  const keys = [...new Set([...expectedMap.keys(), ...actualMap.keys()])].sort();
  return keys.filter((key) => expectedMap.get(key) !== actualMap.get(key));
}

async function installGeneratedTargets(root, stageRoot, adapters) {
  const backupRoot = await mkdtemp(join(root, ".tmp", "backup-"));
  const replaced = [];
  try {
    for (const adapter of adapters) {
      const target = join(root, adapter.packageDir);
      const staged = join(stageRoot, adapter.packageDir);
      const backup = join(backupRoot, adapter.packageDir);
      await mkdir(dirname(target), { recursive: true });
      if (await exists(target)) {
        await mkdir(dirname(backup), { recursive: true });
        await rename(target, backup);
      }
      replaced.push({ target, backup });
      await rename(staged, target);
    }
  } catch (error) {
    for (const { target, backup } of replaced.reverse()) {
      await rm(target, { recursive: true, force: true });
      if (await exists(backup)) await rename(backup, target);
    }
    throw error;
  } finally {
    await rm(backupRoot, { recursive: true, force: true });
  }
}

export async function generate({ root = repoRoot, check = false } = {}) {
  const model = await loadModel(root);
  await mkdir(join(root, ".tmp"), { recursive: true });
  const stageRoot = await mkdtemp(join(root, ".tmp", "generate-"));
  try {
    for (const adapter of model.adapters) {
      const target = await renderTarget(stageRoot, model, adapter);
      await validateRenderedTarget(target, adapter, model);
    }

    if (check) {
      const drift = [];
      for (const adapter of model.adapters) {
        const differences = await compareTrees(join(stageRoot, adapter.packageDir), join(root, adapter.packageDir));
        drift.push(...differences.map((path) => `${adapter.packageDir}/${path}`));
      }
      assert(drift.length === 0, `generated packages are stale:\n${drift.map((path) => `- ${path}`).join("\n")}`);
    } else {
      await installGeneratedTargets(root, stageRoot, model.adapters);
    }
    return model;
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
  }
}

async function main() {
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--check");
  assert(unknown.length === 0, `unknown arguments: ${unknown.join(" ")}`);
  const check = process.argv.includes("--check");
  const model = await generate({ check });
  console.log(`${check ? "Verified" : "Generated"} ${model.adapters.length} targets from ${model.skills.length} Skill.`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
