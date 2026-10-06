import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";

function sourcePath(root, path) {
  assert.equal(typeof path, "string", "source path is required");
  assert(path.split("/").every((part) => /^[A-Za-z0-9_.-]+$/.test(part) && ![".", ".."].includes(part)), `unsafe source path ${path}`);
  return join(root, path);
}

async function regularFile(root, path) {
  const resolved = sourcePath(root, path);
  let current = root;
  for (const part of path.split("/")) {
    current = join(current, part);
    assert(!(await lstat(current)).isSymbolicLink(), `source path traverses a symlink: ${path}`);
  }
  assert((await lstat(resolved)).isFile(), `source is not a regular file: ${path}`);
  return resolved;
}

async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), `source symlink is unsupported: ${path}`);
    if (entry.isDirectory()) files.push(...await listFiles(join(directory, entry.name), path));
    else { assert(entry.isFile(), `unsupported source entry ${path}`); files.push(path); }
  }
  return files.sort();
}

export async function loadSourceSkills(root, parseFrontmatter, registry) {
  const manifestPath = join(root, "upstream/source-skills.json");
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  assert.equal(manifest.schemaVersion, 1, "unsupported source-skills schema");
  assert(Array.isArray(manifest.sources), "source-skills.sources must be an array");
  const skills = [];
  const sourceIds = new Set();
  for (const source of manifest.sources) {
    assert(/^[a-z][a-z0-9-]*$/.test(source.id) && !sourceIds.has(source.id), `invalid or duplicate source ${source.id}`);
    sourceIds.add(source.id);
    assert(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository), `invalid source repository ${source.id}`);
    assert(/^[a-f0-9]{40}$/.test(source.revision), `source ${source.id}: immutable revision is required`);
    assert.equal(source.snapshot, `upstream/snapshots/${source.id}/${source.revision}`, "source snapshot must match its coordinate");
    assert.equal(source.license, "MIT", "review the source license before adding another license type");
    assert.equal(source.adaptations.length, 0, "source text adaptations require an explicit renderer");
    const snapshot = sourcePath(root, source.snapshot);
    const recorded = new Set();
    for (const file of source.files) {
      assert(!recorded.has(file.path), `duplicate source file ${file.path}`);
      recorded.add(file.path);
      const path = await regularFile(root, `${source.snapshot}/${file.path}`);
      assert.equal(createHash("sha256").update(await readFile(path)).digest("hex"), file.sha256, `source hash drift: ${source.id}/${file.path}`);
    }
    assert(recorded.has(source.licensePath), `source ${source.id}: license is not pinned`);
    const names = new Set();
    const sourceEntries = [];
    for (const selected of source.skills) {
      const skillPath = `${selected.path}/SKILL.md`;
      assert(recorded.has(skillPath), `missing original ${skillPath}`);
      const directory = sourcePath(snapshot, selected.path);
      const files = await listFiles(directory);
      assert.deepEqual(files, source.files.filter((file) => file.path.startsWith(`${selected.path}/`))
        .map((file) => file.path.slice(selected.path.length + 1)).sort(), `source ${selected.path}: unrecorded resource`);
      const text = await readFile(join(directory, "SKILL.md"), "utf8");
      const frontmatter = parseFrontmatter(text, skillPath);
      assert(!names.has(frontmatter.name), `duplicate source skill ${frontmatter.name}`);
      names.add(frontmatter.name);
      assert.equal(dirname(skillPath).split("/").at(-1), frontmatter.name, "source folder/name mismatch");
      for (const requirement of selected.requires) assert(registry.has(requirement), `unknown source requirement ${requirement}`);
      sourceEntries.push({
        directory, text, frontmatter,
        metadata: { schemaVersion: 1, name: frontmatter.name,
          invocation: frontmatter["disable-model-invocation"] === "true" ? "explicit" : "automatic",
          deliveryTarget: "D3", workflowTarget: selected.requires.includes("agents.spawn") ? "W2" : "W1",
          requires: selected.requires, fallbacks: {} },
        source: { id: source.id, name: source.name, repository: source.repository, revision: source.revision,
          path: selected.path, license: source.license, licenseFile: sourcePath(snapshot, source.licensePath),
          files: source.files.filter((file) => file.path.startsWith(`${selected.path}/`)), dependencies: selected.dependencies,
          adaptations: source.adaptations },
      });
    }
    for (const skill of sourceEntries) {
      for (const dependency of skill.source.dependencies) assert(names.has(dependency), `source dependency is missing: ${skill.metadata.name} -> ${dependency}`);
    }
    skills.push(...sourceEntries);
  }
  return skills;
}

export function sourceCoordinate(source) {
  return { id: source.id, repository: source.repository, revision: source.revision,
    path: source.path, license: source.license, dependencies: source.dependencies, adaptations: source.adaptations };
}

export async function validateSourceTarget(target, skill) {
  if (!skill.source) return;
  const directory = join(target, "skills", skill.metadata.name);
  for (const file of skill.source.files) {
    const path = file.path.slice(skill.source.path.length + 1);
    const bytes = await readFile(await regularFile(directory, path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256,
      `original source changed in package: ${skill.metadata.name}/${path}`);
  }
  assert.equal(await readFile(join(directory, "LICENSE"), "utf8"),
    await readFile(skill.source.licenseFile, "utf8"), "packaged source license changed");
  assert.deepEqual(JSON.parse(await readFile(join(directory, "SOURCE.json"), "utf8")),
    sourceCoordinate(skill.source), "packaged source coordinate changed");
}
