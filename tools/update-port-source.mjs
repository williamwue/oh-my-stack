// Refresh the complete port snapshot from Git blobs, without checkout filters.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, chmod, lstat } from 'node:fs/promises';
import { dirname, resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [checkout, revision] = process.argv.slice(2);
assert(checkout && /^[a-f0-9]{40}$/.test(revision ?? ''),
  'Usage: node tools/update-port-source.mjs GIT_ROOT FULL_REVISION');
const git = (...args) => execFileSync('git', ['-C', checkout, ...args], { maxBuffer: 64 * 1024 * 1024 });
const receiptPath = join(root, 'upstream/distribution.json');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
const source = receipt['pstack-claude'];
assert.equal(git('remote', 'get-url', 'origin').toString().trim().replace(/\.git$/, ''), source.repository);
git('merge-base', '--is-ancestor', source.revision, revision);
const files = git('ls-tree', '-r', '-z', revision).toString().split('\0').filter(Boolean).map(line => {
  const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);
  assert(match, `Unsupported tree entry: ${line}`);
  const [, mode, blob, path] = match;
  return { path, mode, blob };
});
// Read all objects before mutating the snapshot.
const objects = files.map(file => git('cat-file', 'blob', file.blob));
const destination = resolve(root, source.path);
assert.equal(destination, join(root, 'upstream/vendor/pstack-claude'));
// Reject platform-specific separators and existing links before any writes.
for (const file of [...source.files, ...files]) {
  assert(!/[\\:]/.test(file.path), `Non-portable source path: ${file.path}`);
  const parts = file.path.split('/');
  assert(parts.every(part => part && part !== '.' && part !== '..' && part.toLowerCase() !== '.git'));
  assert(resolve(destination, file.path).startsWith(destination + sep));
  let ancestor = root;
  for (const part of ['upstream', 'vendor', 'pstack-claude', ...parts]) {
    ancestor = join(ancestor, part);
    const entry = await lstat(ancestor).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    assert(!entry?.isSymbolicLink(), `Source path is a symbolic link: ${ancestor}`);
  }
}
for (const [index, file] of files.entries()) {
  const data = objects[index];
  const path = join(destination, file.path);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  if (process.platform !== 'win32') await chmod(path, file.mode === '100755' ? 0o755 : 0o644);
  file.sha256 = createHash('sha256').update(data).digest('hex');
}
const nextPaths = new Set(files.map(file => file.path));
for (const file of source.files) if (!nextPaths.has(file.path)) await unlink(join(destination, file.path));
source.revision = revision;
source.files = files;
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(`Pinned pstack-claude ${revision}: ${files.length} original Git blobs.`);
