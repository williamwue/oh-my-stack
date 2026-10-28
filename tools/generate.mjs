#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile, mkdtemp } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { packageInventory } from './release-lib.mjs';
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const readJson = async p => JSON.parse(await readFile(p, 'utf8'));
const json = x => JSON.stringify(x, null, 2)+'\n';
export async function generate({root=repoRoot, out=join(root,'packages')}={}) {
 const sources = await readJson(join(root,'upstream/distribution.json'));
 const project = await readJson(join(root,'src/core/project.json'));
 const port = join(root,sources['pstack-claude'].path);
 await rm(out,{recursive:true,force:true});
 for (const target of ['codex','claude-code','pi']) {
  const dest=join(out,target); await mkdir(dest,{recursive:true});
  await cp(join(port,'plugins/pstack'),dest,{recursive:true,filter:p=>!p.split('/').includes('node_modules')});
  for(const entry of ['.github','.muse-plugin']) await rm(join(dest,entry),{recursive:true,force:true});
  for(const [name,path] of Object.entries({...sources.aihero.selected,...sources.aihero.dependencies})) {
   const collision=await readFile(join(dest,'skills',name,'SKILL.md')).catch(()=>null);
   if(collision) throw Error('AIHero skill collision: '+name);
   await cp(join(root,sources.aihero.path,path),join(dest,'skills',name),{recursive:true});
  }
  // Only namespace identifiers change; personal pstack-models paths/defaults stay upstream-owned.
  const files=await packageInventory(dest);
  for(const f of files) if(/\.(md|json|ts|sh|ps1|mjs|awk)$/.test(f.path)) {
   const path=join(dest,f.path), text=await readFile(path,'utf8');
   await writeFile(path,text.replaceAll('pstack:', 'oh-my-stack:'));
  }
  await cp(join(root,'src/packaging/INSTALL.md'),join(dest,'INSTALL.md'));
  await cp(join(root,'src/packaging/INSTALL.md'),join(dest,'README.md'));
  const help=join(dest,'skills/poteto-help/SKILL.md');
  await writeFile(help,(await readFile(help,'utf8')).replace(/^(# .+)$/m,'$1\n\nFor installation or updates of this OMS distribution, read [OMS installation](../../INSTALL.md) first; it supersedes upstream pstack install commands.'));
  const context=join(dest,'hooks/session-start-context.md');
  await writeFile(context,(await readFile(context,'utf8'))+'\nFor OMS installation and updates, read INSTALL.md in this plugin first; upstream pstack install commands do not update OMS.\nWhen T3 Code tools are available, read skills/poteto-mode/references/t3-tools.md from this plugin before dispatching any child, including from standalone AIHero extensions.\n');
  const mode=join(dest,'skills/poteto-mode/SKILL.md');
  await writeFile(mode,(await readFile(mode,'utf8')).replace('## Platform Adaptation',
   'When running in T3 Code, first read [the T3 mapping](references/t3-tools.md). It resolves dispatch tools for this host; workflow and model defaults remain upstream-owned.\n\n## Platform Adaptation'));
  await cp(join(root,'src/adapters/t3-tools.md'),join(dest,'skills/poteto-mode/references/t3-tools.md'));
  for(const license of ['LICENSE','LICENSE-cursor-team-kit','LICENSE-thermos','NOTICE.md','NOTICE-skills.md']) await cp(join(port,license),join(dest,license));
  await cp(join(root,sources.aihero.path,'LICENSE'),join(dest,'LICENSE-AIHero'));
  for(const kind of ['codex','claude']) {
   const path=join(dest,`.${kind}-plugin/plugin.json`), manifest=await readJson(path);
   manifest.name=project.name; manifest.version=project.version;
   if(kind==='codex')manifest.interface.displayName='Oh My Stack';
   else manifest.displayName='Oh My Stack';
   await writeFile(path,json(manifest));
  }
  const pi=await readJson(join(port,'package.json'));
  pi.name='oh-my-stack';pi.version=project.version;pi.private=false;
  pi.pi={skills:['./skills'],extensions:['./pi/index.ts']};
  await writeFile(join(dest,'package.json'),json(pi));
  await writeFile(join(dest,'GENERATION.json'),json({generatedBy:'tools/generate.mjs',target,sourceVersion:project.version,profiles:[],selection:{source:'pstack-claude',extensions:['aihero','t3']},sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,{repository:v.repository,revision:v.revision}]))}));
 }
}
async function main(){
 if(process.argv.includes('--check')) {
  const temp=await mkdtemp(join(tmpdir(),'oms-generate-'));
  try {await generate({out:temp}); if(JSON.stringify(await packageInventory(temp))!==JSON.stringify(await packageInventory(join(repoRoot,'packages'))))throw Error('generated packages drift');}finally{await rm(temp,{recursive:true,force:true});}
 }else await generate();
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=1;});
