import { createHash } from 'node:crypto';
import { lstat, mkdtemp, open, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { verifyDelegation } from './codex-delegation.mjs';

const CLAIM = 'runtime-recorded-task-attribution';
const LIMITATIONS = Object.freeze([
  'Recorded task declarations do not prove artifact authorship, file reading, review quality or unbiased judgment.',
  'Distinct native task identities do not establish model diversity.',
  'Local records do not provide malicious-local tamper resistance or external release verification.',
]);
const DIGEST = /^[a-f0-9]{64}$/;
const MAX_RECORD_BYTES = 64 * 1024 * 1024;
const MAX_REQUEST_BYTES = 1024 * 1024;

function fail(message, code = 'NATIVE_ATTRIBUTION_REJECTED') {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function check(condition, message) { if (!condition) fail(message); }
function object(value, allowed, required = allowed) {
  check(value && typeof value === 'object' && !Array.isArray(value), 'Expected an object');
  check(Object.keys(value).every(key => allowed.includes(key)), 'Unknown field in native attribution input');
  check(required.every(key => Object.hasOwn(value, key)), 'Missing native attribution field');
}
function text(value, label) { check(typeof value === 'string' && value.length > 0 && value.length <= 256, `Invalid ${label}`); }
function digest(value) { check(typeof value === 'string' && DIGEST.test(value), 'Invalid SHA-256 digest'); }
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function outputPath(value) {
  text(value, 'output path');
  check(!isAbsolute(value) && !value.includes('\\') && value.split('/').every(part => part && part !== '.' && part !== '..'), 'Output paths must be confined relative paths');
}
function entries(value, keys, withPath) {
  check(Array.isArray(value) && value.length <= 256, 'Invalid declaration entries');
  const ids = new Set();
  const paths = new Set();
  for (const item of value) {
    object(item, keys);
    text(item.id, 'entry ID');
    check(!ids.has(item.id), 'Duplicate declaration ID'); ids.add(item.id);
    if (withPath) { outputPath(item.path); check(!paths.has(item.path), 'Duplicate output path'); paths.add(item.path); }
    if (keys.includes('sha256')) digest(item.sha256);
  }
  return value;
}
function equalEntries(left, right) {
  const ordered = values => [...values].sort((a, b) => a.id.localeCompare(b.id));
  const a = ordered(left); const b = ordered(right);
  return a.length === b.length && a.every((item, index) => Object.keys(item).length === Object.keys(b[index]).length
    && Object.entries(item).every(([key, value]) => b[index][key] === value));
}
async function scopedFile(root, value, confined = false) {
  text(value, 'record path');
  const path = resolve(root, value);
  if (confined) {
    const rel = relative(root, path);
    check(rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), 'Output path escapes root');
    let cursor = root;
    for (const part of rel.split(sep)) {
      cursor = join(cursor, part);
      check(!(await lstat(cursor)).isSymbolicLink(), 'Symlinks are unsupported');
    }
  } else {
    // Explicit record coordinates may lie outside the artifact root, but may not
    // point at a symlink. No session discovery or history traversal is performed.
    check(!(await lstat(path)).isSymbolicLink(), 'Symlink records are unsupported');
    check(await realpath(dirname(path)) === dirname(path), 'Symlink record directories are unsupported');
  }
  check((await lstat(path)).isFile(), 'Only regular files are supported');
  return path;
}
async function boundedRead(path, limit) {
  const file = await open(path, 'r');
  try {
    const stat = await file.stat();
    check(stat.isFile() && stat.size <= limit, 'Native input exceeds supported file bounds');
    const bytes = await file.readFile();
    check(bytes.length <= limit && (await file.stat()).size === bytes.length, 'Native input changed during read');
    return bytes;
  } finally { await file.close(); }
}
function utf8(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { fail('Native inputs require valid UTF-8'); }
}
function json(bytes) {
  const source = utf8(bytes);
  let value;
  try { value = JSON.parse(source); } catch { fail('Malformed native JSON input'); }
  // JSON.parse silently accepts duplicate keys. Reject that ambiguity in
  // authority records and declarations, and bound nesting before traversal.
  const stack = [];
  for (const token of source.matchAll(/"(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s{}[\],:]+/g)) {
    const part = token[0]; const frame = stack.at(-1);
    if (part === '{' || part === '[') {
      check(stack.length < 128, 'Native JSON nesting exceeds supported bounds');
      stack.push({ object: part === '{', keys: new Set(), key: part === '{' });
    } else if (part === '}' || part === ']') stack.pop();
    else if (part === ',') { if (frame?.object) frame.key = true; }
    else if (part === ':') { if (frame?.object) frame.key = false; }
    else if (part.startsWith('"') && frame?.object && frame.key) {
      const key = JSON.parse(part);
      check(!frame.keys.has(key), 'Duplicate JSON object key'); frame.keys.add(key);
    }
  }
  return value;
}
function records(bytes) {
  check(!bytes.includes(0), 'Invalid native record bytes');
  const result = [];
  let offset = 0;
  for (const line of utf8(bytes).split('\n')) {
    const end = Math.min(bytes.length, offset + Buffer.byteLength(line) + 1);
    if (line.trim()) {
      check(result.length < 100000, 'Too many native record entries');
      const item = json(Buffer.from(line));
      check(item && typeof item === 'object' && !Array.isArray(item), 'Invalid native record entry');
      result.push({ item, end });
    }
    offset = end;
  }
  return result;
}
function session(lines) {
  const identities = lines.filter(({ item }) => item.type === 'session_meta');
  check(identities.length === 1, 'Exactly one session metadata identity is required');
  text(identities[0].item.payload?.id, 'session identity');
  return identities[0].item.payload.id;
}
function declaration(message, name) {
  check(typeof message === 'string' && message.length <= MAX_REQUEST_BYTES, 'Invalid declaration text');
  const starts = message.match(new RegExp('```' + name + '(?=\\s|$)', 'g')) ?? [];
  const blocks = [...message.matchAll(new RegExp('```' + name + '\\r?\\n([\\s\\S]*?)\\r?\\n```', 'g'))];
  check(starts.length === 1 && blocks.length === 1, `Exactly one ${name} fenced block is required`);
  return json(Buffer.from(blocks[0][1]));
}
function protocol(value, completion) {
  const keys = ['schemaVersion', 'taskId', 'lockSha256', 'assignmentId', ...(completion ? [] : ['taskName']), 'kind', 'outputs', 'reviews'];
  object(value, [...keys, ...(completion ? ['verdict'] : [])], keys);
  check(value.schemaVersion === 1, 'Unsupported declaration version');
  text(value.taskId, 'task ID'); text(value.assignmentId, 'assignment ID'); digest(value.lockSha256);
  check(['writer', 'review'].includes(value.kind), 'Unsupported assignment kind');
  if (!completion) check(/^[a-z][a-z0-9_]*$/.test(value.taskName), 'Invalid assignment task name');
  entries(value.outputs, completion ? ['id', 'path', 'sha256'] : ['id', 'path'], true);
  check(value.outputs.length > 0, 'An assignment must reserve outputs');
  entries(value.reviews, ['id', 'sha256'], false);
  if (value.kind === 'writer') check(value.reviews.length === 0 && !Object.hasOwn(value, 'verdict'), 'Writer declarations cannot carry review claims');
  else {
    check(value.reviews.length > 0, 'Review declarations require targets');
    if (completion) check(['accepted', 'changes-required'].includes(value.verdict), 'Invalid review verdict');
  }
}

// Internal integration API. The caller supplies expectations from its frozen
// lock and actual artifact/tree hashes, never from a detached receipt flag.
export async function verifyNativeAttribution({ root, authority, taskId, lockSha256, expectedParentId, expectedAssignment, outputs, reviews }) {
  const base = { claim: CLAIM, limitations: [...LIMITATIONS] };
  let temporary;
  try {
    if (authority?.kind !== 'codex-native') fail('Only explicit Codex native authority is supported', 'INDEPENDENCE_UNVERIFIED');
    object(authority, ['kind', 'requestPath', 'parentRecordPath', 'childRecordPath', 'assignmentId']);
    object(expectedAssignment, ['assignmentId', 'taskName', 'kind']);
    text(taskId, 'task ID'); digest(lockSha256); text(expectedParentId, 'expected parent identity');
    text(expectedAssignment.assignmentId, 'expected assignment ID');
    check(/^[a-z][a-z0-9_]*$/.test(expectedAssignment.taskName), 'Invalid expected task name');
    check(['writer', 'review'].includes(expectedAssignment.kind), 'Invalid expected assignment kind');
    check(authority.assignmentId === expectedAssignment.assignmentId, 'Authority assignment differs from the frozen assignment');
    entries(outputs, ['id', 'path', 'sha256'], true); entries(reviews, ['id', 'sha256'], false);
    const canonicalRoot = await realpath(resolve(root));
    const [requestPath, parentPath, childPath] = await Promise.all([
      scopedFile(canonicalRoot, authority.requestPath), scopedFile(canonicalRoot, authority.parentRecordPath), scopedFile(canonicalRoot, authority.childRecordPath),
    ]);
    const [requestBytes, parentBytes, childBytes] = await Promise.all([
      boundedRead(requestPath, MAX_REQUEST_BYTES), boundedRead(parentPath, MAX_RECORD_BYTES), boundedRead(childPath, MAX_RECORD_BYTES),
    ]);
    const request = json(requestBytes);
    object(request, ['task_name', 'fork_turns', 'model', 'reasoning_effort', 'message', 'audit']);
    check(request.task_name === expectedAssignment.taskName, 'Prepared task name differs from the frozen assignment');
    const parent = records(parentBytes); const child = records(childBytes);
    const parentId = session(parent); const childId = session(child);
    check(parentId === expectedParentId, 'Native parent differs from the frozen expected parent');
    check(childId !== parentId, 'A child must have a distinct session identity');
    const spawns = parent.filter(({ item }) => {
      if (item.type !== 'response_item' || item.payload?.type !== 'function_call' || item.payload?.name !== 'spawn_agent') return false;
      try { return JSON.parse(item.payload.arguments).task_name === expectedAssignment.taskName; } catch { return false; }
    });
    check(spawns.length === 1, 'Exactly one spawn for the expected task name is required');
    const spawn = spawns[0];
    const spawnArguments = json(Buffer.from(spawn.item.payload.arguments));
    object(spawnArguments, ['task_name', 'fork_turns', 'model', 'reasoning_effort', 'message']);
    const parentPrefix = parentBytes.subarray(0, spawn.end);
    temporary = await mkdtemp(join(await realpath(tmpdir()), 'oms-native-attribution-'));
    const parentSnapshot = join(temporary, 'parent.jsonl'); const childSnapshot = join(temporary, 'child.jsonl');
    await Promise.all([writeFile(parentSnapshot, parentPrefix), writeFile(childSnapshot, childBytes)]);
    const linkage = await verifyDelegation({ request, parentRecord: parentSnapshot, childRecord: childSnapshot });
    if (!linkage.messageVerified) fail('Encrypted parent message cannot establish exact task assignment', 'INDEPENDENCE_UNVERIFIED');
    const assignment = declaration(request.message, 'oms-delivery-assignment-v1'); protocol(assignment, false);
    check(assignment.taskId === taskId && assignment.lockSha256 === lockSha256
      && assignment.assignmentId === expectedAssignment.assignmentId && assignment.taskName === expectedAssignment.taskName
      && assignment.kind === expectedAssignment.kind, 'Assignment differs from frozen task expectations');
    check(equalEntries(assignment.outputs, outputs.map(({ id, path }) => ({ id, path }))), 'Assignment output slots differ from expected artifacts');
    check(equalEntries(assignment.reviews, reviews), 'Assignment review targets differ from actual frozen targets');
    const finals = child.filter(({ item }) => item.type === 'response_item' && item.payload?.type === 'message'
      && item.payload?.role === 'assistant' && item.payload?.phase === 'final_answer');
    if (finals.length === 0) fail('Supported native assistant final response is unavailable', 'INDEPENDENCE_UNVERIFIED');
    check(finals.length === 1, 'Exactly one native assistant final response is required');
    const final = finals[0]; const finalIndex = child.indexOf(final);
    for (const { item } of child.slice(finalIndex + 1)) {
      check(item.type === 'event_msg' && ['task_complete', 'task_completed'].includes(item.payload?.type), 'Later child task activity invalidates completion');
    }
    const content = final.item.payload.content;
    if (!Array.isArray(content) || content.length === 0 || !content.every(item => item?.type === 'output_text' && typeof item.text === 'string')) {
      fail('Native final response text is unavailable or encrypted', 'INDEPENDENCE_UNVERIFIED');
    }
    const completion = declaration(content.map(item => item.text).join(''), 'oms-delivery-completion-v1'); protocol(completion, true);
    check(completion.taskId === taskId && completion.lockSha256 === lockSha256
      && completion.assignmentId === expectedAssignment.assignmentId && completion.kind === expectedAssignment.kind, 'Completion differs from frozen task expectations');
    check(equalEntries(completion.outputs, outputs), 'Completion output hashes or paths differ from actual artifacts');
    check(equalEntries(completion.reviews, reviews), 'Completion review targets differ from actual frozen targets');
    check(completion.kind !== 'review' || completion.verdict === 'accepted', 'Review did not accept its frozen targets');
    for (const output of outputs) {
      const path = await scopedFile(canonicalRoot, output.path, true);
      check(sha(await boundedRead(path, MAX_RECORD_BYTES)) === output.sha256, 'Actual artifact digest differs from declared completion');
    }
    const [requestAfter, parentAfter, childAfter] = await Promise.all([
      boundedRead(requestPath, MAX_REQUEST_BYTES), boundedRead(parentPath, MAX_RECORD_BYTES), boundedRead(childPath, MAX_RECORD_BYTES),
    ]);
    check(requestAfter.equals(requestBytes), 'Prepared request changed during attribution verification');
    check(parentAfter.length >= parentPrefix.length && parentAfter.subarray(0, parentPrefix.length).equals(parentPrefix), 'Parent spawn prefix changed during attribution verification');
    check(childAfter.equals(childBytes), 'Child record changed during attribution verification');
    return { ...base, status: 'verified', childId: linkage.childId, parentId: linkage.parentId,
      model: linkage.model, reasoningEffort: linkage.reasoningEffort, messageAudit: linkage.messageAudit,
      recordAudit: { request: { path: requestPath, sha256: sha(requestBytes) },
        parent: { path: parentPath, prefixBytes: parentPrefix.length, sha256: sha(parentPrefix), spawnRecordIndex: parent.indexOf(spawn) },
        child: { path: childPath, sha256: sha(childBytes), finalRecordIndex: finalIndex } },
    };
  } catch (error) {
    const unsupported = error.code === 'INDEPENDENCE_UNVERIFIED' || error.code === 'ENOENT';
    return { ...base, status: unsupported ? 'inconclusive' : 'rejected',
      code: unsupported ? 'INDEPENDENCE_UNVERIFIED' : 'NATIVE_ATTRIBUTION_REJECTED', reason: error.message };
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
}
