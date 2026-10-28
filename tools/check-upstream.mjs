import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const bun=process.env.OMS_BUN || 'bun';
function run(exe,args,cwd){const r=spawnSync(exe,args,{cwd,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw Error(`upstream check failed: ${args.join(' ')}`);}
const version=spawnSync(bun,['--version'],{encoding:'utf8'});if(version.stdout?.trim()!=='1.4.4')throw Error('upstream checks require Bun 1.4.4; set OMS_BUN');
const temp=mkdtempSync(join(tmpdir(),'oms-upstream-check-'));
try {
 cpSync(join(root,'upstream/vendor/pstack-claude'),temp,{recursive:true,filter:p=>!p.split('/').includes('node_modules')});
 run('git',['init','--quiet'],temp);run('git',['add','.'],temp);
 run(bun,['install','--frozen-lockfile'],temp);
 run(bun,['tools/generate.mjs','--check'],temp);
 run(bun,['test','tests/'],temp);
 const scripts=join(temp,'plugins/pstack/skills/poteto-mode/scripts');
 run(bun,['install','--frozen-lockfile'],scripts);
 run(bun,['run','typecheck'],scripts);
 run(bun,['test','orch','watch-pr','check-plan.test.ts'],scripts);
 run(bun,['x','prettier@3.6.2','--check','.'],scripts);
 const statechart=join(temp,'plugins/pstack/skills/statechart/scripts');
 run(bun,['install','--frozen-lockfile'],statechart);
 run(bun,['run','test'],statechart);
} finally {rmSync(temp,{recursive:true,force:true});}
