import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverReviewModules, validateModuleReviews } from '../tools/module-review.mjs';
import { sha256 } from '../tools/pstack-source.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'oms-module-review-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'tools')); await mkdir(join(root, 'upstream')); await mkdir(join(root, 'notes'));
  await writeFile(join(root, 'tools/example.mjs'), 'export const result = 1;\n');
  await writeFile(join(root, 'notes/review.md'), 'Compared both fixed source implementations.\n');
  const registry = { sources: { official: { assessedRevision: '1'.repeat(40) }, reference: { assessedRevision: '2'.repeat(40) } } };
  const index = { repository: 'https://github.com/michael-denyer/pstack-claude', revision: '2'.repeat(40), files: [
    { path: 'tools/example.mjs', mode: '100644', blobSha1: '3'.repeat(40), sha256: '4'.repeat(64) },
  ] };
  const indexPath = 'notes/reference-index.json', indexBytes = JSON.stringify(index);
  await writeFile(join(root, indexPath), indexBytes);
  const modules = (await discoverReviewModules({ root })).map(module => ({ ...module, decision: 'retain',
    rationale: 'Keep the bounded read-only host adaptation.', evidence: ['notes/review.md'],
    official: { paths: [], rationale: 'No corresponding tool in the official source scope.' },
    reference: { paths: ['tools/example.mjs'], rationale: 'Compared the secondary reference implementation.' } }));
  const manifest = { schemaVersion: 1, officialRevision: '1'.repeat(40), referenceRevision: '2'.repeat(40),
    referenceIndex: { path: indexPath, sha256: sha256(indexBytes) }, modules };
  const path = join(root, 'upstream/module-reviews.json');
  await writeFile(path, JSON.stringify(manifest));
  const sourceState = { registry, officialFiles: new Map() };
  return { root, path, manifest, sourceState, check: () => validateModuleReviews({ root, sourceState }) };
}

test('module coverage is deterministic and accepts only the reviewed source bytes', async t => {
  const f = await fixture(t);
  const before = await readFile(f.path, 'utf8');
  assert.deepEqual(await f.check(), { modules: 1, files: 1 });
  assert.deepEqual(await discoverReviewModules({ root: f.root }), await discoverReviewModules({ root: f.root }));
  assert.equal(await readFile(f.path, 'utf8'), before);
  await writeFile(join(f.root, 'tools/example.mjs'), 'export const result = 2;\n');
  await assert.rejects(f.check(), /Module review drift/);
});

test('new modules, new files within a module and deleted sources cannot silently escape coverage', async t => {
  const f = await fixture(t);
  await writeFile(join(f.root, 'tools/new.mjs'), 'new module\n');
  await assert.rejects(f.check(), /Unreviewed active modules/);
  await rm(join(f.root, 'tools/new.mjs'));
  await writeFile(join(f.root, 'tools/example.json'), '{}');
  await assert.rejects(f.check(), /Module review drift/);
  await rm(join(f.root, 'tools/example.json'));
  await mkdir(join(f.root, 'src/core/skills/demo'), { recursive: true });
  await writeFile(join(f.root, 'src/core/skills/demo/SKILL.md'), 'new workflow\n');
  await assert.rejects(f.check(), /Unreviewed active modules/);
  await rm(join(f.root, 'src'), { recursive: true });
  await rm(join(f.root, 'tools/example.mjs'));
  await assert.rejects(f.check(), /Unknown or reassigned/);
});

test('case-reviewed files require valid source pins, reference index and evidence', async t => {
  const f = await fixture(t), original = structuredClone(f.manifest);
  for (const [edit, error] of [
    [m => m.officialRevision = '0'.repeat(40), /source revisions/],
    [m => m.referenceIndex.sha256 = '0'.repeat(64), /index drift/],
    [m => m.modules[0].reference.paths.push('missing.mjs'), /Unknown reference/],
    [m => m.modules[0].official.paths.push('missing.mjs'), /Unknown official/],
    [m => m.modules[0].evidence = ['notes/missing.md'], /ENOENT/],
    [m => m.modules[0].evidence = ['../outside'], /Unsafe path/],
    [m => m.modules.push(m.modules[0]), /Duplicate reviewed module/],
  ]) {
    const changed = structuredClone(original); edit(changed); await writeFile(f.path, JSON.stringify(changed));
    await assert.rejects(f.check(), error);
  }
});

test('historical and generated outputs are outside the current-source review boundary', async t => {
  const f = await fixture(t), before = await discoverReviewModules({ root: f.root });
  for (const path of ['packages/codex/old.mjs', 'upstream/snapshots/old/source.mjs', 'evals/evidence/old/result.json',
    'output/generated.mjs', 'docs/history/old.md', 'tools/books/__pycache__/generated.pyc']) {
    await mkdir(join(f.root, path, '..'), { recursive: true }); await writeFile(join(f.root, path), 'frozen or generated\n');
  }
  assert.deepEqual(await discoverReviewModules({ root: f.root }), before);
  await symlink(join(f.root, 'notes/review.md'), join(f.root, 'tools/alias.mjs'));
  await assert.rejects(discoverReviewModules({ root: f.root }), /symlink/);
});
