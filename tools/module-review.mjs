#!/usr/bin/env node
import { readdir, realpath } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare, localBytes, portablePath, sha256 } from './pstack-source.mjs';
import { readReferenceAdoptions, referenceRepository } from './reference-adoptions.mjs';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const roots = ['src', 'tools', 'scripts', '.github', '.claude-plugin', 'security', 'tests', 'evals/fixtures', 'evals/configs'];
const rootFiles = ['package.json', 'package-lock.json', '.markdownlint-base.json', '.markdownlint-cli2.mjs',
  '.gitignore', '.gitattributes', 'AGENTS.md', 'CONTRIBUTING.md', 'SECURITY.md', 'conformance/scenarios.json', 'conformance/source-observations.json'];
const runtimeTools = new Set(['claude-delegation', 'claude-effort-hook', 'claude-routing-hook', 'claude-transcript-location',
  'codex-delegation', 'codex-routing-hook', 'collect-model-inventory', 'configure-models', 'model-resolution',
  'pi-delegation', 'pi-inventory', 'pi-native-acceptance', 'routing', 'routing-hook', 't3-binding', 't3-orchestration',
  't3-receipts', 'check-omp-install', 'setup-acceptance']);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function moduleFor(path) {
  const parts = path.split('/');
  if (parts[0] === 'src' && parts[1] === 'core' && ['skills', 'roles'].includes(parts[2])) {
    return { id: `${parts[2] === 'skills' ? 'skill' : 'role'}:${parts[3]}`, track: 'workflows' };
  }
  if (path.startsWith('src/core/')) return { id: 'core-metadata', track: 'workflows' };
  if (path.startsWith('src/runtime-resolution/')) return { id: 'model-policy', track: 'runtime' };
  if (['adapters', 'runtime'].includes(parts[1]) && parts[0] === 'src') return { id: `host:${parts[2]}`, track: 'runtime' };
  if (path.startsWith('tools/books/')) return { id: 'book-toolchain', track: 'tooling' };
  if (path.startsWith('tools/')) {
    const name = parts.slice(1).join('/').replace(/\.[^.]+$/, '');
    return { id: `tool:${name}`, track: runtimeTools.has(name) ? 'runtime' : 'tooling' };
  }
  if (path.startsWith('evals/fixtures/')) return { id: `fixture:${parts[2]}`, track: 'tooling' };
  if (path.startsWith('tests/')) return { id: 'test-infrastructure', track: 'tooling' };
  if (path.startsWith('src/schemas/')) return { id: 'schemas', track: 'tooling' };
  if (path.startsWith('src/packaging/')) return { id: 'release-packaging', track: 'tooling' };
  if (path.startsWith('scripts/ops/')) return { id: 'operations-metadata', track: 'tooling' };
  return { id: `support:${parts.length > 1 ? parts.slice(0, -1).join('/') : path}`, track: 'tooling' };
}

/** Enumerate current implementation and verification inputs, never generated/history trees. */
export async function discoverReviewModules({ root = defaultRoot } = {}) {
  root = await realpath(resolve(root));
  const paths = new Set();
  const visit = async path => {
    let entries;
    try { entries = await readdir(join(root, path), { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      if (['node_modules', '.git', '.tmp', '__pycache__'].includes(entry.name)) continue;
      const name = `${path}/${entry.name}`;
      assert(!entry.isSymbolicLink(), `Review scope contains a symlink: ${name}`);
      if (entry.isDirectory()) await visit(name);
      else { assert(entry.isFile(), `Unsupported review input: ${name}`); paths.add(name); }
    }
  };
  for (const path of roots) await visit(path);
  for (const path of rootFiles) if (await localBytes(root, path, true) !== null) paths.add(path);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && ['.mjs', '.cjs', '.js', '.ts', '.py', '.sh'].includes(extname(entry.name))) paths.add(entry.name);
  }
  // Active source governance is reviewed; immutable snapshots, receipts and archives
  // retain their own provenance checks instead of becoming executable modules.
  try {
    for (const entry of await readdir(join(root, 'upstream'), { withFileTypes: true })) {
      if (entry.isFile() && /\.(?:json|yaml|yml)$/.test(entry.name) && entry.name !== 'module-reviews.json') paths.add(`upstream/${entry.name}`);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const modules = new Map();
  for (const path of [...paths].sort()) {
    const owner = moduleFor(path);
    if (!modules.has(owner.id)) modules.set(owner.id, { ...owner, files: [] });
    modules.get(owner.id).files.push({ path, sha256: sha256(await localBytes(root, path)) });
  }
  return [...modules.values()].sort((a, b) => compare(a.id, b.id));
}

/** Coverage and fingerprints prove accounted scope, not optimal design or live-host behavior. */
export async function validateModuleReviews({ root = defaultRoot, sourceState } = {}) {
  root = await realpath(resolve(root));
  const { registry, officialFiles } = sourceState ?? await readReferenceAdoptions({ root });
  const manifest = JSON.parse((await localBytes(root, 'upstream/module-reviews.json')).toString('utf8'));
  assert(manifest.schemaVersion === 1 && manifest.officialRevision === registry.sources.official.assessedRevision
    && manifest.referenceRevision === registry.sources.reference.assessedRevision, 'Module review source revisions are stale');
  const bytes = await localBytes(root, portablePath(manifest.referenceIndex?.path));
  assert(sha256(bytes) === manifest.referenceIndex.sha256, 'Reference review index drift');
  const index = JSON.parse(bytes.toString('utf8'));
  assert(index.repository === referenceRepository && index.revision === manifest.referenceRevision && Array.isArray(index.files), 'Invalid reference review index');
  const referencePaths = new Set();
  for (const file of index.files) {
    const path = portablePath(file.path);
    assert(!referencePaths.has(path) && /^[a-f0-9]{40}$/.test(file.blobSha1) && /^[a-f0-9]{64}$/.test(file.sha256)
      && ['100644', '100755'].includes(file.mode), 'Invalid or duplicate reference index entry');
    referencePaths.add(path);
  }
  assert(Array.isArray(manifest.modules) && manifest.modules.length > 0, 'Module review records are required');
  const actual = new Map((await discoverReviewModules({ root })).map(module => [module.id, module]));
  const seen = new Set();
  for (const module of manifest.modules) {
    assert(!seen.has(module.id), `Duplicate reviewed module: ${module.id}`); seen.add(module.id);
    const current = actual.get(module.id);
    assert(current && current.track === module.track, `Unknown or reassigned reviewed module: ${module.id}`);
    assert(JSON.stringify(current.files) === JSON.stringify(module.files), `Module review drift: ${module.id}; compare both references before refreshing fingerprints`);
    assert(['retain', 'adapt', 'local-only'].includes(module.decision) && typeof module.rationale === 'string' && module.rationale.trim(), `Missing module decision: ${module.id}`);
    for (const [side, allowed] of [['official', new Set(officialFiles.keys())], ['reference', referencePaths]]) {
      assert(Array.isArray(module[side]?.paths) && typeof module[side].rationale === 'string' && module[side].rationale.trim(), `Missing ${side} comparison: ${module.id}`);
      for (const path of module[side].paths) assert(allowed.has(portablePath(path)), `Unknown ${side} counterpart: ${path}`);
    }
    assert(Array.isArray(module.evidence) && module.evidence.length > 0, `Missing module evidence: ${module.id}`);
    for (const path of module.evidence) await localBytes(root, portablePath(path));
  }
  const missing = [...actual.keys()].filter(id => !seen.has(id));
  assert(!missing.length, `Unreviewed active modules: ${missing.join(', ')}`);
  return { modules: actual.size, files: [...actual.values()].reduce((total, module) => total + module.files.length, 0) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, option, selectedRoot, ...extra] = process.argv.slice(2);
    assert(['inventory', 'check'].includes(command) && extra.length === 0
      && (option === undefined || option === '--root' && selectedRoot), 'Usage: module-review.mjs inventory|check [--root OMS_ROOT]');
    const root = selectedRoot ?? defaultRoot;
    console.log(JSON.stringify(command === 'inventory' ? await discoverReviewModules({ root }) : await validateModuleReviews({ root }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
