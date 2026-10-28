import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256,packageInventory } from './release-lib.mjs';
import { repoRoot,readJson } from './generate.mjs';
export async function validateResourceLinks(path){
 const parser=new MarkdownIt();const tokens=parser.parse(await readFile(path,'utf8'),{});
 for(const token of tokens)for(const child of token.children??[]){
  if(child.type!=='link_open')continue;
  const href=child.attrGet('href');
  if(!href||/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)||/[<>]/.test(href)||['link','url','...'].includes(href))continue;
  const file=decodeURIComponent(href.split('#')[0]);if(!file)continue;
  await stat(resolve(dirname(path),file)).catch(()=>{throw Error(`missing concrete resource ${file} in ${path}`)});
 }
}
export async function validateDistribution(root=repoRoot){
 const sources=await readJson(join(root,'upstream/distribution.json'));
 for(const source of Object.values(sources)){
  assert.match(source.revision,/^[a-f0-9]{40}$/);
  const inventory=[]; async function walk(dir,prefix=''){for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='node_modules')continue;const path=prefix+e.name;if(e.isDirectory())await walk(join(dir,e.name),path+'/');else {assert(e.isFile(),'source must be regular file');inventory.push({path});}}} await walk(join(root,source.path));
  assert.deepEqual(inventory.map(x=>x.path).sort(),source.files.map(x=>x.path).sort(),'source file set');
  for(const f of source.files){const data=await readFile(join(root,source.path,f.path));assert.equal(sha256(data),f.sha256,`${source.repository}: ${f.path}`);
   assert.equal(createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex'),f.blob,'Git blob identity');
   const mode=(await stat(join(root,source.path,f.path))).mode;
   if(process.platform!=='win32') assert.equal(Boolean(mode & 0o111),f.mode==='100755','source executable mode '+f.path);}
 }
 assert.equal(Object.keys(sources.aihero.selected).length,20);
 for(const [skill,deps] of Object.entries(sources.aihero.dependencyEdges))for(const dep of deps){
  assert(sources.aihero.selected[skill],'unknown dependency owner');
  assert(sources.aihero.selected[dep]||sources.aihero.dependencies[dep],`missing invoked AIHero dependency ${skill} -> ${dep}`);
 }
 assert.deepEqual(sources.aihero.dependencyEdges.wayfinder,['prototype']);
 for(const target of ['codex','claude-code','pi']){
  const dest=join(root,'packages',target);
  assert(!(await packageInventory(dest)).some(f=>f.path.split('/').includes('node_modules')),'packaged dependency directory');
  assert.equal(await readFile(join(dest,'models.json'),'utf8'),await readFile(join(root,sources['pstack-claude'].path,'plugins/pstack/models.json'),'utf8'));
  for(const [name,path] of Object.entries({...sources.aihero.selected,...sources.aihero.dependencies})){
   const original=await packageInventory(join(root,sources.aihero.path,path));
   const packaged=await packageInventory(join(dest,'skills',name));
   assert.deepEqual(packaged,original,`${target}: AIHero original resources ${name}`);
   for(const f of packaged)if(f.path.endsWith('.md'))await validateResourceLinks(join(dest,'skills',name,f.path));
  }
  for(const file of await packageInventory(dest))if(file.path.endsWith('.md') && /^(skills|agents)\//.test(file.path)){
   const text=await readFile(join(dest,file.path),'utf8');
   assert(!text.includes('pstack:'),`stale plugin namespace: ${file.path}`);
   for(const [,name] of text.matchAll(/oh-my-stack:([a-z][a-z0-9-]*)/g)){
    const names=[...(await readdir(join(dest,'skills'))),...(await readdir(join(dest,'agents'))).map(x=>x.replace(/\.md$/,''))];
    assert(names.includes(name),`unresolved plugin reference ${name} in ${file.path}`);
   }
  }
 }
}
if(process.argv[1]===new URL(import.meta.url).pathname)await validateDistribution();
