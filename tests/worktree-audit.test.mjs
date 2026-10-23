import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assessWorktrees, scanWorktrees } from '../tools/worktree-audit.mjs';

const CLI = fileURLToPath(new URL('../tools/worktree-audit.mjs', import.meta.url));
const HOST = { kind: 'supported-host', tool: 'fixture.host.inventory', scope: 'worktree' };
const PROVIDER = { kind: 'official-provider', tool: 'fixture.official.pr', scope: 'worktree' };
const SURFACES = ['activeThreads', 'pinnedThreads', 'childTasks', 'processes'];

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' } }).trimEnd();
}
async function fixture(t, { squash = true, featureName = 'feature worktree' } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'oms-worktree-audit-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const main = join(dir, 'main'), feature = join(dir, featureName);
  await mkdir(main);
  git(main, 'init', '-b', 'main');
  git(main, 'config', 'user.name', 'Worktree fixture');
  git(main, 'config', 'user.email', 'fixture@example.invalid');
  git(main, 'config', 'commit.gpgSign', 'false');
  git(main, 'remote', 'add', 'origin', 'https://github.com/acme/project.git');
  await writeFile(join(main, '.gitignore'), 'ignored/\n*.ignored\n');
  await writeFile(join(main, 'tracked.txt'), 'base\n');
  git(main, 'add', '.'); git(main, 'commit', '-m', 'base');
  git(main, 'worktree', 'add', '-b', 'task', feature);
  await writeFile(join(feature, 'tracked.txt'), 'feature\n');
  git(feature, 'commit', '-am', 'feature');
  const head = git(feature, 'rev-parse', 'HEAD');
  if (squash) { git(main, 'merge', '--squash', 'task'); git(main, 'commit', '-m', 'squash'); }
  const baseSha = git(main, 'rev-parse', 'HEAD');
  return { dir, main: await realpath(main), feature: await realpath(feature), head, baseSha, mergeSha: baseSha };
}
function evidenceFor(scan, f) {
  const row = scan.rows.find((item) => item.path === f.feature);
  assert(row?.identity, 'fixture linked worktree was identified');
  const observedAt = Date.now();
  const entry = { identity: structuredClone(row.identity), head: row.head,
    merge: { repo: scan.repository, pr: 7, headSha: row.head, baseRef: 'refs/heads/main', baseSha: f.baseSha,
      mergeSha: f.mergeSha, merged: true, observedAt, source: PROVIDER },
    openPrs: { repo: scan.repository, headSha: row.head, coverage: 'complete', items: [], observedAt, source: PROVIDER } };
  for (const name of SURFACES) entry[name] = { coverage: 'complete', items: [], observedAt, source: HOST };
  return { version: 1, scanId: scan.id, entries: [entry] };
}
function resultRow(report, f) { return report.rows.find((row) => row.path === f.feature); }
function hasCode(row, code) { return row.reasons.some((reason) => reason.code === code); }
async function assess(f, change = () => {}) {
  const scan = await scanWorktrees({ cwd: f.main }), evidence = evidenceFor(scan, f);
  await change(evidence, scan);
  return { scan, evidence, report: await assessWorktrees({ scan, evidence }) };
}

async function privateCommit(f, reset = false) {
  if (!reset) git(f.feature, 'checkout', '--detach');
  git(f.feature, 'commit', '--allow-empty', '-m', 'private work');
  const commit = git(f.feature, 'rev-parse', 'HEAD');
  if (reset) git(f.feature, 'reset', '--hard', f.head);
  else git(f.feature, 'checkout', 'task');
  return commit;
}

for (const reset of [false, true]) {
  test(`${reset ? 'reset-away' : 'detached'} commits kept only by the linked HEAD reflog hold`, async (t) => {
    const f = await fixture(t), commit = await privateCommit(f, reset);
    if (reset) git(f.feature, 'reflog', 'expire', '--expire=all', 'refs/heads/task');
    assert.equal(git(f.main, 'branch', '--all', '--contains', commit), '');
    assert(git(f.feature, 'reflog', '--format=%H', 'HEAD').split('\n').includes(commit));
    const row = resultRow((await assess(f)).report, f);
    assert.equal(row.verdict, 'hold');
    assert(hasCode(row, 'HEAD_REFLOG_ONLY_COMMITS'));
  });
}

test('the old endpoint of a HEAD reflog entry also preserves private commits', async (t) => {
  const f = await fixture(t), commit = await privateCommit(f);
  const log = join(git(f.feature, 'rev-parse', '--absolute-git-dir'), 'logs', 'HEAD');
  const last = (await readFile(log, 'utf8')).trimEnd().split('\n').at(-1);
  await writeFile(log, `${last}\n`);
  assert(!git(f.feature, 'reflog', '--format=%H', 'HEAD').split('\n').includes(commit));
  const row = resultRow((await assess(f)).report, f);
  assert.equal(row.verdict, 'hold'); assert(hasCode(row, 'HEAD_REFLOG_ONLY_COMMITS'));
});

for (const preservation of ['branch', 'tag', 'annotated-tag', 'remote', 'shared-reflog', 'shared-old-endpoint']) {
  test(`HEAD reflog commits preserved by ${preservation} remain candidates`, async (t) => {
    const f = await fixture(t), commit = await privateCommit(f, preservation.startsWith('shared'));
    if (preservation === 'branch') git(f.main, 'branch', 'keep', commit);
    if (preservation === 'tag') git(f.main, 'tag', 'keep', commit);
    if (preservation === 'annotated-tag') git(f.main, 'tag', '-a', 'keep', commit, '-m', 'keep work');
    if (preservation === 'remote') git(f.main, 'update-ref', 'refs/remotes/origin/keep', commit);
    if (preservation === 'shared-old-endpoint') {
      const log = join(git(f.main, 'rev-parse', '--absolute-git-dir'), 'logs', 'refs', 'heads', 'task');
      const last = (await readFile(log, 'utf8')).trimEnd().split('\n').at(-1);
      await writeFile(log, `${last}\n`);
    }
    const row = resultRow((await assess(f)).report, f);
    assert.equal(row.verdict, 'candidate', JSON.stringify(row.reasons));
    assert.deepEqual(row.reasons, []);
  });
}

test('a descendant held by a shared ref preserves the whole private history', async (t) => {
  const f = await fixture(t), commit = await privateCommit(f);
  git(f.feature, 'checkout', '--detach', commit);
  git(f.feature, 'commit', '--allow-empty', '-m', 'preserved descendant');
  git(f.feature, 'branch', 'keep-descendant');
  git(f.feature, 'checkout', 'task');
  assert.equal(resultRow((await assess(f)).report, f).verdict, 'candidate');
});

test('each linked worktree keeps its own HEAD reflog evidence', async (t) => {
  const f = await fixture(t), second = join(f.dir, 'second');
  git(f.main, 'worktree', 'add', '-b', 'task-two', second, f.head);
  git(second, 'checkout', '--detach');
  git(second, 'commit', '--allow-empty', '-m', 'second private work');
  const commit = git(second, 'rev-parse', 'HEAD');
  git(second, 'checkout', 'task-two');
  const other = { ...f, feature: await realpath(second) };
  const scan = await scanWorktrees({ cwd: f.feature }), evidence = evidenceFor(scan, f);
  evidence.entries.push(evidenceFor(scan, other).entries[0]);
  const report = await assessWorktrees({ scan, evidence });
  assert.equal(resultRow(report, f).verdict, 'candidate');
  const row = resultRow(report, other);
  assert.equal(row.verdict, 'hold'); assert(hasCode(row, 'HEAD_REFLOG_ONLY_COMMITS'));
  assert.equal(row.reasons.find((reason) => reason.code === 'HEAD_REFLOG_ONLY_COMMITS').detail, commit);
});

for (const damage of ['empty', 'missing', 'unreadable', 'truncated', 'missing-last-record', 'malformed', 'unknown-object', 'oversized']) {
  test(`${damage} HEAD reflog evidence cannot produce a candidate`, async (t) => {
    const f = await fixture(t), log = join(git(f.feature, 'rev-parse', '--absolute-git-dir'), 'logs', 'HEAD');
    const original = await readFile(log, 'utf8');
    if (damage === 'empty') await writeFile(log, '');
    if (damage === 'missing') await rm(log);
    if (damage === 'unreadable') await chmod(log, 0);
    if (damage === 'truncated') await writeFile(log, original.slice(0, -1));
    if (damage === 'missing-last-record') await writeFile(log, `${original.trimEnd().split('\n').slice(0, -1).join('\n')}\n`);
    if (damage === 'malformed') await writeFile(log, `${original}bad record\n`);
    if (damage === 'unknown-object') await writeFile(log, original.replace(/^0{40}/, 'a'.repeat(40)));
    if (damage === 'oversized') await writeFile(log, original.repeat(Math.ceil(2 * 1024 * 1024 / original.length) + 1));
    try {
      const row = resultRow((await assess(f)).report, f);
      assert.equal(row.verdict, 'unresolved', JSON.stringify(row.reasons));
      assert(hasCode(row, damage === 'oversized' ? 'READ_BUDGET' : 'HEAD_REFLOG_UNKNOWN'));
    } finally { if (damage === 'unreadable') await chmod(log, 0o644); }
  });
}

test('missing HEAD reflog fields in an older scan cannot establish safety', async (t) => {
  const f = await fixture(t), scan = structuredClone(await scanWorktrees({ cwd: f.main }));
  for (const row of scan.rows) delete row.headReflog;
  scan.id = await hashScan(scan);
  const row = resultRow(await assessWorktrees({ scan, evidence: evidenceFor(scan, f) }), f);
  assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'HEAD_REFLOG_UNKNOWN'));
});

for (const shared of [false, true]) {
  test(`${shared ? 'shared' : 'HEAD'} reflog drift invalidates a scan with an unchanged tip`, async (t) => {
    const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main }), evidence = evidenceFor(scan, f);
    const log = shared ? join(git(f.main, 'rev-parse', '--absolute-git-dir'), 'logs', 'refs', 'heads', 'task') :
      join(git(f.feature, 'rev-parse', '--absolute-git-dir'), 'logs', 'HEAD');
    await writeFile(log, (await readFile(log, 'utf8')).replace('feature', 'changed-message'));
    assert.equal(git(f.feature, 'rev-parse', 'HEAD'), f.head);
    const row = resultRow(await assessWorktrees({ scan, evidence }), f);
    assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'WORKTREE_CHANGED_SINCE_SCAN'));
  });
}

test('squash proof produces an advisory candidate without source-head ancestry', async (t) => {
  const f = await fixture(t);
  assert.equal(spawnSync('git', ['-C', f.main, 'merge-base', '--is-ancestor', f.head, f.baseSha]).status, 1);
  const { scan, report } = await assess(f);
  assert.equal(scan.repository, 'github.com/acme/project');
  assert.equal(scan.issues.length, 0);
  assert.equal(resultRow(report, f).verdict, 'candidate');
  assert.deepEqual(resultRow(report, f).reasons, []);
  assert.equal(report.rows.find((row) => row.path === f.main).verdict, 'hold');
  assert.equal(report.advisoryOnly, true);
  assert.match(report.limitation, /fresh host and Git evidence/);
  assert.match(report.evidenceProvenance, /not signed/);
  assert(Object.isFrozen(scan.rows[0].identity.root));
});

test('each host surface needs separately complete fresh supported evidence', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main });
  for (const name of SURFACES) {
    for (const variant of ['missing', 'partial', 'unsupported', 'before-scan', 'future']) {
      const evidence = evidenceFor(scan, f), entry = evidence.entries[0];
      if (variant === 'missing') delete entry[name];
      if (variant === 'partial') entry[name].coverage = 'partial';
      if (variant === 'unsupported') entry[name].source = { ...HOST, kind: 'private-storage' };
      if (variant === 'before-scan') entry[name].observedAt = scan.finishedAt - 1;
      if (variant === 'future') entry[name].observedAt = Date.now() + 60_000;
      const row = resultRow(await assessWorktrees({ scan, evidence }), f);
      assert.equal(row.verdict, 'unresolved', `${name} ${variant}`);
      assert(row.reasons.some((reason) => reason.detail === name), `${name} is named`);
    }
  }
});

test('activity and open PRs hold while preserving every missing-evidence reason', async (t) => {
  const f = await fixture(t);
  const { report } = await assess(f, (evidence) => {
    for (const name of SURFACES) evidence.entries[0][name].items.push(`${name}-owner`);
    evidence.entries[0].pinnedThreads.coverage = 'partial';
    evidence.entries[0].openPrs.items.push({ repo: 'github.com/acme/project', pr: 8, headSha: f.head });
    delete evidence.entries[0].merge;
  });
  const row = resultRow(report, f);
  assert.equal(row.verdict, 'hold');
  assert.equal(row.reasons.filter((reason) => reason.code === 'HOST_ACTIVITY').length, 4);
  for (const code of ['OPEN_PR', 'HOST_COVERAGE_UNKNOWN', 'MERGE_EVIDENCE_UNKNOWN']) assert(hasCode(row, code));
});

test('wrong scan, HEAD, physical identity and duplicate entries cannot establish inactivity', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main });
  const mutations = [
    (e) => { e.scanId = 'another-scan'; },
    (e) => { e.entries[0].head = 'a'.repeat(40); },
    (e) => { e.entries[0].identity.root.ino = '0'; },
    (e) => { e.entries.push(structuredClone(e.entries[0])); },
  ];
  for (const mutate of mutations) {
    const evidence = evidenceFor(scan, f); mutate(evidence);
    assert.equal(resultRow(await assessWorktrees({ scan, evidence }), f).verdict, 'unresolved');
  }
});

test('scan and evidence inputs are cloned, validated and remain unchanged', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main });
  const evidence = evidenceFor(scan, f), original = JSON.stringify(evidence);
  const pending = assessWorktrees({ scan, evidence });
  evidence.entries[0].processes.items.push('resumed-after-input-boundary');
  assert.equal(resultRow(await pending, f).verdict, 'candidate');
  evidence.entries[0].processes.items.pop();
  assert.equal(JSON.stringify(evidence), original);
  const changed = structuredClone(scan); changed.rows[1].main = false; changed.finishedAt++;
  await assert.rejects(assessWorktrees({ scan: changed, evidence }), { code: 'INVALID_INPUT' });
  const bad = evidenceFor(scan, f); bad.entries[0].activeThreads.items = [42];
  await assert.rejects(assessWorktrees({ scan, evidence: bad }), { code: 'INVALID_INPUT' });
  await assert.rejects(assessWorktrees({ scan, evidence: { ...bad, entries: new Array(1) } }), { code: 'INVALID_INPUT' });
});

test('explicit status flags expose dirty files despite hiding configuration', async (t) => {
  const f = await fixture(t);
  git(f.main, 'config', 'status.showUntrackedFiles', 'no');
  git(f.main, 'config', 'diff.ignoreSubmodules', 'all');
  await writeFile(join(f.feature, 'new\nfile.txt'), 'untracked');
  await writeFile(join(f.feature, 'tracked.txt'), 'dirty');
  const { scan, report } = await assess(f);
  assert.equal(resultRow(report, f).verdict, 'hold');
  assert(hasCode(resultRow(report, f), 'DIRTY_WORKTREE'));
  assert(scan.rows.find((row) => row.path === f.feature).status.records.some((record) => record.includes('new\nfile.txt')));
});

test('ignored content blocks candidate even when tracked status is clean', async (t) => {
  const f = await fixture(t);
  await mkdir(join(f.feature, 'ignored')); await writeFile(join(f.feature, 'ignored', 'precious.txt'), 'local data');
  const { scan, report } = await assess(f), row = resultRow(report, f);
  assert.equal(scan.rows.find((item) => item.path === f.feature).status.dirty, false);
  assert.equal(row.verdict, 'hold'); assert(hasCode(row, 'IGNORED_CONTENT'));
});

test('index flags that hide tracked changes leave inspection unresolved', async (t) => {
  const f = await fixture(t);
  for (const flag of ['--assume-unchanged', '--skip-worktree']) {
    git(f.feature, 'update-index', flag, 'tracked.txt');
    const { report } = await assess(f);
    assert.equal(resultRow(report, f).verdict, 'unresolved');
    assert(hasCode(resultRow(report, f), 'INDEX_HIDES_CONTENT'));
    git(f.feature, 'update-index', '--no-assume-unchanged', '--no-skip-worktree', 'tracked.txt');
  }
});

test('initialized submodules never claim recursive ignored-file coverage', async (t) => {
  const f = await fixture(t), source = join(f.dir, 'sub-source');
  await mkdir(source); git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  git(source, 'config', 'commit.gpgSign', 'false');
  await writeFile(join(source, '.gitignore'), '*.ignored\n');
  await writeFile(join(source, 'file'), 'submodule'); git(source, 'add', '.'); git(source, 'commit', '-m', 'submodule');
  git(f.feature, '-c', 'protocol.file.allow=always', 'submodule', 'add', source, 'module');
  git(f.feature, 'commit', '-am', 'add module');
  git(f.main, 'config', 'submodule.module.ignore', 'all');
  await writeFile(join(f.feature, 'module', 'local.ignored'), 'important ignored content');
  let checked = await assess(f), row = resultRow(checked.report, f);
  assert.equal(checked.scan.rows.find((item) => item.path === f.feature).status.dirty, false);
  assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'SUBMODULE_INSPECTION_INCOMPLETE'));
  await writeFile(join(f.feature, 'module', 'file'), 'dirty submodule');
  checked = await assess(f); row = resultRow(checked.report, f);
  assert.equal(row.verdict, 'hold'); assert(hasCode(row, 'DIRTY_WORKTREE'));
});

test('worktree locks and Git operation locks hold without removing locks', async (t) => {
  const f = await fixture(t);
  git(f.main, 'worktree', 'lock', '--reason', 'active owner', f.feature);
  let checked = await assess(f);
  assert(hasCode(resultRow(checked.report, f), 'LOCKED_WORKTREE'));
  git(f.main, 'worktree', 'unlock', f.feature);
  const gitDir = git(f.feature, 'rev-parse', '--absolute-git-dir'), lock = join(gitDir, 'index.lock');
  await writeFile(lock, 'owned');
  checked = await assess(f);
  assert.equal(resultRow(checked.report, f).verdict, 'hold');
  assert(hasCode(resultRow(checked.report, f), 'GIT_LOCK_PRESENT'));
  assert.equal(await readFile(lock, 'utf8'), 'owned');
});

test('permission failures, missing worktrees and replacement directories stay unknown', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main }), evidence = evidenceFor(scan, f);
  await chmod(f.feature, 0);
  try {
    const report = await assessWorktrees({ scan, evidence });
    assert.equal(resultRow(report, f).verdict, 'unresolved');
    assert(hasCode(resultRow(report, f), 'PATH_UNREADABLE'));
  } finally { await chmod(f.feature, 0o755); }
  const parked = join(f.dir, 'parked'); await rename(f.feature, parked);
  let report = await assessWorktrees({ scan, evidence });
  assert.equal(resultRow(report, f).verdict, 'unresolved');
  await cp(parked, f.feature, { recursive: true });
  report = await assessWorktrees({ scan, evidence });
  assert.equal(resultRow(report, f).verdict, 'unresolved');
  assert(hasCode(resultRow(report, f), 'WORKTREE_CHANGED_SINCE_SCAN'));
  assert.equal(await readFile(join(parked, 'tracked.txt'), 'utf8'), 'feature\n');
});

test('stable path aliases resolve once and alias replacement invalidates the scan', { skip: process.platform === 'win32' }, async (t) => {
  const f = await fixture(t), alias = join(f.dir, 'alias'), replacement = join(f.dir, 'replacement');
  await symlink(f.main, alias, 'dir');
  const scan = await scanWorktrees({ cwd: alias }), evidence = evidenceFor(scan, f);
  assert.equal(scan.rows.length, 2); assert(scan.cwdIdentity.aliases.some((item) => item.path === alias));
  assert.equal(resultRow(await assessWorktrees({ scan, evidence }), f).verdict, 'candidate');
  await symlink(f.main, replacement, 'dir'); await rename(replacement, alias);
  const row = resultRow(await assessWorktrees({ scan, evidence }), f);
  assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'SCAN_CHANGED'));
});

test('HEAD, branch, status and resumed host activity changes invalidate old evidence', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main }), evidence = evidenceFor(scan, f);
  const resumed = structuredClone(evidence); resumed.entries[0].processes.items.push('new-process');
  assert.equal(resultRow(await assessWorktrees({ scan, evidence: resumed }), f).verdict, 'hold');
  await writeFile(join(f.feature, 'tracked.txt'), 'new work'); git(f.feature, 'commit', '-am', 'new work');
  const row = resultRow(await assessWorktrees({ scan, evidence }), f);
  assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'WORKTREE_CHANGED_SINCE_SCAN'));
});

test('merge provenance and complete associated open-PR inventory are required', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main });
  const variants = [
    (e) => { delete e.entries[0].merge; },
    (e) => { e.entries[0].merge.repo = 'github.com/other/project'; },
    (e) => { e.entries[0].merge.headSha = f.baseSha; },
    (e) => { e.entries[0].merge.baseSha = f.head; },
    (e) => { e.entries[0].merge.mergeSha = f.head; },
    (e) => { e.entries[0].merge.mergeSha = 'a'.repeat(40); },
    (e) => { e.entries[0].merge.baseRef = 'refs/heads/missing'; },
    (e) => { e.entries[0].merge.observedAt = scan.finishedAt - 1; },
    (e) => { e.entries[0].openPrs.coverage = 'partial'; },
    (e) => { e.entries[0].openPrs.headSha = f.baseSha; },
    (e) => { delete e.entries[0].openPrs; },
  ];
  for (const mutate of variants) {
    const evidence = evidenceFor(scan, f); mutate(evidence);
    assert.equal(resultRow(await assessWorktrees({ scan, evidence }), f).verdict, 'unresolved');
  }
  const unmerged = evidenceFor(scan, f); unmerged.entries[0].merge.merged = false;
  assert.equal(resultRow(await assessWorktrees({ scan, evidence: unmerged }), f).verdict, 'hold');
});

function hashScan(scan) {
  const stable = (v) => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ?
    `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);
  const { id, ...body } = scan;
  return import('node:crypto').then(({ createHash }) => createHash('sha256').update(stable(body)).digest('hex'));
}
test('finite age rejects stale scans and fresh-looking evidence on an old scan', async (t) => {
  const f = await fixture(t), original = await scanWorktrees({ cwd: f.main }), scan = structuredClone(original);
  scan.startedAt -= 10 * 60_000; scan.finishedAt -= 10 * 60_000; scan.id = await hashScan(scan);
  const evidence = evidenceFor(scan, f), row = resultRow(await assessWorktrees({ scan, evidence }), f);
  assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'SCAN_NOT_FRESH'));
});

async function wrapper(f, body, before = '') {
  const bin = join(f.dir, 'bin'); await mkdir(bin);
  const actualGit = spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim();
  assert(actualGit);
  const log = join(f.dir, 'calls.jsonl'), marker = join(f.dir, 'marker');
  await writeFile(join(bin, 'git'), `#!${process.execPath}\n` +
    `const fs = require('node:fs'); const cp = require('node:child_process');\n` +
    `const args = process.argv.slice(2); fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args)+'\\n');\n` +
    `${before}\n` +
    `const result = cp.spawnSync(${JSON.stringify(actualGit)}, args, {env:process.env});\n` +
    `const marker = ${JSON.stringify(marker)}; const feature = ${JSON.stringify(f.feature)};\n${body}\n` +
    `process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || ''); process.exit(result.status ?? 1);\n`);
  await chmod(join(bin, 'git'), 0o755);
  return { log, env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` } };
}
test('mid-scan mutation is detected through the CLI and commands remain read-only', { skip: process.platform === 'win32' }, async (t) => {
  const f = await fixture(t);
  const wrapped = await wrapper(f, `if(args.includes('status') && args.includes(feature) && !fs.existsSync(marker)) {
    fs.writeFileSync(marker, 'changed'); fs.writeFileSync(require('node:path').join(feature, 'tracked.txt'), 'changed during scan');
  }`);
  const output = spawnSync(process.execPath, [CLI, 'scan', '--cwd', f.main], { env: wrapped.env, encoding: 'utf8', timeout: 20_000 });
  assert.equal(output.status, 0, output.stderr);
  const row = JSON.parse(output.stdout).rows.find((item) => item.path === f.feature);
  assert(row.issues.includes('WORKTREE_CHANGED_DURING_SCAN'));
  const calls = (await readFile(wrapped.log, 'utf8')).trim().split('\n').map(JSON.parse);
  assert(calls.every((args) => args.includes('--no-optional-locks')));
  const status = calls.find((args) => args.includes('status'));
  for (const arg of ['--porcelain=v2', '-z', '--untracked-files=all', '--ignore-submodules=none', '--ignored=matching']) assert(status.includes(arg));
  for (const args of calls) for (const forbidden of ['fetch', 'remove', 'prune', 'delete', 'update-ref', 'reset', 'checkout']) assert(!args.includes(forbidden));
});

test('command output budgets fail closed and wait for the owned Git child to close', { skip: process.platform === 'win32' }, async (t) => {
  const f = await fixture(t), wrapped = await wrapper(f, `fs.writeFileSync(marker, String(process.pid)); fs.writeSync(1, 'x'.repeat(3 * 1024 * 1024));`);
  const output = spawnSync(process.execPath, [CLI, 'scan', '--cwd', f.main], { env: wrapped.env, encoding: 'utf8', timeout: 20_000 });
  assert.equal(output.status, 0, output.stderr);
  const scan = JSON.parse(output.stdout);
  assert(scan.issues.includes('READ_BUDGET'));
  assert.equal(scan.rows.length, 0);
  const pid = Number(await readFile(join(f.dir, 'marker'), 'utf8'));
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
});

test('remote target-ref drift during assessment cannot use an earlier merge proof', { skip: process.platform === 'win32' }, async (t) => {
  const f = await fixture(t);
  git(f.main, 'update-ref', 'refs/remotes/origin/main', f.baseSha);
  const scan = await scanWorktrees({ cwd: f.main }), evidence = evidenceFor(scan, f);
  evidence.entries[0].merge.baseRef = 'refs/remotes/origin/main';
  const scanFile = join(f.dir, 'scan.json'), evidenceFile = join(f.dir, 'evidence.json');
  await writeFile(scanFile, JSON.stringify(scan)); await writeFile(evidenceFile, JSON.stringify(evidence));
  const wrapped = await wrapper(f, `if(args.includes('worktree') && args.includes('list') && !fs.existsSync(marker)) {
    fs.writeFileSync(marker, 'drifted');
    cp.spawnSync(${JSON.stringify(spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim())}, ['-C', feature, 'update-ref', 'refs/remotes/origin/main', ${JSON.stringify(f.head)}]);
  }`);
  const output = spawnSync(process.execPath, [CLI, 'assess', '--scan', scanFile, '--evidence', evidenceFile], { env: wrapped.env, encoding: 'utf8', timeout: 20_000 });
  assert.equal(output.status, 0, output.stderr);
  const row = resultRow(JSON.parse(output.stdout), f);
  assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'MERGE_TARGET_CHANGED'));
});

for (const kind of ['file', 'directory']) for (const preserve of [false, true]) {
  test(`symlink ${kind} CLI scans, assesses and rejects invalid commands with preserve-main=${preserve}`, async (t) => {
    const f = await fixture(t), link = join(f.dir, kind === 'file' ? 'audit.mjs' : 'tools');
    try { await symlink(kind === 'file' ? CLI : dirname(CLI), link, kind === 'file' ? 'file' : 'dir'); }
    catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege unavailable');
      throw error;
    }
    const entry = kind === 'file' ? link : join(link, 'worktree-audit.mjs');
    const run = (...args) => spawnSync(process.execPath, [...(preserve ? ['--preserve-symlinks-main'] : []), entry, ...args],
      { encoding: 'utf8', timeout: 20_000 });
    const scanned = run('scan', '--cwd', f.main);
    assert.equal(scanned.status, 0, scanned.error?.message ?? scanned.stderr);
    assert.equal(scanned.stderr, '');
    const scan = JSON.parse(scanned.stdout);
    assert.deepEqual(scan.issues, []);
    assert.equal(scan.rows.length, 2);
    const scanFile = join(f.dir, 'scan.json'), evidenceFile = join(f.dir, 'evidence.json');
    await writeFile(scanFile, JSON.stringify(scan));
    await writeFile(evidenceFile, JSON.stringify(evidenceFor(scan, f)));
    const assessed = run('assess', '--scan', scanFile, '--evidence', evidenceFile);
    assert.equal(assessed.status, 0, assessed.error?.message ?? assessed.stderr);
    assert.equal(assessed.stderr, '');
    assert.equal(resultRow(JSON.parse(assessed.stdout), f).verdict, 'candidate');
    for (const args of [['delete', '--cwd', f.main], ['scan', '--cwd', f.main, '--fetch', 'true']]) {
      const rejected = run(...args);
      assert.equal(rejected.status, 2, rejected.error?.message ?? rejected.stderr);
      assert.equal(rejected.stdout, '');
      assert.equal(JSON.parse(rejected.stderr).error, 'INVALID_INPUT');
    }
  });
}

test('library imports remain silent with missing or nonexistent argv entry paths', async (t) => {
  const f = await fixture(t);
  for (const entry of [undefined, join(f.dir, 'missing.mjs')]) {
    const script = `${entry === undefined ? 'delete process.argv[1]' : `process.argv[1] = ${JSON.stringify(entry)}`};` +
      `const api = await import(${JSON.stringify(pathToFileURL(CLI).href)});` +
      `if (typeof api.scanWorktrees !== 'function' || typeof api.assessWorktrees !== 'function') process.exitCode = 1;`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 4000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
  }
});

test('readable assessment preserves verdicts and evidence reasons', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main }), evidence = evidenceFor(scan, f);
  const scanFile = join(f.dir, 'scan.json'), evidenceFile = join(f.dir, 'evidence.json');
  await writeFile(scanFile, JSON.stringify(scan));
  await writeFile(evidenceFile, JSON.stringify(evidence));
  const run = (...extra) => spawnSync(process.execPath, [CLI, 'assess', '--scan', scanFile, '--evidence', evidenceFile, ...extra], { encoding: 'utf8', timeout: 20_000 });
  const json = run(), rendered = run('--format', 'text');
  assert.equal(json.status, 0, json.stderr);
  assert.equal(rendered.status, 0, rendered.stderr);
  const report = JSON.parse(json.stdout);
  for (const row of report.rows) {
    assert.ok(rendered.stdout.includes(`${row.verdict.toUpperCase()} ${JSON.stringify(row.path)}`));
    for (const reason of row.reasons) assert.ok(rendered.stdout.includes(`[${reason.code}]`));
  }
  assert.match(rendered.stdout, /candidate=1/);
  assert.match(rendered.stdout, /does not authorize deletion/);
  evidence.entries = [];
  await writeFile(evidenceFile, JSON.stringify(evidence));
  const missing = run('--format', 'text');
  assert.equal(missing.status, 0, missing.stderr);
  assert.match(missing.stdout, /UNRESOLVED/);
  assert.match(missing.stdout, /\[EVIDENCE_IDENTITY_MISMATCH\]/);
  assert.equal(run('--format', 'html').status, 2);
  assert.equal(run('--format', 'text', '--format', 'json').status, 2);
  assert.equal(git(f.feature, 'status', '--porcelain'), '');
});

test('CLI assessment serializes the public contract and rejects write modes', async (t) => {
  const f = await fixture(t), scan = await scanWorktrees({ cwd: f.main }), evidence = evidenceFor(scan, f);
  const scanFile = join(f.dir, 'scan.json'), evidenceFile = join(f.dir, 'evidence.json');
  await writeFile(scanFile, JSON.stringify(scan)); await writeFile(evidenceFile, JSON.stringify(evidence));
  const result = spawnSync(process.execPath, [CLI, 'assess', '--scan', scanFile, '--evidence', evidenceFile], { encoding: 'utf8', timeout: 20_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(resultRow(JSON.parse(result.stdout), f).verdict, 'candidate');
  for (const command of [['delete', '--cwd', f.main], ['scan', '--cwd', f.main, '--fetch', 'true']]) {
    const rejected = spawnSync(process.execPath, [CLI, ...command], { encoding: 'utf8' });
    assert.equal(rejected.status, 2); assert.equal(JSON.parse(rejected.stderr).error, 'INVALID_INPUT');
  }
});

async function treeSnapshot(root) {
  const entries = [];
  async function walk(path) {
    const info = await lstat(path);
    if (info.isDirectory()) {
      entries.push([path, 'directory']);
      for (const name of (await readdir(path)).sort()) await walk(join(path, name));
    } else entries.push([path, info.mode, info.mtimeMs, await readFile(path, 'base64')]);
  }
  await walk(root); return entries;
}
test('scan and assessment preserve files, index metadata, refs and worktrees', async (t) => {
  const f = await fixture(t), before = await treeSnapshot(f.dir);
  const { report } = await assess(f);
  assert.equal(resultRow(report, f).verdict, 'candidate');
  assert.deepEqual(await treeSnapshot(f.dir), before);
  assert.equal(git(f.main, 'worktree', 'list', '--porcelain').split('worktree ').length - 1, 2);
  assert.equal(git(f.feature, 'rev-parse', 'HEAD'), f.head);
});

test('missing promisor proof objects stay local-only despite an inherited lazy-fetch opt-out', { skip: process.platform === 'win32' }, async (t) => {
  const source = await fixture(t), remote = join(source.dir, 'remote.git'), main = join(source.dir, 'partial');
  git(source.dir, 'clone', '--bare', source.main, remote);
  git(remote, 'config', 'uploadpack.allowFilter', 'true');
  git(remote, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  const proof = git(source.main, 'commit-tree', 'HEAD^{tree}', '-p', 'HEAD', '-m', 'remote-only proof');
  git(remote, 'fetch', source.main, proof);
  git(remote, 'update-ref', 'refs/heads/proof-only', proof);
  git(source.dir, '-c', 'protocol.file.allow=always', 'clone', '--filter=blob:none', '--single-branch', '--branch', 'main', pathToFileURL(remote).href, main);
  git(main, 'remote', 'rename', 'origin', 'promisor');
  git(main, 'remote', 'add', 'origin', 'https://github.com/acme/project.git');
  git(main, 'config', 'protocol.allow', 'never');
  git(main, 'config', 'protocol.file.allow', 'always');
  assert.equal(git(main, 'config', '--get', 'remote.promisor.promisor'), 'true');
  assert.equal(git(main, 'config', '--get', 'remote.promisor.partialclonefilter'), 'blob:none');
  const canary = join(source.dir, 'fetch-canary'), uploadPack = join(source.dir, 'upload-pack');
  const traceHome = join(source.dir, 'trace-home'), traceFile = join(source.dir, 'git-trace.jsonl');
  await mkdir(traceHome);
  git(source.dir, 'config', '--file', join(traceHome, '.gitconfig'), 'trace2.eventTarget', traceFile);
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
    HOME: traceHome, XDG_CONFIG_HOME: join(traceHome, 'xdg'), GIT_NO_LAZY_FETCH: '0' };
  const fetches = async () => (await readFile(traceFile, 'utf8')).trim().split('\n').map(JSON.parse)
    .filter((event) => event.event === 'child_start' && event.argv?.includes('fetch'));
  const actualGit = spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim();
  await writeFile(uploadPack, `#!${process.execPath}\n` +
    `require('node:fs').appendFileSync(${JSON.stringify(canary)}, 'fetch\\n');\n` +
    `const result = require('node:child_process').spawnSync(${JSON.stringify(actualGit)}, ['upload-pack', ...process.argv.slice(2)], {stdio:'inherit'});\n` +
    `process.exit(result.status ?? 1);\n`);
  await chmod(uploadPack, 0o755);
  git(main, 'config', 'remote.promisor.uploadpack', uploadPack);
  const absent = (path) => spawnSync(actualGit, ['--no-lazy-fetch', '-C', path, 'cat-file', '-e', proof],
    { env: { ...process.env, GIT_NO_LAZY_FETCH: '1' } }).status !== 0;
  assert(absent(main), 'the proof commit was excluded from the real partial clone');
  const control = join(source.dir, 'control');
  await cp(main, control, { recursive: true });
  const fetched = spawnSync(actualGit, ['-C', control, 'cat-file', '-t', proof], { env, encoding: 'utf8' });
  assert.equal(fetched.status, 0, fetched.stderr); assert.equal(fetched.stdout.trim(), 'commit');
  assert((await fetches()).length > 0, 'Git tracing detects the real lazy-fetch subprocess');
  assert.match(await readFile(canary, 'utf8'), /fetch/, 'the fetch canary detects a real lazy fetch');
  await rm(control, { recursive: true });
  const feature = join(source.dir, 'partial-feature');
  git(main, 'worktree', 'add', '-b', 'audit-task', feature, 'HEAD^');
  await rm(canary); await rm(traceFile);
  const f = { main: await realpath(main), feature: await realpath(feature), baseSha: git(main, 'rev-parse', 'HEAD'), mergeSha: proof };
  const snapshot = async () => Promise.all([f.main, f.feature, remote].map(treeSnapshot));
  const before = await snapshot();
  const scanned = spawnSync(process.execPath, [CLI, 'scan', '--cwd', f.main], { env, encoding: 'utf8', timeout: 20_000 });
  assert.equal(scanned.status, 0, scanned.stderr);
  const scan = JSON.parse(scanned.stdout), evidence = evidenceFor(scan, f);
  assert.deepEqual(scan.issues, []);
  const scanFile = join(source.dir, 'scan.json'), evidenceFile = join(source.dir, 'evidence.json');
  await writeFile(scanFile, JSON.stringify(scan)); await writeFile(evidenceFile, JSON.stringify(evidence));
  const assessed = spawnSync(process.execPath, [CLI, 'assess', '--scan', scanFile, '--evidence', evidenceFile], { env, encoding: 'utf8', timeout: 20_000 });
  assert.equal(assessed.status, 0, assessed.stderr);
  const row = resultRow(JSON.parse(assessed.stdout), f);
  assert(absent(main), 'assessment must leave the proof commit absent');
  assert.deepEqual(await fetches(), [], 'no audit Git command starts a fetch subprocess');
  await assert.rejects(readFile(canary), { code: 'ENOENT' });
  assert.deepEqual(await snapshot(), before, 'all audited and remote repository bytes and file metadata remain unchanged');
  assert.equal(row.verdict, 'unresolved'); assert(hasCode(row, 'MERGE_OBJECT_UNKNOWN'));
});

test('Git without the no-lazy-fetch flag fails closed without retrying an unsafe command', { skip: process.platform === 'win32' }, async (t) => {
  const f = await fixture(t), wrapped = await wrapper(f, '', `if (args.includes('--no-lazy-fetch')) {
    process.stderr.write('unknown option: --no-lazy-fetch\\n'); process.exit(129);
  }`);
  const before = await treeSnapshot(f.main);
  const output = spawnSync(process.execPath, [CLI, 'scan', '--cwd', f.main], { env: wrapped.env, encoding: 'utf8', timeout: 20_000 });
  assert.equal(output.status, 0, output.stderr);
  const scan = JSON.parse(output.stdout);
  assert(scan.issues.includes('GIT_READ_FAILED')); assert.equal(scan.rows.length, 0);
  const calls = (await readFile(wrapped.log, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(calls.length, 1); assert(calls[0].includes('--no-lazy-fetch'));
  assert.deepEqual(await treeSnapshot(f.main), before);
});

for (const mode of ['natural', 'budget', 'timeout']) for (const pipe of ['stdout', 'stderr']) {
  test(`${mode} Git exit bounds inherited ${pipe} draining without killing the descendant`, { skip: process.platform === 'win32' }, async (t) => {
    const f = await fixture(t), bin = join(f.dir, 'bin'), pidsFile = join(f.dir, 'pids.json');
    await mkdir(bin);
    const descendant = `process.send({ready:true}); setInterval(() => {}, 1000);`;
    await writeFile(join(bin, 'git'), `#!${process.execPath}\n` +
      `const fs = require('node:fs'), cp = require('node:child_process');\n` +
      `const child = cp.spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio:['ignore', ${JSON.stringify(pipe === 'stdout' ? 'inherit' : 'ignore')}, ${JSON.stringify(pipe === 'stderr' ? 'inherit' : 'ignore')}, 'ipc']});\n` +
      `child.once('message', () => {\n` +
      `  fs.writeFileSync(${JSON.stringify(pidsFile)}, JSON.stringify({owned:process.pid, descendant:child.pid}));\n` +
      `  child.disconnect(); child.unref();\n` +
      (mode === 'natural' ? `  fs.writeSync(1, ${JSON.stringify(join(f.main, '.git') + '\n')}); process.exit(0);\n` :
        mode === 'budget' ? `  fs.writeSync(1, 'x'.repeat(3 * 1024 * 1024)); setInterval(() => {}, 1000);\n` :
          `  fs.writeSync(1, 'ready\\n'); setInterval(() => {}, 1000);\n`) +
      `});\n`);
    await chmod(join(bin, 'git'), 0o755);
    const runner = join(f.dir, 'runner.mjs');
    await writeFile(runner, `import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';\n` +
      `const spawn = cp.spawn; let exited = false, owned; let triggerDeadline;\n` +
      (mode === 'timeout' ? `const schedule = globalThis.setTimeout; globalThis.setTimeout = (fn, ms, ...args) => {\n` +
        `  const timer = schedule(fn, ms, ...args); if (ms > 40000) triggerDeadline = () => {clearTimeout(timer); fn(...args);}; return timer;\n` +
        `};\n` : '') +
      `cp.spawn = (...args) => {const child = spawn(...args); owned = child; child.once('exit', () => {exited = true;});\n` +
      (mode === 'timeout' ? `  child.stdout.once('data', () => triggerDeadline());\n` : '') +
      `  return child;}; syncBuiltinESMExports();\n` +
      `const {scanWorktrees} = await import(${JSON.stringify(pathToFileURL(CLI).href)});\n` +
      `const scan = await scanWorktrees({cwd:${JSON.stringify(f.main)}});\n` +
      `const listeners = [owned.listenerCount('exit'), owned.listenerCount('close'), owned.listenerCount('error'), owned.stdout.listenerCount('data'), owned.stderr.listenerCount('data')];\n` +
      `console.log(JSON.stringify({scan, exited, code:owned.exitCode, signal:owned.signalCode, pipesDestroyed:owned.stdout.destroyed && owned.stderr.destroyed, listeners}));\n`);
    try {
      const output = spawnSync(process.execPath, [runner], { env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` }, encoding: 'utf8', timeout: 4000 });
      assert.equal(output.status, 0, output.error?.message ?? output.stderr);
      const { scan, exited, code, signal, pipesDestroyed, listeners } = JSON.parse(output.stdout);
      const pids = JSON.parse(await readFile(pidsFile, 'utf8'));
      assert.equal(exited, true, 'the actual owned-child exit event was observed before settlement');
      assert.throws(() => process.kill(pids.owned, 0), { code: 'ESRCH' });
      assert.doesNotThrow(() => process.kill(pids.descendant, 0), 'the handshaken descendant is still alive at settlement');
      assert.equal(pipesDestroyed, true, 'owned pipe handles are released before settlement');
      assert.deepEqual(listeners, [0, 0, 0, 0, 0], 'owned lifecycle and data listeners are removed');
      assert.equal(scan.rows.length, 0);
      assert.deepEqual(scan.issues, [mode === 'natural' ? 'GIT_READ_FAILED' : mode === 'budget' ? 'READ_BUDGET' : 'READ_TIMEOUT']);
      assert.equal(mode === 'natural' ? code : signal, mode === 'natural' ? 0 : 'SIGKILL');
    } finally {
      const pids = JSON.parse(await readFile(pidsFile, 'utf8').catch(() => '{}'));
      for (const pid of [pids.owned, pids.descendant]) {
        if (!pid) continue;
        try { process.kill(pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      }
    }
  });
}

test('unavailable Git settles with its original failure after spawn closure', async (t) => {
  const f = await fixture(t);
  const output = spawnSync(process.execPath, [CLI, 'scan', '--cwd', f.main], { env: { ...process.env, PATH: join(f.dir, 'absent-bin') }, encoding: 'utf8', timeout: 4000 });
  assert.equal(output.status, 0, output.stderr);
  assert.deepEqual(JSON.parse(output.stdout).issues, ['GIT_UNAVAILABLE']);
});
