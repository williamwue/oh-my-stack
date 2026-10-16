import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, opendir, readlink, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_AGE_MS = 5 * 60_000;
const LIMITS = { timeMs: 45_000, commands: 4096, bytes: 32 * 1024 * 1024, perCommand: 2 * 1024 * 1024, rows: 128 };
const SURFACES = ['activeThreads', 'pinnedThreads', 'childTasks', 'processes'];
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const USAGE = 'worktree-audit.mjs scan --cwd PATH | assess --scan FILE --evidence FILE';

function failure(code) { return Object.assign(new Error(code), { code }); }
function requireInput(ok) { if (!ok) throw failure('INVALID_INPUT'); }
function text(value) { return typeof value === 'string' && value.length > 0 && !value.includes('\0'); }
function time(value) { return Number.isSafeInteger(value) && value >= 0; }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(value) { return createHash('sha256').update(stable(value)).digest('hex'); }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function cloneInput(value) {
  let nodes = 0;
  const seen = new Set();
  function copy(item, depth = 0) {
    requireInput(++nodes <= 100_000 && depth < 40);
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return item;
    if (typeof item === 'number') { requireInput(Number.isFinite(item)); return item; }
    requireInput(item && typeof item === 'object' && !seen.has(item));
    requireInput([Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(item)));
    if (Array.isArray(item)) requireInput(item.length <= 100_000 && Object.keys(item).length === item.length && Object.keys(item).every((key, index) => key === String(index)));
    seen.add(item);
    const result = Array.isArray(item) ? [] : Object.create(null);
    for (const key of Reflect.ownKeys(item)) {
      if (Array.isArray(item) && key === 'length') continue;
      const property = Object.getOwnPropertyDescriptor(item, key);
      requireInput(typeof key === 'string' && property.enumerable && Object.hasOwn(property, 'value'));
      Object.defineProperty(result, key, { value: copy(property.value, depth + 1), enumerable: true, writable: true });
    }
    seen.delete(item);
    return result;
  }
  const result = copy(value);
  requireInput(Buffer.byteLength(JSON.stringify(result)) <= 8 * 1024 * 1024);
  return result;
}

function readScope() {
  const deadline = performance.now() + LIMITS.timeMs;
  let commands = 0, bytes = 0;
  function check() {
    if (performance.now() >= deadline || commands > LIMITS.commands || bytes > LIMITS.bytes) throw failure('READ_BUDGET');
  }
  async function git(cwd, args, accepted = [0]) {
    check(); commands++; check();
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    Object.assign(env, { GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', LC_ALL: 'C' });
    return new Promise((res, rej) => {
      const child = spawn('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-C', cwd, ...args],
        { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const output = [], errors = [];
      let size = 0, problem;
      const stop = (code) => { problem ??= failure(code); child.kill('SIGKILL'); };
      const timer = setTimeout(() => stop('READ_TIMEOUT'), Math.max(1, deadline - performance.now()));
      for (const [stream, chunks] of [[child.stdout, output], [child.stderr, errors]]) {
        stream.on('data', (chunk) => {
          size += chunk.length; bytes += chunk.length;
          if (size > LIMITS.perCommand || bytes > LIMITS.bytes) stop('READ_BUDGET');
          else chunks.push(chunk);
        });
      }
      child.on('error', () => { problem ??= failure('GIT_UNAVAILABLE'); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (problem) return rej(problem);
        if (!accepted.includes(code) || errors.some((chunk) => chunk.length)) return rej(failure('GIT_READ_FAILED'));
        const raw = Buffer.concat(output), stdout = raw.toString('utf8');
        if (!raw.equals(Buffer.from(stdout))) return rej(failure('PATH_ENCODING_UNKNOWN'));
        res({ stdout, code });
      });
    });
  }
  return { git, check };
}

async function pathIdentity(path, scope) {
  scope.check();
  const lexicalPath = resolve(path), canonicalPath = await realpath(lexicalPath);
  const physical = await stat(lexicalPath, { bigint: true });
  if (!physical.isDirectory() || (physical.mode & 0o444n) === 0n || (physical.mode & 0o111n) === 0n) throw failure('PATH_UNREADABLE');
  const aliases = [];
  let prefix = parse(lexicalPath).root;
  const parts = lexicalPath.slice(prefix.length).split(/[\\/]/).filter(Boolean);
  if (parts.length > 128) throw failure('PATH_DEPTH_UNKNOWN');
  for (const part of parts) {
    scope.check(); prefix = join(prefix, part);
    const entry = await lstat(prefix, { bigint: true });
    if (entry.isSymbolicLink()) aliases.push({ path: prefix, dev: String(entry.dev), ino: String(entry.ino), target: await readlink(prefix) });
  }
  return { lexicalPath, canonicalPath, dev: String(physical.dev), ino: String(physical.ino), aliases };
}

function nulRecords(raw) {
  if (raw && !raw.endsWith('\0')) throw failure('INCOMPLETE_GIT_OUTPUT');
  return raw ? raw.slice(0, -1).split('\0') : [];
}
function inventory(raw) {
  const result = [];
  let row;
  for (const line of nulRecords(raw)) {
    if (!line) { row = null; continue; }
    const split = line.indexOf(' '), key = split < 0 ? line : line.slice(0, split), value = split < 0 ? '' : line.slice(split + 1);
    if (key === 'worktree') {
      if (row || !isAbsolute(value)) throw failure('INVALID_INVENTORY');
      row = { path: value, head: null, branch: null, detached: false, bare: false, locked: false, prunable: false };
      result.push(row);
    } else {
      if (!row) throw failure('INVALID_INVENTORY');
      if (key === 'HEAD' && SHA.test(value)) row.head = value;
      else if (key === 'branch' && value.startsWith('refs/heads/')) row.branch = value;
      else if (['bare', 'detached', 'locked', 'prunable'].includes(key)) row[key] = true;
      else throw failure('INVALID_INVENTORY');
    }
  }
  if (!result.length || result.length > LIMITS.rows) throw failure('INVENTORY_LIMIT');
  return result;
}
function statusRecords(raw) {
  const records = nulRecords(raw);
  let dirty = false, ignored = false;
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (record.startsWith('! ') && record.length > 2) ignored = true;
    else if (/^(?:[12u] |\? )[\s\S]+/.test(record)) {
      dirty = true;
      if (record.startsWith('2 ') && !records[++index]) throw failure('INVALID_STATUS');
    } else throw failure('INVALID_STATUS');
  }
  return { records, dirty, ignored };
}

async function identityAt(path, scope) {
  const root = await pathIdentity(path, scope);
  const read = async (...args) => (await scope.git(path, args)).stdout.trimEnd();
  const top = await read('rev-parse', '--show-toplevel');
  if (await realpath(top) !== root.canonicalPath) throw failure('ROOT_MISMATCH');
  const gitDir = await pathIdentity(await read('rev-parse', '--absolute-git-dir'), scope);
  const commonDir = await pathIdentity(await read('rev-parse', '--path-format=absolute', '--git-common-dir'), scope);
  const head = await read('rev-parse', '--verify', 'HEAD');
  if (!SHA.test(head)) throw failure('HEAD_UNKNOWN');
  const branchRead = await scope.git(path, ['symbolic-ref', '-q', 'HEAD'], [0, 1]);
  const branch = branchRead.code === 0 ? branchRead.stdout.trimEnd() : null;
  return { root, commonDir, gitDir, head, branch };
}

async function gitLocks(identity, scope) {
  const locks = [];
  let count = 0;
  async function walk(path, recursive) {
    scope.check();
    let directory;
    try { directory = await opendir(path); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for await (const entry of directory) {
      scope.check();
      if (++count > 10_000) throw failure('LOCK_INSPECTION_LIMIT');
      if (entry.name.endsWith('.lock')) locks.push(join(path, entry.name));
      if ((recursive || entry.name === 'refs') && entry.isSymbolicLink()) throw failure('LOCK_PATH_ALIAS_UNKNOWN');
      if (entry.isDirectory() && (recursive || entry.name === 'refs')) await walk(join(path, entry.name), true);
    }
  }
  for (const path of new Set([identity.gitDir.canonicalPath, identity.commonDir.canonicalPath])) await walk(path, false);
  return locks.sort();
}

async function observeRow(item, scope) {
  const row = { ...item, identity: null, main: false, status: null, index: [], gitLocks: [], issues: [] };
  try {
    row.identity = await identityAt(item.path, scope);
    row.main = row.identity.gitDir.canonicalPath === row.identity.commonDir.canonicalPath;
    row.gitLocks = await gitLocks(row.identity, scope);
    if (row.identity.head !== item.head || row.identity.branch !== item.branch) row.issues.push('INVENTORY_IDENTITY_CHANGED');
    row.status = statusRecords((await scope.git(item.path, ['status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=none', '--ignored=matching'])).stdout);
    row.index = nulRecords((await scope.git(item.path, ['ls-files', '--stage', '-v', '-z'])).stdout);
    for (const record of row.index) {
      const match = /^([A-Za-z]) (\d{6}) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t[\s\S]+$/.exec(record);
      if (!match) throw failure('INVALID_INDEX');
      if (match[1] === 'S' || match[1] === match[1].toLowerCase()) row.issues.push('INDEX_HIDES_CONTENT');
      if (match[2] === '160000') row.issues.push('SUBMODULE_INSPECTION_INCOMPLETE');
    }
    if (stable(row.identity) !== stable(await identityAt(item.path, scope))) row.issues.push('IDENTITY_CHANGED_DURING_READ');
  } catch (error) { row.issues.push(error.code ?? 'LOCAL_READ_FAILED'); }
  row.issues = [...new Set(row.issues)];
  return row;
}

function repositoryId(origin) {
  try {
    const scp = /^(?:git@)?([A-Za-z0-9.-]+):([^/].*)$/.exec(origin);
    const url = new URL(scp ? `ssh://${scp[1]}/${scp[2]}` : origin);
    if (!['https:', 'http:', 'ssh:'].includes(url.protocol) || url.password || (url.username && !(url.protocol === 'ssh:' && url.username === 'git')) || url.search || url.hash) return null;
    const path = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
    return path && !path.includes('..') ? `${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ''}/${path}` : null;
  } catch { return null; }
}

async function scanLocal(cwd, scope) {
  const startedAt = Date.now(), issues = [];
  let cwdIdentity = null, commonDir = null, repository = null, rawInventory = '', rows = [];
  try {
    cwdIdentity = await pathIdentity(cwd, scope);
    commonDir = await pathIdentity((await scope.git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).stdout.trimEnd(), scope);
    rawInventory = (await scope.git(cwd, ['worktree', 'list', '--porcelain', '-z'])).stdout;
    const items = inventory(rawInventory);
    const origin = await scope.git(cwd, ['config', '--get', 'remote.origin.url'], [0, 1]);
    repository = repositoryId(origin.stdout.trimEnd());
    if (!repository) issues.push('REPOSITORY_UNKNOWN');
    for (const item of items) rows.push(await observeRow(item, scope));
    for (const row of rows) {
      const again = await observeRow(items.find((item) => item.path === row.path), scope);
      if (stable(row) !== stable(again)) row.issues.push('WORKTREE_CHANGED_DURING_SCAN');
      if (row.identity && stable(row.identity.commonDir) !== stable(commonDir)) row.issues.push('WORKTREE_REPOSITORY_MISMATCH');
    }
    if (rawInventory !== (await scope.git(cwd, ['worktree', 'list', '--porcelain', '-z'])).stdout) issues.push('INVENTORY_CHANGED_DURING_SCAN');
    const laterOrigin = await scope.git(cwd, ['config', '--get', 'remote.origin.url'], [0, 1]);
    if (repository !== repositoryId(laterOrigin.stdout.trimEnd())) issues.push('REPOSITORY_CHANGED_DURING_SCAN');
    if (stable(cwdIdentity) !== stable(await pathIdentity(cwd, scope))) issues.push('SCAN_PATH_CHANGED');
    const laterCommon = await pathIdentity((await scope.git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).stdout.trimEnd(), scope);
    if (stable(commonDir) !== stable(laterCommon)) issues.push('SCAN_REPOSITORY_CHANGED');
    const identities = new Set();
    for (const row of rows) {
      if (!row.identity) continue;
      const key = `${row.identity.root.dev}/${row.identity.root.ino}`;
      if (identities.has(key)) issues.push('WORKTREE_ALIAS_COLLISION');
      identities.add(key);
    }
  } catch (error) { issues.push(error.code ?? 'LOCAL_READ_FAILED'); }
  const body = { version: 1, cwd, cwdIdentity, commonDir, repository, startedAt, finishedAt: Date.now(), rawInventory, rows, issues: [...new Set(issues)] };
  return freeze({ ...body, id: digest(body) });
}

export async function scanWorktrees({ cwd } = {}) {
  requireInput(text(cwd));
  return scanLocal(resolve(cwd), readScope());
}

function absolute(value) { return text(value) && isAbsolute(value); }
function physical(value) { return typeof value === 'string' && /^\d+$/.test(value); }
function validatePath(path) {
  requireInput(object(path) && absolute(path.lexicalPath) && absolute(path.canonicalPath));
  requireInput(physical(path.dev) && physical(path.ino) && Array.isArray(path.aliases));
  for (const alias of path.aliases) requireInput(object(alias) && absolute(alias.path) && physical(alias.dev) && physical(alias.ino) && text(alias.target));
}
function validateIdentity(value) {
  requireInput(object(value) && SHA.test(value.head) && (value.branch === null || text(value.branch)));
  for (const name of ['root', 'commonDir', 'gitDir']) validatePath(value[name]);
}
function validateScan(scan) {
  requireInput(object(scan) && scan.version === 1 && absolute(scan.cwd) && text(scan.id));
  const { id, ...body } = scan;
  requireInput(id === digest(body) && time(scan.startedAt) && time(scan.finishedAt) && scan.startedAt <= scan.finishedAt);
  requireInput(Array.isArray(scan.rows) && scan.rows.length <= LIMITS.rows && Array.isArray(scan.issues) && scan.issues.every(text) && typeof scan.rawInventory === 'string');
  requireInput(scan.repository === null || text(scan.repository));
  if (scan.cwdIdentity !== null) validatePath(scan.cwdIdentity);
  if (scan.commonDir !== null) validatePath(scan.commonDir);
  const paths = new Set();
  for (const row of scan.rows) {
    requireInput(object(row) && absolute(row.path) && !paths.has(row.path) && Array.isArray(row.issues) && row.issues.every(text)); paths.add(row.path);
    requireInput(Array.isArray(row.index) && row.index.every(text) && Array.isArray(row.gitLocks) && row.gitLocks.every(absolute));
    requireInput(row.head === null || SHA.test(row.head));
    for (const flag of ['main', 'locked', 'prunable', 'bare', 'detached']) requireInput(typeof row[flag] === 'boolean');
    requireInput(row.branch === null || text(row.branch));
    if (row.identity) validateIdentity(row.identity);
    if (row.status) requireInput(object(row.status) && typeof row.status.dirty === 'boolean' && typeof row.status.ignored === 'boolean' && Array.isArray(row.status.records) && row.status.records.every(text));
  }
}
function validateEvidence(evidence) {
  requireInput(object(evidence) && evidence.version === 1 && text(evidence.scanId) && Array.isArray(evidence.entries) && evidence.entries.length <= LIMITS.rows);
  for (const entry of evidence.entries) {
    requireInput(object(entry)); validateIdentity(entry.identity); requireInput(SHA.test(entry.head));
    for (const name of [...SURFACES, 'openPrs']) {
      const fact = entry[name];
      if (fact === undefined || fact === null) continue;
      requireInput(object(fact) && ['complete', 'partial', 'unavailable'].includes(fact.coverage) && Array.isArray(fact.items));
      requireInput(fact.items.every(name === 'openPrs' ? (pr) => object(pr) && text(pr.repo) && Number.isSafeInteger(pr.pr) && pr.pr > 0 && SHA.test(pr.headSha) : text));
    }
    if (entry.merge !== undefined && entry.merge !== null) requireInput(object(entry.merge));
  }
}
function fresh(observedAt, scan, now) {
  return time(observedAt) && observedAt >= scan.finishedAt && observedAt <= now && now - observedAt <= MAX_AGE_MS;
}
function sourceKnown(source, kind) {
  return object(source) && source.kind === kind && text(source.tool) && source.scope === 'worktree';
}
function reason(kind, code, detail) { return { kind, code, ...(detail ? { detail } : {}) }; }

function usageReasons(entry, scan, now) {
  const reasons = [];
  for (const name of SURFACES) {
    const fact = entry?.[name];
    if (!fact) { reasons.push(reason('unknown', 'HOST_SURFACE_MISSING', name)); continue; }
    if (fact.items.length) reasons.push(reason('hold', 'HOST_ACTIVITY', name));
    if (fact.coverage !== 'complete' || !sourceKnown(fact.source, 'supported-host')) reasons.push(reason('unknown', 'HOST_COVERAGE_UNKNOWN', name));
    if (!fresh(fact.observedAt, scan, now)) reasons.push(reason('unknown', 'HOST_EVIDENCE_NOT_FRESH', name));
  }
  return reasons;
}
function mergeShape(merge, row, scan) {
  return object(merge) && merge.repo === scan.repository && Number.isSafeInteger(merge.pr) && merge.pr > 0 &&
    merge.headSha === row.head && typeof merge.merged === 'boolean' && SHA.test(merge.baseSha) && SHA.test(merge.mergeSha) &&
    typeof merge.baseRef === 'string' && /^refs\/(heads|remotes)\/[A-Za-z0-9_./-]+$/.test(merge.baseRef) &&
    !merge.baseRef.includes('..') && !merge.baseRef.endsWith('/') && sourceKnown(merge.source, 'official-provider');
}
async function mergeReasons(entry, row, scan, scope) {
  const reasons = [], now = Date.now(), openPrs = entry?.openPrs, merge = entry?.merge;
  if (openPrs?.items.length) reasons.push(reason('hold', 'OPEN_PR'));
  if (!openPrs || openPrs.coverage !== 'complete' || openPrs.repo !== scan.repository || openPrs.headSha !== row.head ||
      !sourceKnown(openPrs.source, 'official-provider') || !fresh(openPrs.observedAt, scan, now)) reasons.push(reason('unknown', 'OPEN_PR_INVENTORY_UNKNOWN'));
  if (merge?.merged === false) reasons.push(reason('hold', 'PR_NOT_MERGED'));
  if (!mergeShape(merge, row, scan) || !fresh(merge.observedAt, scan, now)) {
    reasons.push(reason('unknown', 'MERGE_EVIDENCE_UNKNOWN')); return reasons;
  }
  try {
    await scope.git(row.path, ['check-ref-format', merge.baseRef]);
    const readTarget = async () => (await scope.git(row.path, ['rev-parse', '--verify', `${merge.baseRef}^{commit}`])).stdout.trimEnd();
    if (await readTarget() !== merge.baseSha) reasons.push(reason('unknown', 'MERGE_TARGET_CHANGED'));
    for (const sha of [merge.baseSha, merge.mergeSha]) {
      if ((await scope.git(row.path, ['cat-file', '-t', sha])).stdout.trimEnd() !== 'commit') throw failure('MERGE_OBJECT_UNKNOWN');
    }
    const contained = await scope.git(row.path, ['merge-base', '--is-ancestor', merge.mergeSha, merge.baseSha], [0, 1]);
    if (contained.code !== 0) reasons.push(reason('unknown', 'MERGE_NOT_CONTAINED'));
    if (await readTarget() !== merge.baseSha) reasons.push(reason('unknown', 'MERGE_TARGET_CHANGED'));
  } catch (error) { reasons.push(reason('unknown', error.code === 'READ_BUDGET' ? 'READ_BUDGET' : 'MERGE_OBJECT_UNKNOWN')); }
  return reasons;
}
function localReasons(row) {
  const reasons = row.issues.map((issue) => reason('unknown', issue));
  for (const [flag, code] of [['main', 'MAIN_WORKTREE'], ['locked', 'LOCKED_WORKTREE'], ['bare', 'BARE_REPOSITORY']]) {
    if (row[flag]) reasons.push(reason('hold', code));
  }
  if (row.prunable) reasons.push(reason('unknown', 'PRUNABLE_WORKTREE'));
  if (row.gitLocks?.length) reasons.push(reason('hold', 'GIT_LOCK_PRESENT'));
  if (!row.identity || !row.status) reasons.push(reason('unknown', 'LOCAL_INSPECTION_INCOMPLETE'));
  if (row.status?.dirty) reasons.push(reason('hold', 'DIRTY_WORKTREE'));
  if (row.status?.ignored) reasons.push(reason('hold', 'IGNORED_CONTENT'));
  return reasons;
}
export async function assessWorktrees(input) {
  const { scan, evidence } = cloneInput(input);
  validateScan(scan); validateEvidence(evidence);
  const startedAt = Date.now(), scope = readScope(), plans = [];
  for (const row of scan.rows) {
    const reasons = localReasons(row);
    const entries = evidence.entries.filter((entry) => stable(entry.identity) === stable(row.identity));
    const entry = entries.length === 1 && entries[0].head === row.head ? entries[0] : null;
    if (evidence.scanId !== scan.id) reasons.push(reason('unknown', 'EVIDENCE_SCAN_MISMATCH'));
    if (!entry) reasons.push(reason('unknown', 'EVIDENCE_IDENTITY_MISMATCH'));
    const bound = evidence.scanId === scan.id ? entry : null;
    reasons.push(...usageReasons(bound, scan, Date.now()));
    reasons.push(...await mergeReasons(bound, row, scan, scope));
    plans.push({ row, entry: bound, reasons });
  }
  const current = await scanLocal(scan.cwd, scope);
  for (const plan of plans) plan.reasons.push(...await mergeReasons(plan.entry, plan.row, scan, scope));
  const now = Date.now();
  const globalReasons = [...scan.issues, ...current.issues].map((issue) => reason('unknown', issue));
  if (scan.finishedAt > startedAt || now - scan.finishedAt > MAX_AGE_MS || scan.finishedAt - scan.startedAt > LIMITS.timeMs) globalReasons.push(reason('unknown', 'SCAN_NOT_FRESH'));
  if (scan.rawInventory !== current.rawInventory || scan.repository !== current.repository || stable(scan.commonDir) !== stable(current.commonDir) || stable(scan.cwdIdentity) !== stable(current.cwdIdentity)) globalReasons.push(reason('unknown', 'SCAN_CHANGED'));
  const rows = plans.map(({ row, entry, reasons }) => {
    reasons.push(...globalReasons);
    const observed = current.rows.find((item) => item.path === row.path);
    if (!observed || stable(row) !== stable(observed)) reasons.push(reason('unknown', 'WORKTREE_CHANGED_SINCE_SCAN'));
    if (observed) reasons.push(...localReasons(observed));
    reasons.push(...usageReasons(entry, scan, now));
    for (const name of ['merge', 'openPrs']) {
      if (entry?.[name] && !fresh(entry[name].observedAt, scan, now)) reasons.push(reason('unknown', 'EVIDENCE_EXPIRED_DURING_ASSESSMENT', name));
    }
    const unique = [...new Map(reasons.map((item) => [stable(item), item])).values()];
    const verdict = unique.some((item) => item.kind === 'hold') ? 'hold' : unique.length ? 'unresolved' : 'candidate';
    return { path: row.path, identity: row.identity, head: row.head, branch: row.branch, verdict, reasons: unique };
  });
  return freeze({ version: 1, scanId: scan.id, startedAt, finishedAt: now, maxEvidenceAgeMs: MAX_AGE_MS, advisoryOnly: true,
    evidenceProvenance: 'Caller assertions, not signed host attestation.',
    limitation: 'Matching snapshots do not prove uninterrupted inactivity. Cleanup requires fresh host and Git evidence and existing authorization.',
    issues: globalReasons, rows });
}

async function readJson(path) {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 8 * 1024 * 1024) throw failure('INPUT_LIMIT');
    const buffer = Buffer.alloc(8 * 1024 * 1024 + 1);
    let length = 0, count;
    do { ({ bytesRead: count } = await file.read(buffer, length, buffer.length - length, null)); length += count; } while (count && length < buffer.length);
    if (length === buffer.length) throw failure('INPUT_LIMIT');
    return JSON.parse(buffer.subarray(0, length).toString('utf8'));
  } finally { await file.close(); }
}
async function main(argv) {
  const [action, ...args] = argv, flags = {};
  for (let index = 0; index < args.length; index += 2) {
    requireInput(['--cwd', '--scan', '--evidence'].includes(args[index]) && !Object.hasOwn(flags, args[index]) && text(args[index + 1]));
    flags[args[index]] = args[index + 1];
  }
  let result;
  if (action === 'scan' && Object.keys(flags).length === 1 && flags['--cwd']) result = await scanWorktrees({ cwd: flags['--cwd'] });
  else if (action === 'assess' && Object.keys(flags).length === 2 && flags['--scan'] && flags['--evidence']) {
    result = await assessWorktrees({ scan: await readJson(flags['--scan']), evidence: await readJson(flags['--evidence']) });
  } else throw failure('INVALID_INPUT');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${JSON.stringify({ error: error.code ?? 'READ_FAILED', usage: USAGE })}\n`); process.exitCode = 2;
  });
}
