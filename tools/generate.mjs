#!/usr/bin/env node
import { codexSkillDescriptions } from "./codex-skill-descriptions.mjs";
import { loadSourceSkills, sourceCoordinate, validateSourceTarget } from "./source-skills.mjs";
import { normalizeOrchestration, targetSelection, t3BindingArtifacts, t3ModelSelectionGuide,
  t3RoleContracts, t3RuntimeBindingGuide, t3SkillBinding, usesT3 } from "./t3-binding.mjs";

import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const deliveryRuntimeScripts = [
  "delivery-evidence.mjs", "delivery-image-diff.mjs",
  "delivery-native-attribution.mjs", "codex-delegation.mjs", "model-resolution.mjs",
];

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

const adapterIds = ["omp", "codex", "claude-code", "pi"];

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

export async function filesUnder(directory, { excludeDirectory = () => false } = {}) {
  if (!(await exists(directory))) return [];
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirectory(path)) await walk(path);
      }
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
  text = text.replace(/\r\n/g, "\n");
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

function validateSkillCatalog(catalog, skillNames) {
  assertKeys(
    catalog,
    new Set(["$schema", "schemaVersion", "public", "probes", "extensions", "entries"]),
    "skill catalog",
  );
  assert(catalog.schemaVersion === 1, "skill catalog: schemaVersion must be 1");
  assert(Array.isArray(catalog.public), "skill catalog: public must be an array");
  assert(Array.isArray(catalog.probes), "skill catalog: probes must be an array");
  const publicNames = new Set(catalog.public);
  const probeNames = new Set(catalog.probes);
  assert(publicNames.size === catalog.public.length, "skill catalog: duplicate public Skill");
  assert(probeNames.size === catalog.probes.length, "skill catalog: duplicate probe Skill");
  assert(catalog.public.every((name, index) => index === 0 || catalog.public[index - 1] < name), "skill catalog: public Skills must be sorted");
  assert(catalog.probes.every((name, index) => index === 0 || catalog.probes[index - 1] < name), "skill catalog: probe Skills must be sorted");
  for (const name of publicNames) assert(!probeNames.has(name), `skill catalog: ${name} has two audiences`);
  const catalogNames = [...publicNames, ...probeNames].sort();
  assert(JSON.stringify(catalogNames) === JSON.stringify([...skillNames].sort()), "skill catalog: must partition every portable Skill exactly once");
  assert(catalog.probes.every((name) => name.startsWith("check-")), "skill catalog: probe Skills must use the check- prefix");
  assert(catalog.public.every((name) => !name.startsWith("check-")), "skill catalog: check- Skills cannot be public");
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
    assert(!adapter.portableManifestPath && !adapter.portableManifest,
      `${path}: the verified native Codex hook loader requires compatibility-only packaging`);
    assert(adapter.manifest.interface, `${path}: Codex interface metadata is required`);
    assert(!adapter.manifest.hooks, `${path}: base Codex manifest must omit extension hooks`);
  }
  if (adapter.id === "claude-code") {
    assert(adapter.manifestPath === ".claude-plugin/plugin.json", `${path}: invalid Claude manifest path`);
  }
  if (adapter.id === "omp") {
    assert(adapter.manifestPath === "package.json", `${path}: invalid OMP manifest path`);
    assert(Array.isArray(adapter.manifest.omp?.skills), `${path}: OMP manifest must declare omp.skills`);
    assert(!("pi" in adapter.manifest), `${path}: use the native omp manifest key, not the legacy pi key`);
  }
  if (adapter.id === "pi") {
    assert(adapter.manifestPath === "package.json", `${path}: invalid Pi manifest path`);
    assert(JSON.stringify(adapter.manifest.pi?.skills) === JSON.stringify(["./skills"]), `${path}: Pi skills declaration is required`);
    assert(JSON.stringify(adapter.manifest.pi?.extensions) === JSON.stringify(["./extensions/oms.ts"]), `${path}: Pi extension declaration is required`);
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

export const supportedExtensions = ["enhanced-delivery", "extras", "aihero"];

function normalizeExtensions(extensions = []) {
  assert(Array.isArray(extensions), "extensions must be an array");
  assert(new Set(extensions).size === extensions.length, "duplicate extension selection");
  for (const name of extensions) assert(name === "auto-routing" || supportedExtensions.includes(name), `unknown extension ${name}`);
  return supportedExtensions.filter((name) => extensions.includes(name));
}

function selectedEntry(entry, extensions) {
  return entry.distribution === "core" || extensions.includes(entry.distribution);
}

function validateDistributionCatalog(catalog) {
  assert(JSON.stringify(catalog.extensions) === JSON.stringify(supportedExtensions), "catalog extension names drift");
  assert(Array.isArray(catalog.entries), "catalog entries are required");
  const keys = new Set();
  for (const entry of catalog.entries) {
    assert(["skill", "role", "reference", "script", "hook", "manifest"].includes(entry.kind), `unknown catalog kind ${entry.kind}`);
    assert(["core", "none", ...supportedExtensions].includes(entry.distribution), `unknown catalog distribution ${entry.distribution}`);
    assert(entry.origin && entry.path && !entry.path.includes("..") && !entry.path.startsWith("/"), "catalog requires safe source path and origin");
    const key = `${entry.kind}:${entry.path}`;
    assert(!keys.has(key), `duplicate catalog entry ${key}`);
    keys.add(key);
    if (entry.conditions) {
      assert(Array.isArray(entry.conditions), `${key}: conditions must be an array`);
      for (const condition of entry.conditions) {
        assert(["core", ...supportedExtensions].includes(condition.distribution), `${key}: unknown condition distribution`);
        assert(Array.isArray(condition.targets) && condition.targets.every((target) => adapterIds.includes(target)), `${key}: invalid condition targets`);
      }
    }
  }
}

export async function loadModel(root = repoRoot, { extensions = [], orchestration = "native" } = {}) {
  extensions = normalizeExtensions(extensions);
  orchestration = normalizeOrchestration(orchestration);
  if (orchestration === "t3") {
    const sourceRoot = await realpath(root);
    for (const artifact of t3BindingArtifacts.filter((entry) => !entry.generated)) {
      const source = join(root, artifact.path);
      assert(await exists(source), `t3: source artifact is missing: ${artifact.path}`);
      assert((await lstat(source)).isFile() && (await realpath(source)).startsWith(`${sourceRoot}${sep}`),
        `t3: source artifact must be a regular file inside the source root: ${artifact.path}`);
    }
    await readJson(join(root, "src", "schemas", "t3-resolution.schema.json"));
  }
  const project = await readJson(join(root, "src", "core", "project.json"));
  validateProject(project);
  const resolutionPolicy = await readJson(join(root, "src", "runtime-resolution", "policy.json"));
  const hostRoutesDocument = await readJson(join(root, "src", "runtime-resolution", "host-routes.json"));
  const resolutionPresets = await readJson(join(root, "src", "runtime-resolution", "presets.json"));
  assert(resolutionPolicy.schemaVersion === 1, "runtime resolution policy schemaVersion must be 1");
  assert(hostRoutesDocument.schemaVersion === 1, "host route policy schemaVersion must be 1");
  assert(resolutionPresets.schemaVersion === 1, "runtime resolution presets schemaVersion must be 1");
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
    const text = (await readFile(skillPath, "utf8")).replace(/\r\n/g, "\n");
    const frontmatter = parseSkillFrontmatter(text, relative(root, skillPath));
    validateSkillMetadata(metadata, registry, relative(root, metadataPath));
    if (frontmatter["disable-model-invocation"] === "true") metadata.invocation = "explicit";
    assert(entry.name === metadata.name, `${relative(root, directory)}: folder and metadata name differ`);
    assert(frontmatter.name === metadata.name, `${relative(root, skillPath)}: frontmatter and metadata name differ`);
    skills.push({ directory, metadata, text, frontmatter });
  }
  assert(skills.length > 0, "portable core has no skills");
  const coreSkillCatalog = await readJson(join(root, "src", "core", "skill-catalog.json"));
  validateDistributionCatalog(coreSkillCatalog);
  validateSkillCatalog(coreSkillCatalog, skills.map((skill) => skill.metadata.name).filter((name) => name !== "oms-enhanced-delivery"));
  const allCoreSkills = [...skills];
  const sourceSkills = await loadSourceSkills(root, parseSkillFrontmatter, registry, { include: (skill) => {
    const entry = coreSkillCatalog.entries.find((entry) => entry.kind === "skill" && entry.name === skill.metadata.name);
    assert(entry, `source Skill lacks catalog classification: ${skill.metadata.name}`);
    return selectedEntry(entry, extensions);
  } });
  for (const skill of sourceSkills) {
    assert(!skills.some((entry) => entry.metadata.name === skill.metadata.name), `source Skill conflicts with existing name: ${skill.metadata.name}`);
    skills.push(skill);
  }
  skills.sort((left, right) => left.metadata.name.localeCompare(right.metadata.name));
  for (let index = skills.length - 1; index >= 0; index -= 1) {
    const entry = coreSkillCatalog.entries.find((entry) => entry.kind === "skill" && entry.name === skills[index].metadata.name);
    assert(entry, `Skill lacks catalog classification: ${skills[index].metadata.name}`);
    if (!selectedEntry(entry, extensions)) skills.splice(index, 1);
  }
  const coreSkills = skills.filter((skill) => !skill.source);
  const entries = coreSkillCatalog.entries.filter((entry) => selectedEntry(entry, extensions))
    .map((entry) => entry.conditions ? { ...entry, targets: [...new Set(entry.conditions
      .filter((condition) => selectedEntry(condition, extensions)).flatMap((condition) => condition.targets))] } : entry);
  for (const entry of entries.filter((entry) => entry.kind === "skill")) {
    if (entry.required === false && !extensions.includes(entry.distribution)) continue;
    assert(skills.some((skill) => skill.metadata.name === entry.name), `selected catalog Skill is missing: ${entry.name}`);
  }
  const selection = { base: "pstack", extensions };
  const skillCatalog = { ...coreSkillCatalog, selection,
    public: skills.filter((skill) => !skill.metadata.name.startsWith("check-")).map((skill) => skill.metadata.name).sort(),
    probes: skills.filter((skill) => skill.metadata.name.startsWith("check-")).map((skill) => skill.metadata.name).sort() };

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
    const classification = coreSkillCatalog.entries.find((entry) => entry.kind === "role" && entry.name === metadata.name);
    assert(classification, `role lacks catalog classification: ${metadata.name}`);
    if (selectedEntry(classification, extensions)) roles.push({ directory, metadata, instructions });
  }
  assert(roles.length > 0, "portable core has no roles");
  const roleNames = new Set(roles.map((role) => role.metadata.name));
  for (const [name, route] of Object.entries({ ...resolutionPolicy.routes, ...hostRoutesDocument.routes })) {
    assert(!Object.hasOwn(resolutionPolicy.routes, name) || !Object.hasOwn(hostRoutesDocument.routes, name), `${name}: host route duplicates a portable route`);
    assert(["single", "panel"].includes(route.kind), `${name}: invalid route kind`);
    assert(roleNames.has(route.role), `${name}: unknown route role ${route.role}`);
    assert(resolutionPolicy.workloads[route.workload], `${name}: unknown route workload ${route.workload}`);
    if (route.kind === "panel") assert(Number.isInteger(route.defaultCount) && route.defaultCount > 0, `${name}: panel count must be positive`);
  }
  for (const [presetName, runtimes] of Object.entries(resolutionPresets).filter(([name]) => name !== "schemaVersion")) {
    for (const [runtime, preset] of Object.entries(runtimes)) {
      assert(adapterIds.includes(runtime), `${presetName}: unknown runtime ${runtime}`);
      for (const workload of Object.keys(preset.workloads)) assert(resolutionPolicy.workloads[workload], `${presetName}: unknown workload ${workload}`);
      for (const [name, choices] of Object.entries(preset.routes ?? {})) {
        const route = ["omp", "codex"].includes(runtime) ? (hostRoutesDocument.routes[name] ?? resolutionPolicy.routes[name]) : resolutionPolicy.routes[name];
        assert(route, `${presetName}: unknown route ${name}`);
        assert(Array.isArray(choices) === (route.kind === "panel"), `${presetName}.${name}: route shape mismatch`);
      }
    }
  }

  for (const path of await filesUnder(join(root, "src", "core"))) {
    if (!/\.(?:md|json)$/.test(path)) continue;
    if (path === join(root, "src", "core", "skill-catalog.json")) continue;
    validateCoreText(relative(root, path), await readFile(path, "utf8"));
  }
  await validateSchemaReferences(root);

  for (const adapter of adapters) {
    const targetProfiles = adapter.profiles.map((id) => profiles.get(id));
    for (const skill of skills) validateRequirementSupport(skill, targetProfiles);
  }

  assert(JSON.stringify(Object.keys(codexSkillDescriptions).sort()) === JSON.stringify(coreSkillCatalog.public), "Codex descriptions must cover exactly the core public catalog");
  for (const description of Object.values(codexSkillDescriptions)) {
    assert(description.length > 0 && description.length <= 120, "Codex descriptions must be 1-120 characters");
  }
  return { orchestration, extensions, selection, entries, allCoreSkills, root, project, resolutionPolicy, hostRoutes: hostRoutesDocument.routes, resolutionPresets, registry, profiles, adapters, skills, coreSkills, sourceSkills, coreSkillCatalog, skillCatalog, roles };
}

function codexSkillMetadata(skill) {
  const displayName = skill.metadata.name
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
  return [
    "interface:",
    `  display_name: ${yamlQuoted(`${skill.metadata.name.startsWith("principle-") ? "Principle" : "Workflow"}: ${displayName.replace(/^Principle /, "")}`)}`,
    `  short_description: ${yamlQuoted((codexSkillDescriptions[skill.metadata.name] ?? skill.frontmatter.description).slice(0, 64))}`,
    `  default_prompt: ${yamlQuoted(`Use $${skill.metadata.name} for this task.`)}`,
    "policy:",
    `  allow_implicit_invocation: ${skill.metadata.invocation === "automatic"}`,
    "",
  ].join("\n");
}

function renderSkillDocument(skill, adapter, model) {
  if (skill.source) return skill.text;
  const t3 = usesT3(model, adapter);
  let body = skill.text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const ompRouteBySkill = {
    feature: "code.feature-refactoring",
    refactoring: "code.feature-refactoring",
    "bug-fix": "code.bug-fix",
    "perf-issue": "code.perf-issue",
    hillclimb: "code.hillclimb",
  };
  if (!t3 && ["omp", "codex"].includes(adapter.id) && Object.hasOwn(ompRouteBySkill, skill.metadata.name)) {
    body = body.replaceAll("`code.delegates`", `\`${ompRouteBySkill[skill.metadata.name]}\``);
  }
  const frontmatter = [
    "---",
    `name: ${skill.metadata.name}`,
    `description: ${yamlQuoted(adapter.id === "codex" ? (codexSkillDescriptions[skill.metadata.name] ?? skill.frontmatter.description) : skill.frontmatter.description)}`,
  ];
  if (skill.metadata.invocation === "explicit" && adapter.id !== "codex") {
    frontmatter.push("disable-model-invocation: true");
  }
  const delegates = skill.metadata.requires.includes("agents.spawn") || Object.hasOwn(ompRouteBySkill, skill.metadata.name);
  const codexDelegation = !t3 && adapter.id === "codex" && delegates
    ? [
      "## Codex delegation binding",
      "",
      "For every delegated worker in this workflow, derive the exact `model`,",
      "`reasoning_effort`, and complete role-plus-task `message` with",
      "`../../scripts/codex-delegation.mjs prepare` relative to this Skill. It resolves",
      "the nearest project manifest first, then the user manifest. Supply the named",
      "route/panel entry where configured; otherwise supply the canonical role",
      "and the observed parent model and effort. For task adjustment, supply",
      "`--job-context JOB.json` with `kind` hardest, judgment, routine, or verification",
      "and optional boolean `urgent`, plus `--inventory INVENTORY.json` for observed",
      "effort alternatives. The saved model stays fixed. Without inventory only",
      "the saved effort is available. Read `audit.taskSelection` before dispatch.",
      "Keep the complete prepared request. If the host rejects its adjustment,",
      "supply `--rejected-adjustment ERROR.json` and",
      "`--rejected-prepared-request REQUEST.json` to retry the original role line",
      "even after the inventory changes. A request checksum binds the receipt;",
      "the host remains responsible for authenticating the rejection evidence.",
      "Pass",
      "the returned `task_name`, `fork_turns=none`, model, effort, and message",
      "explicitly to the spawn call. Do not use a generated custom-role name as a selector or",
      "claim its TOML was activated. After the worker finishes, run the helper's",
      "`verify` mode on the persisted parent and child records when available; it",
      "checks the spawn metadata, parent link, and child `turn_context`.",
      "The persisted spawn message may be encrypted; disclose when its exact",
      "role/task text cannot be audited. If records are unavailable, state that",
      "runtime model resolution is unverified.",
      ...(Object.hasOwn(ompRouteBySkill, skill.metadata.name)
        ? [`For this workflow's implementers use \`${ompRouteBySkill[skill.metadata.name]}\`.`] : []),
      "",
    ].join("\n")
    : "";
  const codexSetup = !t3 && adapter.id === "codex" && skill.metadata.name === "setup-oh-my-stack"
    ? [
      "## Codex activation boundary",
      "",
      "Setup defaults to `--user` (`~/.codex/`); use `--project-root` only",
      "for a complete project override. Resolve the nearest project manifest",
      "first, then the user manifest. A user setup does not rewrite project",
      "overrides. `--output` remains a detached review destination.",
      "",
      "Generated TOML files and an applied resolution manifest are",
      "configuration artifacts, not evidence that this Codex surface selected",
      "those custom roles. Delegated workflows use explicit spawn parameters and",
      "the complete generated role contract through `../../scripts/codex-delegation.mjs`.",
      "Verify actual model and effort from persisted child records when available.",
      "",
    ].join("\n")
    : "";
  const codexGitHub = !t3 && adapter.id === "codex" && ["opening-a-pr", "babysit", "shipping"].includes(skill.metadata.name)
    ? [
      "## Codex GitHub workflow binding",
      "",
      "When the selected provider is explicitly `github.com`, read",
      "`../../scripts/github-workflow.mjs` and",
      "`../../docs/github-workflow.md` before using this bounded single-PR adapter.",
      "For authorized operations supported by a host-owned PR tool, use that",
      "tool first and preserve the host's task association requirements.",
      "Use `executeGitHubWorkflow(request)` only as the bounded fallback for",
      "creation or merge that the host-owned tool does not support. Tool choice",
      "does not expand the workflow's authorization or target gates.",
      "Its CLI exposes only `inspect` and `recover`; recovery",
      "can append local reconciliation evidence. The request must name this",
      "workflow, the exact target and account, and any required journal and",
      "authority records. Caller records assert scope; they do not authenticate",
      "human consent or reviewer provenance. Select no provider by inference.",
      ...(skill.metadata.name === "babysit"
        ? ["This binding supports `check` only. Stop for `drive`, `threads-only`,",
          "`background`, repair, polling, or merge requests."] : []),
      ...(skill.metadata.name === "shipping"
        ? ["This binding accepts one root-countersigned bottom PR only. It does",
          "not discover or validate stack topology. Strict target CAS stops;",
          "`server-policy` requires separately scoped authorization and retains",
          "the GitHub base-revision race boundary. Review defaults to `github-review`;",
          "`independent-oms` must be explicitly authorized and still honors",
          "the repository's actual GitHub approval requirements."] : []),
      ...(skill.metadata.name === "opening-a-pr"
        ? ["This binding creates one ready PR from an already pushed branch;",
          "it does not push a branch or create a stack."] : []),
      "",
    ].join("\n")
    : "";
  const ompSetup = adapter.id === "omp" && skill.metadata.name === "setup-oh-my-stack"
    ? [
      "## OMP source-style setup",
      "",
      "Setup defaults to `--user` (`~/.omp/agent/`); use `--project-root`",
      "only for a complete project override. Resolve the nearest project",
      "manifest first, then the user manifest. A user setup does not rewrite",
      "project overrides. `--output` remains a detached review destination.",
      "",
      "The user resolution manifest is the default Oh My Stack choice table.",
      "OMP's `modelRoles` such as `default`, `smol`, and `advisor` are separate",
      "host settings. This setup does not synchronize them with explicit",
      "Oh My Stack workflow agent choices or change the main conversation model.",
      "On a re-run, preview the existing budget and any model-family, panel, or",
      "inherit-parent overrides before asking for changes. When reusing the same preset,",
      "the configurator preserves those overrides and applies the selected budget",
      "to real models using OMP's advertised thinking levels. Confirm the entire",
      "ordered table before `--apply`. A project manifest takes precedence where",
      "present; this is not a Cursor-style globally injected rule.",
      "",
      "If `--preset pstack` fails because its Cursor model IDs are absent, check",
      "the observed inventory for every ID in the bundled `pstack-openai-codex`",
      "preset. Only if all are present, preview that preset without `--apply`.",
      "Its fast/balanced/deep choices are GPT-6 Luna, GPT-6.1 Sol, and GPT-6 Astra:",
      "a provider-specific proposal, not an equivalence claim or silent fallback.",
      "Use current OMP model metadata for prices when available; otherwise state",
      "that price is unknown. Explain that Astra is the expensive deep/panel",
      "choice. Show the complete ordered routes and obtain the user's model",
      "and budget decision before apply.",
      "On a preset switch, explicitly carry over any desired budget or overrides",
      "only after reviewing them; the configurator does not retain them across",
      "different presets. If any required model is absent, stop and request",
      "explicit observed choices; never fill a slot with a legacy model merely",
      "because it appears in the inventory or has a familiar name.",
      "",
    ].join("\n")
    : "";
  const claudeSetup = !t3 && adapter.id === "claude-code" && skill.metadata.name === "setup-oh-my-stack"
    ? [
      "## Claude Code setup boundary",
      "",
      "There is no complete read-only account model catalog in this adapter.",
      "For default model setup, probe all three families using",
      "`--claude-models haiku,sonnet,opus",
      "--confirm-claude-probes`. Disclose usage and obtain approval first.",
      "The collector defaults to these three aliases when no subset is supplied.",
      "An explicitly requested subset remains valid; describe it as a partial",
      "inventory, not the account's complete model catalog. If a probe fails,",
      "report the family and failure; do not silently replace Haiku with Sonnet.",
      "A reviewed explicit family pin such as `haiku=claude-haiku-5-5` is",
      "supported in `--claude-models` when the user chooses it after an alias",
      "mismatch. Verify the returned ID exactly; do not automatically pin a",
      "version or rewrite the user's global alias settings.",
      "Never probe Fable or arbitrary IDs through this path; some requests can",
      "incur separate usage credits without a terminal consent prompt.",
      "The probe observes canonical model IDs. Its effort list comes from",
      "reviewed Claude Code documentation, not a live capability API; account",
      "or organization caps may lower effective effort.",
      "",
      "Preview `--preset pstack` with the three-family inventory. This dynamic",
      "preset uses observed IDs rather than pinning model versions: Haiku for",
      "`fast` (including how.explorer and why.investigator), Sonnet for",
      "`balanced`, and Opus for `deep`. Fresh ordered two-worker panels use",
      "Opus/Sonnet; Haiku remains the fast workload choice.",
      "The initial efforts are low/medium/high, reduced to the highest supported",
      "effort below each target when necessary; the user's budget then applies.",
      "Haiku 4.5 uses `none` (no native effort override), not a claimed high.",
      "The preset requires one observed ID per family; missing or ambiguous",
      "families require a refreshed inventory or explicit workload choices.",
      "For an explicit two-model subset, Sonnet can still fill fast/balanced",
      "and Opus deep. Preserve deliberate existing choices; offer the new",
      "three-family recommendation before replacing an older mapping.",
      "Re-running the same preset preserves explicit overrides, saved panel",
      "membership, order and size (including three-member panels), and budget.",
      "Three configured families do not prove execution or cross-provider",
      "diversity. Preview every route and panel before `--apply`.",
      "Setup defaults to `--user` (`~/.claude/`, or the absolute",
      "`CLAUDE_CONFIG_DIR` when set); `--project-root` writes a complete",
      "project override and `--output` remains detached. Resolve the active",
      "user directory before describing which configuration takes effect.",
      "The setup auditor checks the manifest, hashes, effective scope, and",
      "linked native child identity/model from parent and child records.",
      "A project-local PreToolUse hook can additionally record the runtime's",
      "effective effort through `scripts/claude-effort-hook.mjs`; pass that",
      "JSONL with `--hook-record`. Use an isolated project and do not install a",
      "diagnostic hook into the user's global settings. Without hook evidence,",
      "treat child effort as unverified even when the agent file specifies it.",
      "",
    ].join("\n")
    : "";
  const ompDelegation = adapter.id === "omp" && (delegates || skill.metadata.name === "poteto-mode")
    ? [
      "## OMP model routing",
      "",
      "At the start of this workflow, run `../../scripts/model-resolution.mjs`",
      "with `--runtime omp --cwd` set to the current workspace. Read the returned",
      "manifest: nearest project first, then the user's `~/.omp/agent/` default.",
      "For each configured route, select its named agent through OMP's native",
      "task-agent selector and verify that its source matches the chosen scope;",
      "for a canonical role, use the manifest role's `agent` name (user",
      "defaults use namespaced `ohmystack-role-*` agents).",
      "Preserve panel entry order and count. If no mapping is present, retain the",
      "workflow's normal runtime model. Verify resolved worker model and thinking",
      "level from OMP session/job metadata, not from the role file alone.",
      ...(skill.metadata.requires.includes("agents.spawn")
        ? ["When `task` returns a background job id, retain it until terminal status.",
          "On OMP hosts exposing `proc://` (observed in 18.3.0), use `read proc://<id>`",
          "for non-consuming status, `wait` to drain, and `write proc://<id>/kill`",
          "to cancel an owned job with the required approval. Confirm cancellation",
          "before replacing a worker and reject results from older generations.",
          "Do not assume the deprecated `hub` tool exists. If safe cancellation",
          "is unavailable, wait or report the unit incomplete; never silently",
          "treat an unconfirmed worker as cancelled."] : []),
      ...(Object.hasOwn(ompRouteBySkill, skill.metadata.name)
        ? [`For this workflow's implementers use \`${ompRouteBySkill[skill.metadata.name]}\`.`] : []),

      "",
    ].join("\n")
    : "";
  const helpBinding = skill.metadata.name === "poteto-help"
    ? [
      "## Installed catalog",
      "",
      "Read [the generated Skill catalog](../../SKILL_CATALOG.json) for this package.",
      "Use the host's actual Skill picker or supported invocation syntax. Do not",
      "assume typing a Skill name as plain text selected its structured input.",
      "For setup and installation, read this package's setup Skill and the verified",
      "operations documentation for the current host before giving exact commands.",
      "",
    ].join("\n")
    : "";
  const routingBinding = skill.metadata.name === "oms-auto"
    ? (adapter.id === "codex" ? [
      "## Codex automatic routing binding",
      "",
      "Run `node ../../scripts/routing.mjs status` from the user's project, resolving",
      "the script path relative to this installed Skill, before automatic routing.",
      "Use the returned `enabled` flag; errors mean automatic routing is unavailable.",
      "The nearest project switch overrides the user switch; absence defaults to manual.",
      "For a routing setup request, preview `node ../../scripts/routing.mjs set",
      "--scope user|project --mode auto|manual`, then use the same command with",
      "`--apply` only when applying that switch is authorized. Replace the choice",
      "placeholders with the requested values. Report the returned effective mode",
      "and any project override. Routing setup does not require model setup.",
      "The bundled SessionStart hook adds a short routing hint only in auto mode.",
      "Native hook trust and observed hook execution are separate from configuration.",
      "Read [the routing guide](../../docs/automatic-routing.md) for exact scope paths",
      "and hook verification. Do not modify native hook trust automatically.",
      "",
    ].join("\n") : adapter.id === "claude-code" ? [
      "## Claude Code automatic routing binding",
      "",
      "Run `node ../../scripts/routing.mjs status --runtime claude-code` from the",
      "user's project, resolving the script path relative to this installed Skill,",
      "before automatic routing. Use the returned `enabled` flag; errors disable routing.",
      "The nearest Claude project switch overrides the user switch; absence is manual.",
      "The user directory is the absolute CLAUDE_CONFIG_DIR, or ~/.claude when unset.",
      "Claude uses .oh-my-stack/routing.claude-code.json for project overrides;",
      "Codex's .oh-my-stack/routing.json is independent and must not be rewritten.",
      "For a routing setup request, preview `node ../../scripts/routing.mjs",
      "set --runtime claude-code --scope user|project --mode auto|manual`, then",
      "use the same command with `--apply` for the authorized selection.",
      "Report saved scope, effective mode, and project overrides separately.",
      "Routing-only setup needs no model inventory, paid probes, or model mapping changes.",
      "The plugin's SessionStart hook adds the oms-auto entry pointer only in auto mode.",
      "Use the Skill tool for oh-my-stack:oms-auto when available; otherwise read its",
      "installed file. Always recheck the switch before reading poteto-mode or a workflow.",
      "After enabled=true, read ../poteto-mode/SKILL.md and follow its workflow routing.",
      "When enabling, review the plugin SessionStart hook through Claude Code's /hooks",
      "and start a fresh session. Do not bypass host hook permissions or alter trust.",
      "Saving a switch does not prove hook execution or workflow selection.",
      "Read [the routing guide](../../docs/automatic-routing.md) for verification.",
      "",
    ].join("\n") : [
      "## Automatic routing availability",
      "",
      "Automatic routing is not configured on this target. For oms-auto or a",
      "routing-only setup request, return control to the host without automatic",
      "execution. Use the explicit poteto-mode entry for engineering work.",
      "For ordinary model setup, continue with the procedure below.",
      "",
    ].join("\n")) : "";
  const deliveryBinding = skill.metadata.name === "oms-enhanced-delivery"
    ? ["## Local delivery evidence binding", "",
      "Read [the delivery guide](../../docs/delivery-evidence.md) for the frozen",
      "plan/evidence shapes and supported provenance protocol. The portable CLI is",
      "`../../scripts/delivery-evidence.mjs` relative to this installed Skill.",
      "Freeze before implementation, retain the lock digest, then inspect or run",
      "explicitly selected checks against the actual final artifact. Unknown",
      "required provenance stays unverified; local success does not certify release.", ""].join("\n")
    : "";
  const piBinding = adapter.id === "pi" && (delegates || skill.metadata.name === "poteto-mode" || skill.metadata.name === "setup-oh-my-stack")
    ? ["## Pi native binding", "", "Read [the native binding](../../docs/runtime-binding.md) and",
      "[model selection](../../docs/model-selection.md). Use `oms_delegate` with",
      "`start`, `collect`, and `cancel` for the workflow's explicitly requested",
      "route/member. Saved Pi resolution and packaged role contracts select",
      "the child model, thinking level, and permissions. Preserve panel order and",
      "count. Supply explicit context and an isolated checkout for writing roles.",
      "Report actual model and effort separately from requested configuration.", ""].join("\n") : "";
  const extension = [t3 ? t3SkillBinding() : "", piBinding, codexDelegation, codexSetup, codexGitHub, ompSetup, claudeSetup, ompDelegation, helpBinding, routingBinding, deliveryBinding].filter(Boolean).join("\n").trimEnd();
  const extendedBody = extension ? /^# .+\n/.test(body)
    ? body.replace(/^(# .+\n)/, `$1\n${extension}\n`) : `${extension}\n\n${body}` : body;
  return [...frontmatter, "---", "", extendedBody, ""].join("\n");
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

function renderPiRole(role) {
  return JSON.stringify({ name: role.metadata.name, description: role.metadata.description,
    writes: role.metadata.writes, constraints: role.metadata.constraints,
    instructions: role.instructions.trim() }, null, 2) + "\n";
}

function portableHelperGuide() {
  return [
    "## Portable plan checker", "",
    "The dependency-free Node helper `skills/poteto-mode/scripts/check-plan.mjs` is supported on this native host.",
    "Resolve `<installed-package-root>` from the installed package that supplied this guide. Keep the project as the working directory.",
    'Run `node "<installed-package-root>/skills/poteto-mode/scripts/check-plan.mjs" "/absolute/path/plan.md"`.',
    "The checker exits 0 for a valid plan, 1 for plan problems, and 2 when the plan argument is missing.",
    "A successful check validates the plan structure. It does not establish live, performance, review, or release evidence.", "",
    "Relative to `skills/poteto-mode/SKILL.md` or `WORKFLOW.md`, the helper is `scripts/check-plan.mjs`.",
    "Relative to `skills/poteto-mode/playbooks/multi-phase-plan.md`, it is `../scripts/check-plan.mjs`.",
    "Relative to the public `skills/multi-phase-plan/SKILL.md` or `WORKFLOW.md`, it is `../poteto-mode/scripts/check-plan.mjs`.",
    "These paths are relative to the named document, not the project working directory. Resolve them before invoking Node.", "",
    "Other source-host helpers under a Skill's scripts directory remain reference-only unless this binding documents their exact native execution.",
    "Cursor watch-pr, orchestration, and worktree helpers have no execution mapping in this native binding.", "",
    "## Read-only worktree audit", "",
    'The OMS-owned helper supports `node "<installed-package-root>/scripts/worktree-audit.mjs" scan --cwd PATH` and `assess --scan FILE --evidence FILE`.',
    "Read [the evidence contract](worktree-audit.md) before collecting supported host evidence. Missing activity, pinned-thread, child-task or process coverage remains unresolved.",
    "The helper rechecks local Git identities and status. A candidate is advisory and does not authorize deletion.", "",
  ].join("\n");
}

function runtimeBindingGuide(runtime) {
  const binding = runtime === "pi" ? "Use the native oms_delegate tool: start a named route/member with explicit task, cwd and context; collect the returned handle until terminal; cancel owned running handles. For a canonical role named by a playbook, use route role.NAME, member 1: poteto-agent maps to role.poteto-agent and comment-sicko maps to role.comment-sicko. Read-only roles receive read,grep,find,ls. Writing roles require an explicit isolated checkout. Native CLI/RPC uses explicit provider/model/thinking and host login. Missing selectors fail; observed model and effort remain unknown unless independently returned."
    : runtime === "codex" ? "Prepare each worker with scripts/codex-delegation.mjs and pass its model, reasoning_effort, task_name, fork_turns=none and full role/task message to the native spawn tool. Resolve saved configuration with scripts/model-resolution.mjs. Verify observed routing from native records when available."
      : runtime === "omp" ? "Resolve scripts/model-resolution.mjs --runtime omp --cwd WORKSPACE. Select the manifest role/route agent with the native task tool, preserve panel membership and order, and collect each returned task handle. Use the current host cancellation and return tools."
        : "Use the native Agent tool with the configured agent role/model. Preserve the workflow's specified worker count and order; distinguish requested model/effort from observed execution. Record unavailable cancellation or effort evidence explicitly.";
  const helpers = runtime === "codex" ? "The native bounded GitHub helpers scripts/github-workflow.mjs, scripts/github-autopilot-provider.mjs and scripts/durable-run-state.mjs support only their documented single-PR operations and gates. Read docs/github-workflow.md before invoking them." : "";
  return `# ${runtime} runtime binding\n\n${binding}\n\n${portableHelperGuide()}\n${helpers ? `${helpers}\n\n` : ""}Role contracts preserve upstream task semantics. Follow the selected workflow's stages and review standard. Delegate the workers that workflow calls for. Host authorization and available tool contracts continue to apply.\n`;
}

function modelSelectionGuide(runtime) {
  const roots = runtime === "pi" ? "~/.pi/agent and project .pi" : runtime === "omp" ? "~/.omp/agent and project .omp" : runtime === "codex" ? "~/.codex and project .codex" : "~/.claude (or CLAUDE_CONFIG_DIR) and project .claude";
  const taskAdjustment = runtime === "codex"
    ? "Use scripts/codex-delegation.mjs prepare --job-context JOB.json --inventory INVENTORY.json. JOB.json contains kind hardest, judgment, routine, or verification and optional boolean urgent. Read audit.taskSelection for configured, selected, and requested values. Without a fresh inventory only the saved entry is available. After a confirmed host rejection of the adjusted choice, supply --rejected-adjustment REJECTION.json with the attempted model, reasoning, and host reason. Keep the full prepared request and supply --rejected-prepared-request REQUEST.json with the rejection when the inventory has changed or is omitted. The helper validates the captured request before restoring the original role line. Retry audit.taskSelection retains the captured inventory evidence; currentInventory fields record the refreshed compatibility catalog or null when omitted. The host authenticates rejection evidence. The native spawn request has no speed selector, so the helper audits requested speed without emitting an invented field."
    : "For each task, inspect the native host's current typed model and effort catalog. Use the host's documented selection controls for supported adjustments. A generated agent file alone does not implement per-task overrides. If the native call cannot override a setting, report that limitation and use the saved role line. Use a speed selector only when the live host advertises it. Otherwise report speed as unsupported. After an adjusted choice is rejected, retry the original role line once and report the rejection. Do not guess another model ID.";
  return `# Model selection\n\nCollect a current inventory with scripts/collect-model-inventory.mjs --runtime ${runtime}. Review every model and effort before scripts/configure-models.mjs --apply. Preview is the default; --output writes only a detached destination. Native scope is ${roots}. scripts/model-resolution.mjs resolves nearest project first, then user configuration; each host owns an independent manifest. Fresh panels contain two entries. Same-target/same-preset reruns preserve saved membership, order, model and effort unless an explicit change requests otherwise. Missing observed model/effort selectors fail. Configuration artifacts do not prove native routing.\n\nSaved personal configuration is the starting budget. Task selection does not rewrite it. Keep the configured model and family, panel membership, and order. Use only effort alternatives in the observed host inventory. Hardest work raises effort one supported level, capped at max or the highest advertised level below max. An explicitly saved effort above max remains unchanged. Judgment lowers it one level. Routine work lowers it two levels or to the lowest supported value. Verification keeps the configured model, effort, and speed. Other tasks request standard speed unless urgency calls for fast. Inherit-parent and auto aliases stay unchanged. Record the original role line, task choice, and any rejected adjustment. Requested settings do not prove backend enforcement.\n\n${taskAdjustment}\n`;
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

function packageSkills(model, includeProbes) {
  if (includeProbes) return model.skills;
  const publicNames = new Set(model.skillCatalog.public);
  return model.skills.filter((skill) => publicNames.has(skill.metadata.name));
}

function targetRoutes(model, adapter) {
  return adapter.id === "pi" ? { ...model.resolutionPolicy.routes,
    ...Object.fromEntries(model.roles.map((role) => [`role.${role.metadata.name}`, {
      kind: "single", role: role.metadata.name, workload: role.metadata.workload,
    }])) }
    : ["omp", "codex"].includes(adapter.id)
      ? { ...model.resolutionPolicy.routes, ...model.hostRoutes }
      : model.resolutionPolicy.routes;
}

async function canonicalPath(path) {
  try { return await realpath(path); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    return join(await canonicalPath(dirname(path)), basename(path));
  }
}

async function assertDetachedOutput(root, outputRoot) {
  const source = await canonicalPath(resolve(root));
  const output = await canonicalPath(resolve(outputRoot));
  const packages = join(source, "packages");
  const scratch = join(source, ".tmp");
  const destinations = [output, ...await Promise.all(adapterIds.map((id) => canonicalPath(join(output, "packages", id))))];
  assert(destinations.every((path) => path !== source && !source.startsWith(path.endsWith(sep) ? path : `${path}${sep}`)
    && (path.startsWith(`${scratch}${sep}`) || !path.startsWith(`${source}${sep}`))
    && path !== packages && !path.startsWith(`${packages}${sep}`)),
    "t3 orchestration requires a detached outputRoot outside protected source paths and ancestors");
}

function codexSkillEntry(document, name) {
  const frontmatter = document.match(/^---\n[\s\S]*?\n---\n/)[0];
  const heading = document.match(/^# .+$/m)?.[0] ?? `# ${name}`;
  return `${frontmatter}\n${heading}\n\nRead the [complete workflow](WORKFLOW.md) beside this SKILL.md before applying\nthis Skill. Read it through the end; if a tool truncates output, continue with\nbounded chunks until the whole file has been read. Do not execute a partial\nprocedure or infer missing instructions. If the file cannot be read, report\nthe limitation and stop before taking workflow actions.\n\nThe user's request sets the scope and authorization. Loading this Skill does\nnot authorize writes, external actions, or running its workflow when the user\nonly asks to inspect or explain it.\n`;
}

export async function renderTarget(stageRoot, model, adapter, { includeProbes = false, orchestration = model.orchestration ?? "native" } = {}) {
  model = { ...model, orchestration: normalizeOrchestration(orchestration) };
  const t3 = usesT3(model, adapter);
  if (model.orchestration === "t3") await assertDetachedOutput(model.root, stageRoot);
  const target = join(stageRoot, adapter.packageDir);
  const selection = targetSelection(model, adapter);
  const skills = packageSkills(model, includeProbes);
  const manifest = structuredClone({ ...adapter.manifest, version: model.project.version });
  if (model.entries.some((entry) => entry.kind === "manifest" && entry.path === "manifest/hooks" && entry.targets.includes(adapter.id))) manifest.hooks = "./hooks/hooks.json";
  await writeJson(join(target, adapter.manifestPath), manifest);
  if (adapter.portableManifestPath) {
    await writeJson(join(target, adapter.portableManifestPath), {
      ...adapter.portableManifest,
      version: model.project.version,
    });
  }

  for (const skill of skills) {
    const skillTarget = join(target, adapter.skillsDir, skill.metadata.name);
    await cp(skill.directory, skillTarget, { recursive: true });
    if (!skill.source) {
      await rm(join(skillTarget, "skill.json"));
      const prefix = relative(model.root, skill.directory).split(sep).join("/");
      for (const path of await filesUnder(skillTarget)) {
        const sourcePath = `${prefix}/${relative(skillTarget, path).split(sep).join("/")}`;
        const classification = model.coreSkillCatalog.entries.find((entry) => entry.kind === "reference" && entry.path === sourcePath)
          ?? model.coreSkillCatalog.entries.find((entry) => entry.kind === "reference" && entry.path === `${prefix}/**`);
        assert(classification, `resource lacks catalog classification: ${sourcePath}`);
        if (!selectedEntry(classification, model.extensions)) await rm(path);
      }
    }
    const document = renderSkillDocument(skill, adapter, model);
    // Source originals retain their complete upstream bytes, including long
    // references without an H1. Only portable core instructions use the wrapper.
    if (!skill.source && adapter.id === "codex" && Buffer.byteLength(document) > 7500) {
      assert(!await exists(join(skillTarget, "WORKFLOW.md")), `${skill.metadata.name}: reserved generated WORKFLOW.md already exists`);
      await writeText(join(skillTarget, "WORKFLOW.md"), document);
      await writeText(join(skillTarget, "SKILL.md"), codexSkillEntry(document, skill.metadata.name));
    } else {
      await writeText(join(skillTarget, "SKILL.md"), document);
    }
    if (adapter.id === "codex") {
      if (!skill.source) await writeText(join(skillTarget, "agents", "openai.yaml"), codexSkillMetadata(skill));
    }
    if (skill.source) {
      await cp(skill.source.licenseFile, join(skillTarget, "LICENSE"));
      await writeJson(join(skillTarget, "SOURCE.json"), sourceCoordinate(skill.source));
      await mkdir(join(target, "licenses", skill.source.id), { recursive: true });
      await cp(skill.source.licenseFile, join(target, "licenses", skill.source.id, "LICENSE"));
    }
  }

  const audiences = new Map([
    ...model.skillCatalog.public.map((name) => [name, "public"]),
    ...model.skillCatalog.probes.map((name) => [name, "probe"]),
  ]);
  await writeJson(join(target, "SKILL_CATALOG.json"), {
    schemaVersion: 1,
    target: adapter.id,
    selection,
    resources: [...model.entries, ...(t3 ? t3BindingArtifacts : [])].filter((entry) => !entry.targets || entry.targets.includes(adapter.id))
      .filter((entry) => !entry.owner || skills.some((skill) => skill.metadata.name === entry.owner)),
    skills: skills.map((skill) => ({
      name: skill.metadata.name,
      audience: audiences.get(skill.metadata.name),
      category: skill.metadata.name.startsWith("check-") ? "probe" : skill.metadata.name.startsWith("principle-") ? "principle" : "workflow",
      invocation: skill.metadata.invocation,
      ...(skill.source ? { source: sourceCoordinate(skill.source) } : {}),
    })),
  });

  for (const role of model.roles) {
    const extension = adapter.id === "codex" ? "toml" : adapter.id === "pi" ? "json" : "md";
    const renderer = adapter.id === "omp"
      ? renderOmpRole
      : adapter.id === "codex"
        ? renderCodexRole
        : adapter.id === "pi" ? renderPiRole : renderClaudeRole;
    await writeText(join(target, "agents", `${role.metadata.name}.${extension}`), renderer(role));
  }

  const routes = targetRoutes(model, adapter);
  if (t3) await writeJson(join(target, "config", "t3-role-contracts.json"), t3RoleContracts(model, adapter, routes));
  if (["codex", "pi"].includes(adapter.id)) {
    await writeJson(join(target, "config", "role-contracts.json"), {
      schemaVersion: 1,
      target: adapter.id,
      routeRoles: Object.fromEntries(Object.entries(routes).map(([name, route]) => [name, route.role])),
      roles: Object.fromEntries(model.roles.map((role) => [role.metadata.name, {
        description: role.metadata.description,
        instructions: role.instructions.trim(),
        writes: role.metadata.writes,
        constraints: role.metadata.constraints,
      }])),
    });
  }

  const resolutionAdapters = {
    pi: { format: "json", modelField: "model", reasoningField: "reasoning" },
    omp: { format: "yaml", modelField: "model", reasoningField: "thinkingLevel" },
    codex: { format: "toml", modelField: "model", reasoningField: "model_reasoning_effort" },
    "claude-code": { format: "yaml", modelField: "model", reasoningField: "effort" },
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
    routes,
    presets: Object.fromEntries(
      Object.entries(model.resolutionPresets).filter(([name]) => name !== "schemaVersion")
        .map(([name, runtimes]) => [name, runtimes[adapter.id] ?? null]),
    ),
    adapter: resolutionAdapters[adapter.id],
  });
  for (const entry of [...model.entries, ...(t3 ? t3BindingArtifacts : [])]) {
    if (!entry.output || entry.generated || entry.targets && !entry.targets.includes(adapter.id)) continue;
    const output = join(target, entry.output);
    await mkdir(dirname(output), { recursive: true });
    await cp(join(model.root, entry.path), output);
  }
  if (model.entries.some((entry) => entry.kind === "hook" && entry.targets.includes(adapter.id))) {
    await writeJson(join(target, "hooks", "hooks.json"), {
      hooks: { SessionStart: [{ matcher: "startup|resume|clear|compact", hooks: [{ type: "command",
        command: adapter.id === "codex" ? 'node "${PLUGIN_ROOT}/scripts/codex-routing-hook.mjs"'
          : 'node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-routing-hook.mjs"', timeout: 10,
        ...(adapter.id === "codex" ? { additionalContextLimit: 500 } : {}),
      }] }] },
    });
  }
  await writeText(join(target, "docs", "runtime-binding.md"), t3 ? t3RuntimeBindingGuide(adapter.id) : runtimeBindingGuide(adapter.id));
  await writeText(join(target, "docs", "model-selection.md"), t3 ? t3ModelSelectionGuide() : modelSelectionGuide(adapter.id));

  await writeJson(join(target, "GENERATION.json"), {
    schemaVersion: 1,
    generatedBy: "tools/generate.mjs",
    selection,
    target: adapter.id,
    sourceVersion: model.project.version,
    profiles: adapter.profiles,
    skills: {
      audience: includeProbes ? "all" : "public",
      included: skills.length,
      omittedProbes: includeProbes ? 0 : model.skillCatalog.probes.length,
    },
    claims: {
      delivery: "D0",
      workflow: "W0",
    },
  });

  await writeText(join(target, "LICENSE"), await readFile(join(model.root, "LICENSE"), "utf8"));
  return target;
}

export async function validateRenderedTarget(target, adapter, model, { includeProbes = false, orchestration = model.orchestration ?? "native" } = {}) {
  model = { ...model, orchestration: normalizeOrchestration(orchestration) };
  const t3 = usesT3(model, adapter);
  const selection = targetSelection(model, adapter);
  const skills = packageSkills(model, includeProbes);
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
  assert(generation.skills.audience === (includeProbes ? "all" : "public"), `${adapter.id}: generated Skill audience drift`);
  assert(generation.skills.included === skills.length, `${adapter.id}: generated Skill count drift`);
  assert(generation.skills.omittedProbes === (includeProbes ? 0 : model.skillCatalog.probes.length), `${adapter.id}: omitted probe count drift`);

  for (const skill of skills) {
    const skillPath = join(target, adapter.skillsDir, skill.metadata.name, "SKILL.md");
    await validateSourceTarget(target, skill);
    const frontmatter = parseSkillFrontmatter(await readFile(skillPath, "utf8"), skillPath);
    assert(frontmatter.name === skill.metadata.name, `${adapter.id}: generated skill name drift`);
    if (adapter.id === "codex") {
      assert(await exists(join(dirname(skillPath), "agents", "openai.yaml")), "codex: missing Skill UI metadata");
    }
  }
  for (const name of model.skillCatalog.probes) {
    if (includeProbes) continue;
    assert(!(await exists(join(target, adapter.skillsDir, name))), `${adapter.id}: probe Skill leaked into public package: ${name}`);
  }
  const catalog = await readJson(join(target, "SKILL_CATALOG.json"));
  assert(JSON.stringify(catalog.selection) === JSON.stringify(selection), `${adapter.id}: catalog selection drift`);
  assert(catalog.target === adapter.id, `${adapter.id}: generated Skill catalog target drift`);
  assert(catalog.skills.length === skills.length, `${adapter.id}: generated Skill catalog length drift`);
  assert(catalog.skills.filter((entry) => entry.audience === "public").length === model.skillCatalog.public.length, `${adapter.id}: generated public Skill catalog drift`);
  assert(catalog.skills.filter((entry) => entry.audience === "probe").length === (includeProbes ? model.skillCatalog.probes.length : 0), `${adapter.id}: generated probe Skill catalog drift`);
  for (const role of model.roles) {
    const extension = adapter.id === "codex" ? "toml" : adapter.id === "pi" ? "json" : "md";
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
  for (const entry of model.entries) {
    if (!entry.output || entry.targets && !entry.targets.includes(adapter.id)) continue;
    assert(await exists(join(target, entry.output)), `${adapter.id}: selected resource is missing: ${entry.output}`);
  }
  const routing = model.entries.some((entry) => entry.kind === "hook" && entry.targets.includes(adapter.id));
  assert(Boolean(manifest.hooks) === routing, `${adapter.id}: extension hook declaration drift`);
  assert((await exists(join(target, "hooks", "hooks.json"))) === routing, `${adapter.id}: extension hook files drift`);
  assert(JSON.stringify(generation.selection) === JSON.stringify(selection), `${adapter.id}: selection drift`);
  if (t3) {
    const resources = catalog.resources.filter((entry) => entry.orchestration === "t3");
    assert(JSON.stringify(resources) === JSON.stringify(t3BindingArtifacts), `${adapter.id}: T3 artifact declaration drift`);
    for (const artifact of t3BindingArtifacts) {
      const path = join(target, artifact.output);
      assert(await exists(path), `${adapter.id}: T3 artifact is missing: ${artifact.output}`);
      if (!artifact.generated) {
        assert((await readFile(path)).equals(await readFile(join(model.root, artifact.path))),
          `${adapter.id}: T3 artifact source drift: ${artifact.output}`);
      }
    }
    const contracts = await readJson(join(target, "config", "t3-role-contracts.json"));
    assert(JSON.stringify(contracts) === JSON.stringify(t3RoleContracts(model, adapter, targetRoutes(model, adapter))),
      `${adapter.id}: T3 role contracts drift`);
    for (const [name, expected] of [["runtime-binding.md", t3RuntimeBindingGuide(adapter.id)], ["model-selection.md", t3ModelSelectionGuide()]]) {
      assert(await readFile(join(target, "docs", name), "utf8") === expected, `${adapter.id}: T3 ${name} drift`);
    }
    for (const skill of skills.filter((entry) => !entry.source)) {
      const directory = join(target, adapter.skillsDir, skill.metadata.name);
      const expected = renderSkillDocument(skill, adapter, model);
      const wrapped = adapter.id === "codex" && Buffer.byteLength(expected) > 7500;
      const path = join(directory, wrapped ? "WORKFLOW.md" : "SKILL.md");
      const document = await readFile(path, "utf8");
      assert(document === expected, `${adapter.id}: T3 Skill binding drift: ${skill.metadata.name}`);
      if (wrapped) assert(await readFile(join(directory, "SKILL.md"), "utf8") === codexSkillEntry(expected, skill.metadata.name),
        `${adapter.id}: T3 entry binding drift: ${skill.metadata.name}`);
    }
  }
  if (adapter.id === "pi") {
    assert(await exists(join(target, "extensions", "oms.ts")), "pi: native extension is missing");
    assert(await exists(join(target, "config", "role-contracts.json")), "pi: role contracts are missing");
  }
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

export async function generate({ root = repoRoot, check = false, extensions = [], orchestration = "native", outputRoot = root } = {}) {
  orchestration = normalizeOrchestration(orchestration);
  if (orchestration === "t3") await assertDetachedOutput(root, outputRoot);
  const model = await loadModel(root, { extensions, orchestration });
  outputRoot = resolve(outputRoot);
  await mkdir(join(outputRoot, ".tmp"), { recursive: true });
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
        const differences = await compareTrees(join(stageRoot, adapter.packageDir), join(outputRoot, adapter.packageDir));
        drift.push(...differences.map((path) => `${adapter.packageDir}/${path}`));
      }
      assert(drift.length === 0, `generated packages are stale:\n${drift.map((path) => `- ${path}`).join("\n")}`);
    } else {
      await installGeneratedTargets(outputRoot, stageRoot, model.adapters);
    }
    return model;
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
  }
}

export async function generateProbeTargets({
  root = repoRoot,
  out = join(root, ".tmp", "probe-packages"), extensions = [], orchestration = "native",
} = {}) {
  orchestration = normalizeOrchestration(orchestration);
  if (orchestration === "t3") await assertDetachedOutput(root, out);
  const model = await loadModel(root, { extensions, orchestration });
  if (orchestration === "t3") {
    await mkdir(join(root, ".tmp"), { recursive: true });
    const stageRoot = await mkdtemp(join(root, ".tmp", "generate-probes-"));
    try {
      for (const adapter of model.adapters) {
        const target = await renderTarget(stageRoot, model, adapter, { includeProbes: true });
        await validateRenderedTarget(target, adapter, model, { includeProbes: true });
      }
      await mkdir(join(out, ".tmp"), { recursive: true });
      await installGeneratedTargets(out, stageRoot, model.adapters);
    } finally {
      await rm(stageRoot, { recursive: true, force: true });
    }
    return model;
  }
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const adapter of model.adapters) {
    const target = await renderTarget(out, model, adapter, { includeProbes: true });
    await validateRenderedTarget(target, adapter, model, { includeProbes: true });
  }
  return model;
}

async function main() {
  const options = { extensions: [] };
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--check", "--include-probes"].includes(argument)) continue;
    assert(["--extensions", "--output-root", "--orchestration"].includes(argument), `unknown argument ${argument}`);
    const value = argv[++index]; assert(value && !value.startsWith("--"), `${argument}: value is required`);
    if (argument === "--extensions") options.extensions = value.split(",");
    else if (argument === "--orchestration") options.orchestration = normalizeOrchestration(value);
    else options.outputRoot = resolve(value);
  }
  normalizeExtensions(options.extensions);
  const check = process.argv.includes("--check");
  const includeProbes = process.argv.includes("--include-probes");
  assert(options.orchestration !== "t3" || options.outputRoot, "t3 orchestration requires a detached --output-root");
  assert(!(check && includeProbes), "--check cannot be combined with --include-probes");
  if (includeProbes) {
    const model = await generateProbeTargets({ extensions: options.extensions, orchestration: options.orchestration, ...(options.outputRoot ? { out: options.outputRoot } : {}) });
    console.log(`Generated test-only targets from ${model.skills.length} Skill under .tmp/probe-packages/.`);
    return;
  }
  const model = await generate({ check, ...options });
  console.log(`${check ? "Verified" : "Generated"} ${model.adapters.length} public targets with ${model.skillCatalog.public.length} of ${model.skills.length} source Skill.`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
