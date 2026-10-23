#!/usr/bin/env node
import { lstat, opendir, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/;
const MAX_PROJECTS = 1024;

function inside(root, path) {
  const suffix = relative(root, path);
  return suffix !== '' && suffix !== '..' && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
}

async function metadata(path) {
  try { return await lstat(path); }
  catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

// This identifies a file by host-supplied identity and names, never by reading chats.
export async function locateClaudeTranscript({ sessionId, transcriptPath, configDir, userRoot = homedir() } = {}) {
  if (sessionId !== undefined && (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId))) throw new Error('Invalid Claude session ID');
  if (configDir !== undefined && (!configDir || !isAbsolute(configDir))) throw new Error('Claude config directory must be absolute');
  if (!isAbsolute(userRoot)) throw new Error('User root must be absolute');
  if (transcriptPath !== undefined && (!transcriptPath || !isAbsolute(transcriptPath))) throw new Error('Transcript path must be absolute');
  const result = (status, basis, reason, paths = []) => ({ status, basis, reason, sessionId: sessionId ?? null,
    transcriptPath: status === 'located' ? paths[0] : null,
    transcriptDirectory: status === 'located' ? dirname(paths[0]) : null });
  if (transcriptPath !== undefined) {
    if (!transcriptPath.endsWith('.jsonl') || sessionId && basename(transcriptPath) !== `${sessionId}.jsonl`) {
      return result('unavailable', 'host-path', 'transcript-identity-mismatch');
    }
    try {
      const stat = await metadata(transcriptPath);
      if (!stat?.isFile() || stat.isSymbolicLink()) return result('unavailable', 'host-path', 'transcript-not-regular');
      return result('located', 'host-path', 'host-path-located', [await realpath(transcriptPath)]);
    } catch { return result('unavailable', 'host-path', 'transcript-metadata-unavailable'); }
  }
  if (!sessionId) return result('unavailable', 'session-id', 'session-id-required');
  const projects = join(configDir ?? join(userRoot, '.claude'), 'projects');
  const matches = [];
  try {
    const stat = await metadata(projects);
    if (!stat?.isDirectory() || stat.isSymbolicLink()) return result('unavailable', 'session-id', 'projects-directory-unavailable');
    const projectsRoot = await realpath(projects);
    const directories = await opendir(projects);
    let count = 0;
    for await (const entry of directories) {
      if (++count > MAX_PROJECTS) return result('unavailable', 'session-id', 'project-scan-limit');
      if (entry.isSymbolicLink()) return result('unavailable', 'session-id', 'project-symlink-unresolved');
      if (!entry.isDirectory()) continue;
      const project = join(projects, entry.name);
      const projectStat = await metadata(project);
      const projectRoot = await realpath(project);
      if (!projectStat?.isDirectory() || projectStat.isSymbolicLink() || !inside(projectsRoot, projectRoot)) return result('unavailable', 'session-id', 'project-identity-changed');
      const nested = join(project, sessionId);
      const nestedStat = await metadata(nested);
      if (nestedStat?.isSymbolicLink()) return result('unavailable', 'session-id', 'session-symlink-unresolved');
      const candidates = [join(project, `${sessionId}.jsonl`)];
      if (nestedStat?.isDirectory()) candidates.push(join(nested, `${sessionId}.jsonl`));
      for (const candidate of candidates) {
        const file = await metadata(candidate);
        if (file?.isSymbolicLink()) return result('unavailable', 'session-id', 'transcript-symlink-unresolved');
        if (file?.isFile()) {
          const resolved = await realpath(candidate);
          if (!inside(projectRoot, resolved)) return result('unavailable', 'session-id', 'transcript-outside-project');
          matches.push(resolved);
        }
      }
      const after = await metadata(project);
      if (!after?.isDirectory() || after.isSymbolicLink() || after.dev !== projectStat.dev || after.ino !== projectStat.ino) return result('unavailable', 'session-id', 'project-identity-changed');
    }
    const after = await metadata(projects);
    if (!after?.isDirectory() || after.isSymbolicLink() || after.dev !== stat.dev || after.ino !== stat.ino) return result('unavailable', 'session-id', 'projects-identity-changed');
  } catch { return result('unavailable', 'session-id', 'project-scan-incomplete'); }
  if (matches.length > 1) return result('ambiguous', 'session-id', 'multiple-session-transcripts');
  return matches.length ? result('located', 'session-id', 'unique-session-filename', matches)
    : result('unavailable', 'session-id', 'session-transcript-not-found');
}

async function main(args) {
  const values = {};
  const keys = { '--session-id': 'sessionId', '--transcript': 'transcriptPath', '--config-dir': 'configDir' };
  for (let index = 0; index < args.length; index += 2) {
    const key = keys[args[index]];
    if (!key || index + 1 === args.length || Object.hasOwn(values, key)) throw new Error('Usage: claude-transcript-location.mjs [--session-id ID] [--transcript ABSOLUTE_PATH] [--config-dir ABSOLUTE_PATH]');
    values[key] = args[index + 1];
  }
  const result = await locateClaudeTranscript({ sessionId: process.env.CLAUDE_CODE_SESSION_ID || undefined,
    configDir: process.env.CLAUDE_CONFIG_DIR || undefined, ...values });
  console.log(JSON.stringify(result));
  process.exitCode = result.status === 'located' ? 0 : 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 2; });
}
