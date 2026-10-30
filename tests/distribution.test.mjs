import test from 'node:test';
import assert from 'node:assert/strict';
import { cp,mkdtemp,mkdir,readFile,rm,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { validateDistribution,validateResourceLinks } from '../tools/validate-distribution.mjs';
import { buildRelease } from '../tools/build-release.mjs';
import { buildStableMarketplace } from '../tools/stable-marketplace.mjs';
import { installArchive,inventoryDigest,packageInventory,sha256 } from '../tools/release-lib.mjs';
import { repoRoot } from '../tools/generate.mjs';
test('pinned complete sources, original AIHero resources, model defaults and native references',()=>validateDistribution());
test('omitted AIHero invoked dependency is rejected',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'oms-dependency-'));
 try{
  await mkdir(join(temp,'upstream'));
  const receipt=JSON.parse(await readFile(join(repoRoot,'upstream/distribution.json')));
  delete receipt.aihero.dependencies.prototype;
  // Link read-only pinned sources into the fixture; only the receipt is modified.
  const {symlink}=await import('node:fs/promises');
  await symlink(join(repoRoot,'upstream/vendor'),join(temp,'upstream/vendor'),'dir');
  await writeFile(join(temp,'upstream/distribution.json'),JSON.stringify(receipt));
  await assert.rejects(validateDistribution(temp),/missing invoked AIHero dependency/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('resource links reject missing files and preserve fenced/placeholder examples',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'oms-links-'));
 try{
  const path=join(temp,'SKILL.md');
  await writeFile(path,'```md\n[example](missing.md)\n```\n[example](link)\n');
  await validateResourceLinks(path);
  await writeFile(path,'[real resource](missing.md)');
  await assert.rejects(validateResourceLinks(path),/missing concrete resource/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('canonical inventory digest uses compact JSON with one LF',()=>{
 const files=[{path:'a',size:1,mode:'0644',sha256:'abc'}];
 assert.equal(inventoryDigest(files),sha256(Buffer.from(JSON.stringify(files)+'\n')));
 assert.notEqual(inventoryDigest(files),sha256(Buffer.from(JSON.stringify(files,null,2)+'\n')));
});
test('clean tagged archives install and promote through the real stable builder',async()=>{
 const version=JSON.parse(await readFile(join(repoRoot,'src/core/project.json'),'utf8')).version;
 const tag=`v${version}`;
 const temp=await mkdtemp(join(tmpdir(),'oms-distribution-'));
 try{
  const root=join(temp,'source');await mkdir(root);
  for(const path of ['packages','src/core/project.json','src/packaging/release.json']){await mkdir(join(root,path,'..'),{recursive:true});await cp(join(repoRoot,path),join(root,path),{recursive:true});}
  const git=(...args)=>execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid',...args],{cwd:root,encoding:'utf8'}).trim();
  git('init','--quiet');git('add','.');git('commit','--quiet','-m','fixture');git('tag',tag);
  const assets=join(temp,'assets');const manifest=await buildRelease({root,out:assets,tag});
  assert.equal(manifest.source.commit,git('rev-parse','HEAD'));assert.equal(manifest.source.cleanTaggedCheckout,true);
  for(const artifact of manifest.artifacts){
   const destination=join(temp,'installed',artifact.target);
   await installArchive({archive:await readFile(join(assets,artifact.file)),artifact,destination,archiveRoot:manifest.archiveRoot});
   assert.deepEqual(await packageInventory(destination),artifact.files);
  }
  const release={id:1,tag_name:tag,html_url:`https://github.com/williamwue/oh-my-stack/releases/tag/${tag}`,draft:false,prerelease:false,published_at:'2026-10-28T00:00:00Z',assets:[]};
  const {readdir}=await import('node:fs/promises');
  for(const name of await readdir(assets)){const data=await readFile(join(assets,name));release.assets.push({name,state:'uploaded',digest:'sha256:'+sha256(data),size:data.length});}
  const result=await buildStableMarketplace({assets,release,out:join(temp,'stable')});
  assert.equal(result.receipt.version,version);
  const stable=await readFile(join(temp,'stable/plugins/codex/skills/wayfinder/SKILL.md'));
  assert.deepEqual(stable,await readFile(join(repoRoot,'packages/codex/skills/wayfinder/SKILL.md')));
  manifest.artifacts[0].contentSha256=sha256(Buffer.from(JSON.stringify(manifest.artifacts[0].files,null,2)+'\n'));
  // A wrong serializer must still fail, even if outer transport hashes are updated.
  const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');await writeFile(join(assets,'release-manifest.json'),bytes);
  const sums=(await readFile(join(assets,'SHA256SUMS'),'utf8')).replace(/^[a-f0-9]{64}  release-manifest.json$/m,sha256(bytes)+'  release-manifest.json');await writeFile(join(assets,'SHA256SUMS'),sums);
  for(const asset of release.assets){const data=await readFile(join(assets,asset.name));asset.digest='sha256:'+sha256(data);asset.size=data.length;}
  await assert.rejects(buildStableMarketplace({assets,release,out:join(temp,'bad-stable')}),/content inventory digest mismatch/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
