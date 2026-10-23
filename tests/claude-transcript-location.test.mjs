import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { locateClaudeTranscript } from '../tools/claude-transcript-location.mjs';
const script = fileURLToPath(new URL('../tools/claude-transcript-location.mjs', import.meta.url));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'oms-claude-session-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const configDir = join(root, 'custom config'), projects = join(configDir, 'projects');
  await mkdir(projects, { recursive: true });
  const put = async (name, bytes = 'private chat must remain unread\n') => {
    const path = join(projects, name); await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes); return path;
  };
  return { root, configDir, projects, put };
}

test('session identity finds the original project after changing cwd, without parsing chat bodies', async t => {
  const f = await fixture(t), sessionId = 'session-123';
  const original = await f.put(`original/${sessionId}.jsonl`);
  await f.put('current-worktree/another-session.jsonl');
  const output = execFileSync(process.execPath, [script], { cwd: join(f.projects, 'current-worktree'), encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: f.configDir, CLAUDE_CODE_SESSION_ID: sessionId } });
  const result = JSON.parse(output);
  assert.equal(result.status, 'located'); assert.equal(result.basis, 'session-id');
  // realpath canonicalizes /tmp on macOS.
  const { realpath } = await import('node:fs/promises');
  assert.equal(result.transcriptPath, await realpath(original));
  assert.equal(await readFile(original, 'utf8'), 'private chat must remain unread\n');
});

test('nested transcript works but a bare Workflow session directory is not evidence', async t => {
  const f = await fixture(t);
  await mkdir(join(f.projects, 'decoy', 'abc'), { recursive: true });
  await f.put('actual/abc/abc.jsonl');
  const result = await locateClaudeTranscript({ configDir: f.configDir, sessionId: 'abc' });
  assert.equal(result.status, 'located'); assert.match(result.transcriptPath, /actual[/\\]abc[/\\]abc.jsonl$/);
});

test('multiple matching sessions are ambiguous and an unmatched identity never falls back to cwd', async t => {
  const f = await fixture(t);
  await f.put('one/abc.jsonl'); await f.put('two/abc.jsonl');
  assert.equal((await locateClaudeTranscript({ configDir: f.configDir, sessionId: 'abc' })).status, 'ambiguous');
  const missing = await locateClaudeTranscript({ configDir: f.configDir, sessionId: 'missing' });
  assert.equal(missing.status, 'unavailable'); assert.equal(missing.transcriptPath, null);
  assert.equal((await locateClaudeTranscript({ configDir: f.configDir })).reason, 'session-id-required');
});

test('an explicit host path wins, but mismatches and missing host paths do not trigger fallback', async t => {
  const f = await fixture(t), path = await f.put('one/abc.jsonl');
  await f.put('two/abc.jsonl');
  assert.equal((await locateClaudeTranscript({ sessionId: 'abc', transcriptPath: path })).status, 'located');
  assert.equal((await locateClaudeTranscript({ sessionId: 'other', transcriptPath: path })).reason, 'transcript-identity-mismatch');
  assert.equal((await locateClaudeTranscript({ sessionId: 'abc', transcriptPath: join(f.projects, 'missing', 'abc.jsonl'), configDir: f.configDir })).status, 'unavailable');
});

test('invalid selectors cannot escape the chosen configuration', async t => {
  const f = await fixture(t);
  for (const sessionId of ['../secret', '/tmp/x', '', 'a/b', 123, null]) await assert.rejects(locateClaudeTranscript({ sessionId, configDir: f.configDir }), /Invalid Claude session ID/);
  await assert.rejects(locateClaudeTranscript({ sessionId: 'abc', configDir: 'relative' }), /must be absolute/);
  await assert.rejects(locateClaudeTranscript({ transcriptPath: 'relative.jsonl' }), /must be absolute/);
  const run = spawnSync(process.execPath, [script, '--unknown', 'x'], { encoding: 'utf8' });
  assert.equal(run.status, 2); assert.equal(run.stdout, '');
});

test('a project symlink and missing project store leave lookup unavailable', async t => {
  const f = await fixture(t);
  if (process.platform !== 'win32') {
    await symlink(f.root, join(f.projects, 'alias'));
    assert.equal((await locateClaudeTranscript({ sessionId: 'abc', configDir: f.configDir })).reason, 'project-symlink-unresolved');
  }
  assert.equal((await locateClaudeTranscript({ sessionId: 'abc', userRoot: f.root })).reason, 'projects-directory-unavailable');
});


test('packaged native helper runs outside the installation directory with an explicit session identity', async t => {
  const f = await fixture(t); await f.put('original/abc.jsonl');
  const packaged = fileURLToPath(new URL('../packages/claude-code/scripts/claude-transcript-location.mjs', import.meta.url));
  const output = execFileSync(process.execPath, [packaged, '--session-id', 'abc', '--config-dir', f.configDir], { cwd: f.root, encoding: 'utf8', env: { ...process.env, CLAUDE_CODE_SESSION_ID: '', CLAUDE_CONFIG_DIR: '' } });
  assert.equal(JSON.parse(output).status, 'located');
  const guide = await readFile(new URL('../packages/claude-code/docs/runtime-binding.md', import.meta.url), 'utf8');
  assert.match(guide, /claude-transcript-location.mjs/);
});

test('an oversized project inventory cannot establish a unique session', async t => {
  const f = await fixture(t);
  await Promise.all(Array.from({ length: 1025 }, (_, index) => mkdir(join(f.projects, `project-${index}`))));
  const result = await locateClaudeTranscript({ configDir: f.configDir, sessionId: 'abc' });
  assert.equal(result.status, 'unavailable'); assert.equal(result.reason, 'project-scan-limit');
});
