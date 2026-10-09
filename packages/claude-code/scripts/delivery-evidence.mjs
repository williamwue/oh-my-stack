#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { promises as fs, constants as FS } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareImages } from './delivery-image-diff.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value);
const digest = value => hash(canonical(value));
const fail = message => { throw new Error(message); };
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function object(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected object');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`Unsupported field: ${key}`);
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`Missing field: ${key}`);
}
function string(value, name) { if (typeof value !== 'string' || !value.trim() || value.includes('\0')) fail(`Invalid ${name}`); }
function array(value, name) { if (!Array.isArray(value)) fail(`Invalid ${name}`); }
function integer(value, min, max, name) { if (!Number.isSafeInteger(value) || value < min || value > max) fail(`Invalid ${name}`); }
function unique(values, name) { if (new Set(values).size !== values.length) fail(`Duplicate ${name}`); }
function relative(value) {
  string(value, 'path');
  if (path.isAbsolute(value) || value.includes('\\') || value.split('/').some(p => p === '..' || !p) || value !== path.posix.normalize(value)) fail(`Unsafe path: ${value}`);
  return value;
}
const under = (file, prefix) => prefix === '.' || file === prefix || file.startsWith(`${prefix}/`);
async function safe(root, rel, type = 'file', missing = false) {
  relative(rel);
  let current = root;
  for (const part of rel.split('/').filter(p => p !== '.')) {
    current = path.join(current, part);
    let stat;
    try { stat = await fs.lstat(current); } catch (error) { if (missing && error.code === 'ENOENT') return path.join(root,rel); throw error; }
    if (stat.isSymbolicLink()) fail(`Symlink forbidden: ${rel}`);
    if (current !== path.join(root, rel) && !stat.isDirectory()) fail(`Non-directory path: ${rel}`);
  }
  if (!missing) {
    const stat = await fs.lstat(current);
    if (type === 'file' && !stat.isFile()) fail(`Nonregular file: ${rel}`);
    if (type === 'directory' && !stat.isDirectory()) fail(`Not directory: ${rel}`);
  }
  return current;
}
async function bytes(root, rel) { return fs.readFile(await safe(root, rel)); }
async function json(root, rel) { return JSON.parse(await bytes(root, rel)); }
async function pin(root, rel) { return { path: rel, sha256: hash(await bytes(root, rel)) }; }
async function rootPath(root) {
  const resolved = path.resolve(root);
  if ((await fs.lstat(resolved)).isSymbolicLink()) fail('Root must not be a symlink');
  return fs.realpath(resolved);
}
async function inventory(root, roots, excludes) {
  const files = new Map();
  async function visit(rel) {
    if (excludes.some(exclude => under(rel, exclude))) return;
    const absolute = await safe(root, rel, 'any');
    const stat = await fs.lstat(absolute);
    if (stat.isDirectory()) {
      for (const name of (await fs.readdir(absolute)).sort()) await visit(rel === '.' ? name : `${rel}/${name}`);
    } else if (stat.isFile()) files.set(rel, await pin(root, rel));
    else fail(`Nonregular source: ${rel}`);
  }
  for (const rel of roots) await visit(rel);
  return [...files.values()].sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
function validatePins(list, name) {
  array(list, name);
  for (const item of list) { object(item, ['path', 'sha256']); relative(item.path); if (!isHash(item.sha256)) fail(`Invalid ${name} hash`); }
  unique(list.map(item => item.path), name);
  if (canonical(list) !== canonical([...list].sort((a, b) => a.path.localeCompare(b.path, 'en')))) fail(`${name} must be ordered`);
}
function authority(value) {
  if (value === undefined) return;
  if (value.kind === 'codex-native') {
    object(value, ['kind','requestPath','parentRecordPath','childRecordPath','assignmentId']);
    relative(value.requestPath); for (const key of ['parentRecordPath','childRecordPath']) { string(value[key],'native record path'); if (!path.isAbsolute(value[key])) relative(value[key]); } string(value.assignmentId,'assignment ID');
  } else {
    object(value, ['kind', 'recordPath', 'taskId']);
    string(value.kind, 'authority kind'); relative(value.recordPath); string(value.taskId, 'authority task ID');
  }
}
function coordinate(value, root) { return value && (value.kind === 'codex-native' ? canonical({kind:value.kind,childRecordPath:path.resolve(root,value.childRecordPath)}) : canonical({kind:value.kind,recordPath:path.resolve(root,value.recordPath),taskId:value.taskId})); }
function validatePlan(plan) {
  object(plan, ['version','taskId','mode','predicate','sourceRoots','sourceExcludes','immutablePaths','candidates','units','checks','requiredCombinedCheck','narrow','visual','nativeParentId','assignments'], ['version','taskId','mode','predicate','sourceRoots','immutablePaths','candidates','units','checks','requiredCombinedCheck']);
  if (plan.version !== 1 || !['full','narrow'].includes(plan.mode)) fail('Unsupported version or mode');
  string(plan.taskId, 'task ID'); string(plan.predicate, 'predicate');
  if (plan.nativeParentId !== undefined) {
    string(plan.nativeParentId, 'native parent ID'); array(plan.assignments,'assignments');
    for (const assignment of plan.assignments) { object(assignment,['id','taskName','kind']); string(assignment.id,'assignment ID'); string(assignment.taskName,'task name'); if (!['writer','review'].includes(assignment.kind)) fail('Invalid assignment kind'); }
    unique(plan.assignments.map(item => item.id),'assignments'); unique(plan.assignments.map(item => item.taskName),'task names');
  } else if (plan.assignments !== undefined) fail('Assignments require native parent');
  for (const key of ['sourceRoots','immutablePaths','sourceExcludes']) {
    if (plan[key] === undefined && key === 'sourceExcludes') continue;
    array(plan[key], key); plan[key].forEach(relative); unique(plan[key], key);
  }
  if (!plan.sourceRoots.length || !plan.immutablePaths.length) fail('Source roots and immutable harness paths required');
  for (const exclude of plan.sourceExcludes ?? []) if (!plan.sourceRoots.some(root => under(exclude, root))) fail('Exclusion outside source roots');
  object(plan.candidates, ['count','panel'], []);
  if (plan.candidates.count !== undefined) integer(plan.candidates.count, plan.mode === 'narrow' && plan.narrow?.omittedFullRequirements?.includes('design') ? 0 : 2, 100, 'candidate count');
  if (plan.candidates.panel) { object(plan.candidates.panel, ['path','pointer']); relative(plan.candidates.panel.path); if (typeof plan.candidates.panel.pointer !== 'string' || !plan.candidates.panel.pointer.startsWith('/')) fail('Invalid panel JSON pointer'); }
  if (!plan.candidates.panel && plan.candidates.count === undefined) fail('At least two unconfigured candidates required');
  array(plan.units, 'units'); if (!plan.units.length) fail('Units required');
  for (const unit of plan.units) {
    object(unit, ['id','ownedPaths','delegated']); string(unit.id, 'unit ID'); array(unit.ownedPaths, 'owned paths');
    if (!unit.ownedPaths.length || typeof unit.delegated !== 'boolean') fail('Invalid unit ownership');
    unit.ownedPaths.forEach(relative); unique(unit.ownedPaths, 'owned paths');
    for (const owned of unit.ownedPaths) if (!plan.sourceRoots.some(root => under(owned, root))) fail('Unit ownership outside source roots');
  }
  unique(plan.units.map(unit => unit.id), 'units');
  for (let i = 0; i < plan.units.length; i++) for (let j = i + 1; j < plan.units.length; j++) for (const a of plan.units[i].ownedPaths) for (const b of plan.units[j].ownedPaths) if (under(a,b) || under(b,a)) fail('Overlapping unit ownership');
  array(plan.checks, 'checks');
  for (const check of plan.checks) {
    object(check, ['id','argv','cwd','timeoutMs','outputLimitBytes','required']); string(check.id, 'check ID');
    array(check.argv, 'argv'); if (!check.argv.length) fail('Empty argv'); check.argv.forEach(arg => { if (typeof arg !== 'string' || arg.includes('\0')) fail('Invalid argv'); });
    string(check.argv[0], 'executable'); relative(check.cwd); integer(check.timeoutMs, 1, 120000, 'timeout'); integer(check.outputLimitBytes, 1, 1048576, 'output limit');
    if (typeof check.required !== 'boolean') fail('Invalid required check');
  }
  unique(plan.checks.map(check => check.id), 'checks');
  if (!plan.checks.some(check => check.id === plan.requiredCombinedCheck && check.required)) fail('Required combined check missing');
  if (plan.mode === 'narrow') {
    object(plan.narrow, ['reason','omittedFullRequirements']); string(plan.narrow.reason, 'narrow reason'); array(plan.narrow.omittedFullRequirements, 'omissions');
    if (!plan.narrow.omittedFullRequirements.length || plan.narrow.omittedFullRequirements.some(value => !['design','visual'].includes(value))) fail('Invalid explicit full omissions');
    unique(plan.narrow.omittedFullRequirements, 'omissions');
  } else if (plan.narrow !== undefined) fail('Full plan cannot contain narrow exception');
  if (plan.visual !== undefined) {
    object(plan.visual, ['comparatorVersion','captureConfigPath','states']);
    if (plan.visual.comparatorVersion !== 'png-rgba-v1') fail('Unsupported comparator');
    relative(plan.visual.captureConfigPath); array(plan.visual.states, 'visual states'); if (!plan.visual.states.length) fail('Visual states required');
    for (const state of plan.visual.states) {
      object(state, ['id','baselinePath','width','height','maxChangedPixels','maxChannelDelta']); string(state.id, 'state ID'); relative(state.baselinePath);
      integer(state.width, 1, 16384, 'width'); integer(state.height, 1, 16384, 'height'); integer(state.maxChangedPixels, 0, state.width * state.height, 'pixel bound'); integer(state.maxChannelDelta, 0, 255, 'channel bound');
    }
    unique(plan.visual.states.map(state => state.id), 'visual states');
    if (plan.narrow?.omittedFullRequirements.includes('visual')) fail('Visual contract cannot be omitted');
  }
}
async function executable(command) {
  const options = command === 'node' ? [process.execPath] : path.isAbsolute(command) ? [command] : (process.env.PATH ?? '').split(path.delimiter).map(dir => path.join(dir, command));
  for (const candidate of options) {
    try { await fs.access(candidate, FS.X_OK); const resolved = await fs.realpath(candidate); if ((await fs.stat(resolved)).isFile()) return { path: resolved, sha256: hash(await fs.readFile(resolved)) }; } catch { /* next PATH candidate */ }
  }
  fail(`Executable unavailable: ${command}`);
}
function outputOutside(plan, rel) {
  relative(rel);
  if (plan.sourceRoots.some(root => under(rel, root)) && !(plan.sourceExcludes ?? []).some(exclude => under(rel, exclude))) fail(`Task output overlaps source: ${rel}`);
}
async function writeAtomic(root, rel, value, exclusive = false, raw = false) {
  const content = raw ? value : `${JSON.stringify(value, null, 2)}\n`;
  const target = await safe(root, rel, 'file', true);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await safe(root, path.posix.dirname(rel), 'directory');
  if (exclusive) { await fs.writeFile(target, content, { flag: 'wx' }); return; }
  const tempRel = `${rel}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
  const temp = await safe(root, tempRel, 'file', true);
  try { await fs.writeFile(temp, content, { flag: 'wx' }); await fs.rename(temp, target); } finally { await fs.rm(temp, { force: true }); }
}

async function panelEntries(root, plan) {
  if (!plan.candidates.panel) return [];
  let selected = await json(root,plan.candidates.panel.path);
  for (const part of plan.candidates.panel.pointer.slice(1).split('/')) {
    const key = part.replaceAll('~1','/').replaceAll('~0','~');
    if (!selected || typeof selected !== 'object' || !Object.hasOwn(selected,key)) fail('Panel pointer missing');
    selected = selected[key];
  }
  if (!Array.isArray(selected) || !selected.length || selected.some(item => item === null || Array.isArray(item) || !['object','string'].includes(typeof item))) fail('Panel must be a nonempty ordered entry array');
  return selected;
}
function requiredCandidateSlots(plan, entries) {
  const count = Math.max(plan.candidates.count ?? 0,entries.length,plan.mode === 'full' || !plan.narrow.omittedFullRequirements.includes('design') ? 2 : 0);
  return Array.from({length:count},(_,slot) => ({slot,panelIndex:entries.length ? slot % entries.length : null,entrySha256:entries.length ? digest(entries[slot % entries.length]) : null}));
}
function explicitPanelSelection(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  if (entry.reasoning !== undefined && entry.reasoning_effort !== undefined && entry.reasoning !== entry.reasoning_effort) fail('Conflicting configured panel reasoning aliases');
  // These are resolved selection fields, not model-name heuristics or a resolver.
  if (entry.inheritParent === true || entry.inheritParent !== undefined && entry.inheritParent !== false) return null;
  const reasoning = entry.reasoning ?? entry.reasoning_effort;
  if (typeof entry.model !== 'string' || !entry.model.trim() || typeof reasoning !== 'string' || !reasoning.trim()) return null;
  if (Object.keys(entry).some(key => !['model','reasoning','reasoning_effort','inheritParent','agent'].includes(key))) return null;
  return {model:entry.model,reasoning};
}
async function destinationOwner(state, out) {
  const protectedPaths = new Set(), protectedFiles = new Set();
  const identity = stat => `${stat.dev}:${stat.ino}`;
  const sourceRoots = await Promise.all(state.lock.plan.sourceRoots.map(async rel => ({logical:rel,canonical:await fs.realpath(path.resolve(state.root,rel))})));
  for (const rel of [...state.protectedPaths,...state.lock.executables.map(item => item.path)]) {
    const absolute = path.resolve(state.root,rel);
    protectedPaths.add(await fs.realpath(absolute));
    protectedFiles.add(identity(await fs.stat(absolute)));
  }
  const destinations = [out,...(state.lock.plan.visual?.states ?? []).map((_,index) => `${out}.visual-${index}.png`)];
  const validate = async rel => {
    outputOutside(state.lock.plan,rel);
    const absolute = await safe(state.root,rel,'file',true);
    let canonicalPath, stat;
    try { canonicalPath = await fs.realpath(absolute); stat = await fs.lstat(absolute); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      let ancestor = path.dirname(absolute), suffix = [path.basename(absolute)];
      while (true) {
        try { canonicalPath = path.join(await fs.realpath(ancestor),...suffix); break; }
        catch (error) { if (error.code !== 'ENOENT') throw error; suffix.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor); }
      }
    }
    if (stat && !stat.isFile()) fail('Report destination must be a regular file');
    if (sourceRoots.some(root => {
      const rel = path.relative(root.canonical,canonicalPath);
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return false;
      const logical = path.posix.join(root.logical,rel.split(path.sep).join('/'));
      return !(state.lock.plan.sourceExcludes ?? []).some(excluded => under(logical,excluded));
    })) fail('Report or diff cannot be inside a source root');
    if (protectedPaths.has(canonicalPath) || stat && protectedFiles.has(identity(stat))) fail('Report or diff cannot replace locked evidence, authority or harness');
  };
  for (const rel of destinations) await validate(rel);
  return async (rel,value,raw=false) => {
    if (!destinations.includes(rel)) fail('Unreserved report destination');
    await validate(rel);
    await writeAtomic(state.root,rel,value,false,raw);
  };
}

export async function freezeAcceptance(options) {
  object(options,['root','plan','out']);
  let {root,plan:planPath,out} = options;
  root = await rootPath(root); relative(planPath); relative(out);
  const plan = await json(root, planPath); validatePlan(plan); outputOutside(plan, out);
  const pins = new Set(plan.immutablePaths);
  const entries = await panelEntries(root,plan);
  if (plan.candidates.panel) pins.add(plan.candidates.panel.path);
  if (plan.visual) { pins.add(plan.visual.captureConfigPath); for (const state of plan.visual.states) pins.add(state.baselinePath); }
  const candidateSlots = requiredCandidateSlots(plan,entries);
  const executables = [];
  for (const check of plan.checks) {
    await safe(root, check.cwd, 'directory'); executables.push({ id: check.id, ...await executable(check.argv[0]) });
    for (const arg of check.argv.slice(1)) {
      if (arg.startsWith('-') || path.isAbsolute(arg)) continue;
      const rel = path.posix.normalize(path.posix.join(check.cwd, arg));
      let stat; try { stat = await fs.lstat(path.join(root, rel)); } catch { continue; }
      if (stat.isFile() && !pins.has(rel)) fail(`Check argv file must be immutable: ${rel}`);
    }
  }
  const immutable = await Promise.all([...pins].sort((a,b) => a.localeCompare(b, 'en')).map(rel => pin(root, rel)));
  const baselineSource = await inventory(root, plan.sourceRoots, plan.sourceExcludes ?? []);
  const lock = { version: 1, plan, candidateSlots, immutable, executables, baselineSource };
  await writeAtomic(root, out, lock, true);
  return { lockPath: out, lockSha256: hash(await bytes(root, out)), candidateSlots, baselineSource };
}
function report(mode = null) { return { version: 1, mode, acceptance: 'not-assessed', structure: { status: 'unverified', errors: [] }, behavior: { status: 'unverified', observations: [] }, visual: { status: 'not-required', observations: [], captureAuthenticity: 'unverified' }, provenance: { status: 'not-required', gaps: [] }, external: { status: 'unassessed' } }; }
async function readState(options, result) {
  const root = await rootPath(options.root);
  if (!isHash(options.expectedLockSha256)) fail('External expected lock SHA-256 required');
  const lockBytes = await bytes(root, options.lock);
  if (hash(lockBytes) !== options.expectedLockSha256) fail('External lock digest mismatch');
  const lock = JSON.parse(lockBytes);
  object(lock, ['version','plan','candidateSlots','immutable','executables','baselineSource']);
  if (lock.version !== 1) fail('Unsupported lock version'); validatePlan(lock.plan); result.mode = lock.plan.mode; result.claimCeiling = `local-${lock.plan.mode}-delivery-evidence`; result.upstreamEquivalence = 'unassessed'; result.sourceExcludes = lock.plan.sourceExcludes ?? [];
  validatePins(lock.immutable, 'immutable'); validatePins(lock.baselineSource, 'baseline source');
  array(lock.candidateSlots,'candidate slots'); array(lock.executables,'executables');
  for (const [index,slot] of lock.candidateSlots.entries()) { object(slot,['slot','panelIndex','entrySha256']); if (slot.slot !== index || slot.panelIndex !== null && (!Number.isSafeInteger(slot.panelIndex) || slot.panelIndex < 0) || slot.entrySha256 !== null && !isHash(slot.entrySha256)) fail('Invalid candidate slot'); }
  const requiredPins = [...lock.plan.immutablePaths,...(lock.plan.candidates.panel ? [lock.plan.candidates.panel.path] : []),...(lock.plan.visual ? [lock.plan.visual.captureConfigPath,...lock.plan.visual.states.map(item => item.baselinePath)] : [])];
  if (requiredPins.some(rel => !lock.immutable.some(item => item.path === rel))) fail('Required immutable pin absent');
  for (const item of lock.immutable) if (hash(await bytes(root, item.path)) !== item.sha256) fail(`Immutable pin mismatch: ${item.path}`);
  for (const item of lock.executables) { object(item,['id','path','sha256']); if (!path.isAbsolute(item.path) || !isHash(item.sha256) || hash(await fs.readFile(item.path)) !== item.sha256) fail('Executable pin mismatch'); }
  if (lock.executables.length !== lock.plan.checks.length || lock.executables.some((item, i) => item.id !== lock.plan.checks[i].id)) fail('Executable mapping mismatch');
  const entries = await panelEntries(root,lock.plan);
  if (canonical(lock.candidateSlots) !== canonical(requiredCandidateSlots(lock.plan,entries))) fail('Frozen candidate slot mapping mismatch');
  const evidenceBytes = await bytes(root,options.evidence);
  const evidence = JSON.parse(evidenceBytes); outputOutside(lock.plan, options.lock); outputOutside(lock.plan, options.evidence);
  object(evidence,['version','taskId','lockSha256','finalSource','artifacts','units','reviews','design','captures'], ['version','taskId','lockSha256','finalSource','artifacts','units','reviews']);
  if (evidence.version !== 1 || evidence.taskId !== lock.plan.taskId || evidence.lockSha256 !== options.expectedLockSha256) fail('Evidence task or lock mismatch');
  validatePins(evidence.finalSource,'final source');
  const finalSource = await inventory(root,lock.plan.sourceRoots,lock.plan.sourceExcludes ?? []);
  if (canonical(finalSource) !== canonical(evidence.finalSource)) fail('Final source inventory mismatch (added, deleted or changed files)');
  array(evidence.artifacts,'artifacts'); const artifacts = new Map();
  const tracked = new Set([options.lock, options.evidence, ...lock.immutable.map(item => item.path)]);
  for (const item of evidence.artifacts) {
    object(item,['id','path','sha256','authority'],['id','path','sha256']); string(item.id,'artifact ID'); relative(item.path); authority(item.authority);
    if (!(await bytes(root,item.path)).length) fail(`Empty artifact: ${item.id}`);
    if (!isHash(item.sha256) || hash(await bytes(root,item.path)) !== item.sha256) fail(`Artifact hash mismatch: ${item.id}`);
    if (artifacts.has(item.id)) fail('Duplicate artifact ID'); artifacts.set(item.id,item); tracked.add(item.path);
  }
  array(evidence.units,'unit evidence'); unique(evidence.units.map(item => item.id),'unit evidence');
  if (evidence.units.length !== lock.plan.units.length) fail('Unit evidence inventory mismatch');
  const units = new Map();
  for (const unit of lock.plan.units) {
    const item = evidence.units.find(value => value.id === unit.id); if (!item) fail(`Missing unit: ${unit.id}`);
    object(item,['id','outputDigest','authority'],['id','outputDigest']); authority(item.authority);
    const owned = finalSource.filter(file => unit.ownedPaths.some(prefix => under(file.path,prefix)));
    if (!owned.length) fail(`Empty owned source tree: ${unit.id}`);
    if (!isHash(item.outputDigest) || item.outputDigest !== digest(owned)) fail(`Unit output digest mismatch: ${unit.id}`);
    units.set(unit.id,item);
  }
  const attributionRequests = [];
  const needAuthority = (value, name, outputs, reviews = []) => { attributionRequests.push({authority:value,name,outputs,reviews}); };
  result.requiredCandidateSlots = lock.candidateSlots;
  result.finalSourceSha256 = digest(finalSource);
  try {
  array(evidence.reviews,'reviews'); unique(evidence.reviews.map(item => item.id),'review IDs'); unique(evidence.reviews.map(item => item.unitId),'review targets'); unique(evidence.reviews.map(item => item.artifactId),'review artifacts');
  for (const review of evidence.reviews) {
    object(review,['id','unitId','artifactId','targetDigest','authority'],['id','unitId','artifactId','targetDigest']); string(review.id,'review ID'); authority(review.authority);
    const unit = units.get(review.unitId); if (!unit || !artifacts.has(review.artifactId)) fail('Unknown review target or artifact');
    if (review.targetDigest !== unit.outputDigest) fail('Stale review target digest');
    if (review.authority && coordinate(review.authority,root) === coordinate(unit.authority,root)) fail('Self-review is forbidden');
    const artifactAuthority = artifacts.get(review.artifactId).authority;
    if (artifactAuthority && coordinate(artifactAuthority,root) !== coordinate(review.authority,root)) fail('Review artifact authority mismatch');
  }
  for (const unit of lock.plan.units.filter(item => item.delegated)) {
    const writer = units.get(unit.id); const review = evidence.reviews.find(item => item.unitId === unit.id);
    if (!review) fail(`Missing delegated review: ${unit.id}`);
    needAuthority(writer.authority,`writer ${unit.id}`,finalSource.filter(file => unit.ownedPaths.some(prefix => under(file.path,prefix))).map(file => ({id:file.path,...file})));
    const reviewArtifact = artifacts.get(review.artifactId);
    needAuthority(review.authority,`review ${unit.id}`,[{id:reviewArtifact.id,path:reviewArtifact.path,sha256:reviewArtifact.sha256}],[{id:unit.id,sha256:writer.outputDigest}]);
  }
  const requireDesign = lock.plan.mode === 'full' || !lock.plan.narrow.omittedFullRequirements.includes('design');
  if (requireDesign) {
    object(evidence.design,['candidates','comparisonArtifactId','comparedSlots','selectedSlot','decisionArtifactId','reviewTargets']); array(evidence.design.candidates,'design candidates');
    if (evidence.design.candidates.length !== lock.candidateSlots.length) fail('Design candidate count mismatch');
    const authors = [];
    for (let slot = 0; slot < lock.candidateSlots.length; slot++) {
      const candidate = evidence.design.candidates[slot]; object(candidate,['slot','artifactId']);
      if (candidate.slot !== slot || !artifacts.has(candidate.artifactId)) fail('Candidate ordering or artifact mismatch');
      const item = artifacts.get(candidate.artifactId); needAuthority(item.authority,`candidate ${slot}`,[{id:item.id,path:item.path,sha256:item.sha256}]); authors.push(coordinate(item.authority,root));
    }
    unique(evidence.design.candidates.map(item => item.artifactId),'candidate artifacts');
    if (canonical(evidence.design.comparedSlots) !== canonical(lock.candidateSlots.map(item => item.slot))) fail('Incomplete comparative judgment');
    integer(evidence.design.selectedSlot,0,lock.candidateSlots.length - 1,'selected slot');
    const comparison = artifacts.get(evidence.design.comparisonArtifactId);
    if (!comparison || !artifacts.has(evidence.design.decisionArtifactId)) fail('Missing comparison or root decision');
    unique([...evidence.design.candidates.map(item => item.artifactId),evidence.design.comparisonArtifactId,evidence.design.decisionArtifactId],'design graph artifact identities');
    if (comparison.authority && authors.includes(coordinate(comparison.authority,root))) fail('Self design judgment forbidden');
    const expectedTargets = evidence.design.candidates.map(candidate => { const item = artifacts.get(candidate.artifactId); return {id:item.id,sha256:item.sha256}; });
    if (canonical(evidence.design.reviewTargets) !== canonical(expectedTargets)) fail('Stale comparative review targets');
    needAuthority(comparison.authority,'design judgment',[{id:comparison.id,path:comparison.path,sha256:comparison.sha256}],expectedTargets);
  } else if (evidence.design !== undefined) fail('Design evidence unsupported for omitted design requirement');
  const nativeResults = [];
  unique(attributionRequests.filter(item => item.authority?.kind === 'codex-native').map(item => item.authority.assignmentId),'required native assignments');
  for (const request of attributionRequests) {
    if (request.authority?.kind === 'codex-native' && lock.plan.nativeParentId) {
      const assignment = lock.plan.assignments.find(item => item.id === request.authority.assignmentId);
      if (!assignment || assignment.kind !== (request.reviews.length ? 'review' : 'writer')) fail('Unknown assignment or assignment role mismatch');
      const expectedAssignment = {assignmentId:assignment.id,taskName:assignment.taskName,kind:assignment.kind};
      const { verifyNativeAttribution } = await import('./delivery-native-attribution.mjs');
      const observation = await verifyNativeAttribution({root,authority:request.authority,taskId:lock.plan.taskId,lockSha256:options.expectedLockSha256,expectedParentId:lock.plan.nativeParentId,expectedAssignment,outputs:request.outputs,reviews:request.reviews});
      nativeResults.push({name:request.name,...observation});
      if (observation.status !== 'verified') result.provenance.gaps.push(`${request.name}: ${observation.code ?? 'INDEPENDENCE_UNVERIFIED'}`);
    } else result.provenance.gaps.push(`${request.name}: ${request.authority ? 'INDEPENDENCE_UNVERIFIED' : 'MISSING_AUTHORITY'}`);
  }
  result.provenance.observations = nativeResults;
  for (const observation of nativeResults.filter(item => item.status === 'rejected')) { result.structure.status = 'rejected'; result.structure.errors.push(`Native attribution rejected: ${observation.name}: ${observation.code ?? observation.reason ?? 'invalid record'}`); }
  const nativeId = name => nativeResults.find(item => item.name === name && item.status === 'verified')?.childId;
  for (const unit of lock.plan.units.filter(item => item.delegated)) if (nativeId(`writer ${unit.id}`) && nativeId(`writer ${unit.id}`) === nativeId(`review ${unit.id}`)) fail('Native self-review is forbidden');
  const candidateIds = nativeResults.filter(item => item.name.startsWith('candidate ') && item.status === 'verified').map(item => item.childId);
  unique(candidateIds,'native candidate task identities');
  if (nativeId('design judgment') && candidateIds.includes(nativeId('design judgment'))) fail('Native self design judgment forbidden');
  unique(nativeResults.filter(item => item.status === 'verified').map(item => item.childId),'required native task identities');
  result.provenance.panelSelection = {status:entries.length && requireDesign ? 'unverified' : 'not-required',observations:[]};
  if (entries.length && requireDesign) {
    for (const slot of lock.candidateSlots) {
      const expected = explicitPanelSelection(entries[slot.panelIndex]);
      const observed = nativeResults.find(item => item.name === `candidate ${slot.slot}` && item.status === 'verified');
      const status = !expected || !observed ? 'unverified' : observed.model === expected.model && observed.reasoningEffort === expected.reasoning ? 'verified' : 'rejected';
      result.provenance.panelSelection.observations.push({slot:slot.slot,panelIndex:slot.panelIndex,entrySha256:slot.entrySha256,status,expected,...(observed ? {model:observed.model,reasoningEffort:observed.reasoningEffort} : {})});
      if (!expected || !observed) result.provenance.gaps.push(`candidate ${slot.slot}: PANEL_SELECTION_UNVERIFIED`);
      else if (status === 'rejected') { result.provenance.panelSelection.status = 'rejected'; fail(`Configured panel model or effort mismatch: candidate ${slot.slot}`); }
    }
    result.provenance.panelSelection.status = result.provenance.panelSelection.observations.every(item => item.status === 'verified') ? 'verified' : 'unverified';
  }
  result.provenance.status = result.provenance.gaps.length ? 'unverified' : attributionRequests.length ? 'verified' : 'not-required';
  } catch (error) { result.structure.status = 'rejected'; result.structure.errors.push(error.message); result.provenance.status = 'unverified'; }
  if (lock.plan.visual) {
    result.visual.status = 'unverified'; array(evidence.captures,'captures');
    if (evidence.captures.length !== lock.plan.visual.states.length) fail('Capture count mismatch'); unique(evidence.captures.map(item => item.stateId),'capture states');
    for (const state of lock.plan.visual.states) {
      const capture = evidence.captures.find(item => item.stateId === state.id); if (!capture) fail(`Missing capture: ${state.id}`);
      object(capture,['stateId','path','sha256']); relative(capture.path);
      if (!isHash(capture.sha256) || hash(await bytes(root,capture.path)) !== capture.sha256) fail('Capture hash mismatch'); tracked.add(capture.path);
    }
  } else if (evidence.captures !== undefined) fail('Unexpected visual captures');
  const nativeRecordPaths = new Set();
  const nativeParents = new Map();
  for (const observation of result.provenance.observations ?? []) if (observation.status === 'verified' && observation.recordAudit?.parent) {
    const audit = observation.recordAudit.parent, record = path.resolve(root,audit.path);
    if (!nativeParents.has(record)) nativeParents.set(record,[]);
    nativeParents.get(record).push({name:observation.name,...audit});
  }
  for (const ref of [...evidence.artifacts.map(item => item.authority), ...evidence.units.map(item => item.authority), ...evidence.reviews.map(item => item.authority)].filter(Boolean)) {
    if (ref.kind === 'codex-native' && !nativeParents.has(path.resolve(root,ref.parentRecordPath))) nativeParents.set(path.resolve(root,ref.parentRecordPath),null);
    for (const rel of ref.kind === 'codex-native' ? [ref.requestPath,ref.parentRecordPath,ref.childRecordPath] : [ref.recordPath]) {
      if (path.isAbsolute(rel)) { const stat = await fs.lstat(rel); if (!stat.isFile() || stat.isSymbolicLink() || await fs.realpath(rel) !== rel) fail('Unsafe native record'); nativeRecordPaths.add(rel); }
      else { await safe(root,rel); tracked.add(rel); }
    }
  }
  if (result.structure.status !== 'rejected') result.structure.status = 'passed';
  result.provenance.parentRecordLifecycle = [...nativeParents].map(([record,audits]) => ({path:record,scope:audits ? 'verified-spawn-prefix' : 'unverified-active-parent',appendActivity:'permitted',constraints:(audits ?? []).map(({name,prefixBytes,sha256,spawnRecordIndex}) => ({name,prefixBytes,sha256,spawnRecordIndex}))}));
  const recordPin = async rel => {
    const absolute = path.resolve(root,rel);
    if (nativeParents.has(absolute)) {
      const stat = await fs.lstat(absolute); if (!stat.isFile() || stat.isSymbolicLink()) fail('Unsafe parent record');
      const audits = nativeParents.get(absolute);
      if (!audits) return {path:rel,lifecycle:'active-parent',mutationAssessment:'not-assessed'};
      const content = await fs.readFile(absolute);
      for (const audit of audits) if (content.length < audit.prefixBytes || hash(content.subarray(0,audit.prefixBytes)) !== audit.sha256) fail(`Native parent spawn prefix mutated: ${audit.name}`);
      return {path:rel,constraints:audits.map(({name,prefixBytes,sha256,spawnRecordIndex}) => ({name,prefixBytes,sha256,spawnRecordIndex}))};
    }
    if (path.isAbsolute(rel)) { const stat = await fs.lstat(rel); if (!stat.isFile() || stat.isSymbolicLink()) fail('Unsafe native record'); return {path:rel,sha256:hash(await fs.readFile(rel))}; }
    return pin(root,rel);
  };
  const snapshot = async () => ({ source: await inventory(root,lock.plan.sourceRoots,lock.plan.sourceExcludes ?? []), evidence: await Promise.all([...tracked].sort().map(recordPin)), nativeRecords: await Promise.all([...nativeRecordPaths].sort().map(recordPin)), executables: await Promise.all(lock.executables.map(async item => ({...item,sha256:hash(await fs.readFile(item.path))}))) });
  return { root,lock,evidence,snapshot,protectedPaths:[...tracked,...nativeRecordPaths],evidenceSha256:hash(evidenceBytes) };
}
export async function inspectDelivery(options) {
  const result = report();
  try { object(options,['root','lock','expectedLockSha256','evidence']); await readState(options,result); } catch (error) { result.structure.status = 'rejected'; result.structure.errors.push(error.message); }
  return result;
}
async function observe(check, executablePath, root) {
  const stdoutHash = createHash('sha256'), stderrHash = createHash('sha256');
  const start = Date.now(); let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), total = 0, timedOut = false, outputLimited = false;
  return new Promise(resolve => {
    const child = spawn(executablePath,check.argv.slice(1),{cwd:path.join(root,check.cwd),shell:false,detached:process.platform !== 'win32',stdio:['ignore','pipe','pipe']});
    const stop = () => { try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid,'SIGKILL'); } catch { /* already exited */ } };
    const timer = setTimeout(() => { timedOut = true; stop(); },check.timeoutMs);
    const collect = stream => chunk => {
      (stream === 'stdout' ? stdoutHash : stderrHash).update(chunk);
      const remaining = Math.max(0,check.outputLimitBytes - total); total += chunk.length;
      const kept = chunk.subarray(0,remaining); if (stream === 'stdout') stdout = Buffer.concat([stdout,kept]); else stderr = Buffer.concat([stderr,kept]);
      if (total > check.outputLimitBytes) { outputLimited = true; stop(); }
    };
    child.stdout.on('data',collect('stdout')); child.stderr.on('data',collect('stderr'));
    let errorText = null; child.on('error',error => { errorText = error.message; });
    child.on('close',(exitCode,signal) => { clearTimeout(timer); resolve({id:check.id,argv:check.argv,cwd:check.cwd,exitCode,signal,timedOut,outputLimited,error:errorText,durationMs:Date.now()-start,observedOutputBytes:total,stdoutSha256:stdoutHash.digest('hex'),stderrSha256:stderrHash.digest('hex'),stdout:stdout.toString('utf8'),stderr:stderr.toString('utf8'),passed:exitCode===0 && !timedOut && !outputLimited && !errorText}); });
  });
}
export async function verifyDelivery(options) {
  const result = report();
  let writeReport;
  try {
    object(options,['root','lock','expectedLockSha256','evidence','runChecks','out'],['root','lock','expectedLockSha256','evidence']);
    const state = await readState(options,result);
    const selected = options.runChecks ?? []; array(selected,'selected checks'); unique(selected,'selected checks');
    for (const id of selected) if (!state.lock.plan.checks.some(check => check.id === id)) fail(`Unknown frozen check: ${id}`);
    if (options.out) writeReport = await destinationOwner(state,options.out);
    const before = await state.snapshot();
    if (canonical(before.executables) !== canonical(state.lock.executables)) fail('Executable changed before execution');
    const expectedRecords = [
      {path:options.lock,sha256:options.expectedLockSha256},{path:options.evidence,sha256:state.evidenceSha256},...state.lock.immutable,
      ...state.evidence.artifacts,...(state.evidence.captures ?? []),
      ...(result.provenance.observations ?? []).filter(item => item.status === 'verified').flatMap(item => [item.recordAudit.request,item.recordAudit.child]),
    ];
    const observedRecords = new Map([...before.evidence,...before.nativeRecords].map(item => [path.resolve(state.root,item.path),item.sha256]));
    if (canonical(before.source) !== canonical(state.evidence.finalSource) || expectedRecords.some(item => observedRecords.get(path.resolve(state.root,item.path)) !== item.sha256)) fail('Source or evidence changed before execution');
    for (const id of selected) {
      const check = state.lock.plan.checks.find(item => item.id === id);
      result.behavior.observations.push(await observe(check,state.lock.executables.find(item => item.id === id).path,state.root));
      if (canonical(before) !== canonical(await state.snapshot())) fail('Source, evidence, harness or executable mutated during execution');
    }
    const missing = state.lock.plan.checks.filter(check => check.required && !selected.includes(check.id)).map(check => check.id);
    result.behavior.missingRequiredChecks = missing;
    result.behavior.status = result.behavior.observations.some(item => !item.passed) ? 'rejected' : missing.length ? 'unverified' : 'passed';
    const diffs = [];
    if (state.lock.plan.visual) {
      for (const [index,contract] of state.lock.plan.visual.states.entries()) {
        const capture = state.evidence.captures.find(item => item.stateId === contract.id);
        const observed = compareImages({baseline:await bytes(state.root,contract.baselinePath),current:await bytes(state.root,capture.path)});
        const { diffPng, ...metrics } = observed;
        const passed = metrics.width === contract.width && metrics.height === contract.height && metrics.changedPixels <= contract.maxChangedPixels && metrics.maxChannelDelta <= contract.maxChannelDelta;
        const diff = {sha256:hash(diffPng),retention:options.out ? 'retained' : 'unavailable',...(options.out ? {path:`${options.out}.visual-${index}.png`} : {})};
        diffs.push({diff,bytes:diffPng});
        result.visual.observations.push({stateId:contract.id,...metrics,passed,diff});
      }
      result.visual.status = result.visual.observations.every(item => item.passed) ? 'passed' : 'rejected';
    }
    if (canonical(before) !== canonical(await state.snapshot())) fail('Source or evidence mutated during verification');
    result.acceptance = result.structure.status === 'rejected' || [result.behavior.status,result.visual.status].includes('rejected') ? 'rejected' : result.behavior.status !== 'passed' || result.provenance.status === 'unverified' || state.lock.plan.visual ? 'inconclusive' : 'accepted';
    if (writeReport) { for (const item of diffs) await writeReport(item.diff.path,item.bytes,true); await writeReport(options.out,result); }
  } catch (error) {
    result.acceptance = 'rejected'; result.structure.status = 'rejected'; result.structure.errors.push(error.message);
    if (result.provenance.status === 'verified') { result.provenance.status = 'unverified'; result.provenance.gaps.push(`VERIFICATION_INVALIDATED: ${error.message}`); }
    if (writeReport) { try { await writeReport(options.out,result); } catch { /* unsafe output is never written */ } }
  }
  return result;
}
async function cli(argv) {
  const operation = argv.shift(); if (!['freeze','inspect','verify'].includes(operation)) fail('Use freeze, inspect or verify');
  const allowed = operation === 'freeze' ? ['root','plan','out'] : operation === 'inspect' ? ['root','lock','expected-lock-sha256','evidence'] : ['root','lock','expected-lock-sha256','evidence','run-check','out'];
  const parsed = operation === 'verify' ? { runChecks: [] } : {};
  while (argv.length) {
    const flag = argv.shift(); if (!flag?.startsWith('--') || !allowed.includes(flag.slice(2))) fail(`Unsupported option: ${flag}`);
    const value = argv.shift(); if (value === undefined || value.startsWith('--')) fail(`Missing value: ${flag}`);
    const key = flag.slice(2) === 'expected-lock-sha256' ? 'expectedLockSha256' : flag.slice(2);
    if (key === 'run-check') parsed.runChecks.push(value); else { if (parsed[key] !== undefined) fail(`Duplicate option: ${flag}`); parsed[key] = value; }
  }
  for (const key of operation === 'freeze' ? ['root','plan','out'] : ['root','lock','expectedLockSha256','evidence']) if (parsed[key] === undefined) fail(`Missing option: ${key}`);
  const result = operation === 'freeze' ? await freezeAcceptance(parsed) : operation === 'inspect' ? await inspectDelivery(parsed) : await verifyDelivery(parsed);
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  process.exitCode = operation === 'freeze' || operation === 'inspect' && result.structure.status === 'passed' || operation === 'verify' && result.acceptance === 'accepted' ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli(process.argv.slice(2)).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
