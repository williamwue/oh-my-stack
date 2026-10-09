import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { freezeAcceptance, inspectDelivery, verifyDelivery } from '../tools/delivery-evidence.mjs';

const cli = fileURLToPath(new URL('../tools/delivery-evidence.mjs', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (root, rel, value) => fs.writeFile(path.join(root,rel), typeof value === 'string' ? value : `${JSON.stringify(value,null,2)}\n`);
async function source(root) {
  const entries = [];
  async function visit(rel) {
    const stat = await fs.lstat(path.join(root,rel));
    if (stat.isDirectory()) for (const name of await fs.readdir(path.join(root,rel))) await visit(`${rel}/${name}`);
    else entries.push({path:rel,sha256:sha(await fs.readFile(path.join(root,rel)))});
  }
  await visit('src'); return entries.sort((a,b) => a.path.localeCompare(b.path,'en'));
}
async function fixture(t, { mode='narrow', delegated=false, harness, candidates={count:0} } = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'delivery-evidence-'))); t.after(() => fs.rm(root,{recursive:true,force:true}));
  await Promise.all(['src','task','harness'].map(dir => fs.mkdir(path.join(root,dir))));
  await write(root,'src/normalize.mjs',"export const normalize = value => value.trim().toLowerCase();\n");
  await write(root,'src/render.mjs',"export const render = value => `<h1>${value}</h1>`;\n");
  await write(root,'harness/combined.mjs',harness ?? "import assert from 'node:assert/strict'; import {normalize} from '../src/normalize.mjs'; import {render} from '../src/render.mjs'; assert.equal(render(normalize(' HELLO ')), '<h1>hello</h1>'); console.log('combined user path passed');\n");
  await write(root,'harness/config.json',{capture:'fixed'});
  const plan = {version:1,taskId:'task-1',mode,predicate:'Public normalizer and renderer cooperate',sourceRoots:['src'],immutablePaths:['harness/combined.mjs','harness/config.json'],candidates:mode==='full' && candidates.count===0 ? {count:2} : candidates,units:[{id:'output',ownedPaths:['src'],delegated}],checks:[{id:'combined',argv:['node','harness/combined.mjs'],cwd:'.',timeoutMs:1000,outputLimitBytes:1024,required:true}],requiredCombinedCheck:'combined',...(mode==='narrow' ? {narrow:{reason:'Root-owned bounded implementation',omittedFullRequirements:['design','visual']}} : {})};
  await write(root,'task/plan.json',plan);
  const frozen = await freezeAcceptance({root,plan:'task/plan.json',out:'task/lock.json'});
  const options = {root,lock:'task/lock.json',expectedLockSha256:frozen.lockSha256,evidence:'task/evidence.json'};
  const evidence = {version:1,taskId:plan.taskId,lockSha256:frozen.lockSha256,finalSource:[],artifacts:[],units:[],reviews:[]};
  const refresh = async () => { evidence.finalSource = await source(root); evidence.units = [{id:'output',outputDigest:sha(JSON.stringify(evidence.finalSource)),...(evidence.units[0]?.authority ? {authority:evidence.units[0].authority} : {})}]; await write(root,options.evidence,evidence); };
  await refresh();
  const run = (operation, extra=[]) => spawnSync(process.execPath,[cli,operation,'--root',root,'--lock',options.lock,'--expected-lock-sha256',options.expectedLockSha256,'--evidence',options.evidence,...extra],{encoding:'utf8',timeout:5000});
  return {root,plan,evidence,options,refresh,run,frozen};
}
async function addArtifact(f, id, content='Artifact', authority) {
  const rel = `task/${id}.md`; await write(f.root,rel,content);
  const artifact = {id,path:rel,sha256:sha(content),...(authority ? {authority} : {})}; f.evidence.artifacts.push(artifact); return artifact;
}
async function design(f, authority) {
  const first = await addArtifact(f,'candidate-0','first',authority), second = await addArtifact(f,'candidate-1','second',authority);
  await addArtifact(f,'comparison','Both candidates compared'); await addArtifact(f,'decision','Root selected first');
  f.evidence.design = {candidates:[{slot:0,artifactId:first.id},{slot:1,artifactId:second.id}],comparisonArtifactId:'comparison',comparedSlots:[0,1],selectedSlot:0,decisionArtifactId:'decision',reviewTargets:[first,second].map(({id,sha256}) => ({id,sha256}))};
  await f.refresh();
}

test('real CLI freeze, inspect and root-owned narrow verification', async t => {
  const f = await fixture(t);
  const frozen = spawnSync(process.execPath,[cli,'freeze','--root',f.root,'--plan','task/plan.json','--out','task/second-lock.json'],{encoding:'utf8'});
  assert.equal(frozen.status,0,frozen.stderr); assert.equal(JSON.parse(frozen.stdout).lockSha256.length,64);
  assert.notEqual(spawnSync(process.execPath,[cli,'freeze','--root',f.root,'--plan','task/plan.json','--out','task/second-lock.json']).status,0);
  const inspect = f.run('inspect'); assert.equal(inspect.status,0,inspect.stderr); assert.equal(JSON.parse(inspect.stdout).acceptance,'not-assessed');
  const verify = f.run('verify',['--run-check','combined','--out','task/report.json']); assert.equal(verify.status,0,verify.stdout);
  const report = JSON.parse(verify.stdout); assert.equal(report.acceptance,'accepted'); assert.equal(report.mode,'narrow'); assert.equal(report.behavior.observations[0].exitCode,0); assert.equal(report.external.status,'unassessed');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.root,'task/report.json'),'utf8')),report);
});

test('normalization and rendering alone fail until the public path cooperates; baseline may change', async t => {
  const f = await fixture(t);
  await write(f.root,'src/normalize.mjs','export const normalize = value => value.trim();\n'); await f.refresh();
  assert.equal((await verifyDelivery({...f.options,runChecks:['combined']})).acceptance,'rejected');
  await write(f.root,'src/normalize.mjs','export const normalize = value => value.trim().toLowerCase();\n');
  await write(f.root,'src/render.mjs','export const render = value => value;\n'); await f.refresh();
  assert.equal((await verifyDelivery({...f.options,runChecks:['combined']})).acceptance,'rejected');
  await write(f.root,'src/render.mjs','export const render = value => `<h1>${value}</h1>`;\n'); await f.refresh();
  await write(f.root,'src/added.mjs','export const added = true;'); await f.refresh();
  assert.equal((await verifyDelivery({...f.options,runChecks:['combined']})).acceptance,'accepted');
});

test('inspect never executes and omitted named check is inconclusive', async t => {
  const f = await fixture(t,{harness:"import {writeFileSync} from 'node:fs'; writeFileSync('task/sentinel','ran');"});
  assert.equal(f.run('inspect').status,0); await assert.rejects(fs.stat(path.join(f.root,'task/sentinel')),{code:'ENOENT'});
  const report = await verifyDelivery(f.options); assert.equal(report.acceptance,'inconclusive'); assert.deepEqual(report.behavior.missingRequiredChecks,['combined']);
});

test('full missing design and delegated missing review reject', async t => {
  const full = await fixture(t,{mode:'full'}); const r = await verifyDelivery({...full.options,runChecks:['combined']}); assert.equal(r.acceptance,'rejected'); assert.match(r.structure.errors.join(),/object/i); assert.equal(r.behavior.status,'passed'); assert.equal(r.behavior.observations[0].passed,true);
  const delegated = await fixture(t,{delegated:true}); assert.match((await verifyDelivery(delegated.options)).structure.errors.join(),/Missing delegated review/);
});

test('complete full graph retains local pass while independence remains unverified', async t => {
  const f = await fixture(t,{mode:'full'}); await design(f);
  const report = await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(report.acceptance,'inconclusive'); assert.equal(report.structure.status,'passed'); assert.equal(report.behavior.status,'passed'); assert.match(report.provenance.gaps.join(),/MISSING_AUTHORITY/);
});

test('unknown provenance cannot upgrade independence, supplied verified fields reject', async t => {
  const f = await fixture(t,{mode:'full'}); await write(f.root,'task/authority.json','{}'); const ref = {kind:'unknown-host',recordPath:'task/authority.json',taskId:'child-1'}; await design(f,ref);
  let report = await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(report.acceptance,'inconclusive'); assert.match(report.provenance.gaps.join(),/INDEPENDENCE_UNVERIFIED/);
  f.evidence.artifacts[0].authority.verified = true; await f.refresh(); report = await verifyDelivery(f.options); assert.match(report.structure.errors.join(),/Unsupported field: verified/);
});

test('self-review, stale unit review and stale comparative review reject', async t => {
  const f = await fixture(t,{delegated:true}); await write(f.root,'task/authority.json','{}'); const ref = {kind:'unknown-host',recordPath:'task/authority.json',taskId:'same-child'};
  f.evidence.units[0].authority = ref; const review = await addArtifact(f,'review','review',ref); f.evidence.reviews = [{id:'review-1',unitId:'output',artifactId:review.id,targetDigest:f.evidence.units[0].outputDigest,authority:ref}]; await f.refresh();
  assert.match((await verifyDelivery(f.options)).structure.errors.join(),/Self-review/);
  f.evidence.reviews[0].authority = {...ref,taskId:'other-child'}; review.authority = f.evidence.reviews[0].authority; f.evidence.reviews[0].targetDigest = '0'.repeat(64); await f.refresh();
  assert.match((await verifyDelivery(f.options)).structure.errors.join(),/Stale review/);
  const full = await fixture(t,{mode:'full'}); await design(full); full.evidence.design.reviewTargets[0].sha256 = '0'.repeat(64); await full.refresh();
  assert.match((await verifyDelivery(full.options)).structure.errors.join(),/Stale comparative/);
});

test('dirty source at unchanged HEAD, additions and deletions invalidate final inventory', async t => {
  for (const action of ['change','add','delete']) {
    const f = await fixture(t);
    if (action === 'change') await write(f.root,'src/normalize.mjs','changed');
    if (action === 'add') await write(f.root,'src/added.mjs','added');
    if (action === 'delete') await fs.unlink(path.join(f.root,'src/render.mjs'));
    assert.match((await inspectDelivery(f.options)).structure.errors.join(),/Final source inventory mismatch/);
  }
});

test('external lock pin, immutable config and harness reject replacement', async t => {
  const f = await fixture(t); await write(f.root,'harness/config.json','changed'); assert.match((await inspectDelivery(f.options)).structure.errors.join(),/Immutable pin mismatch/);
  const second = await fixture(t); await fs.appendFile(path.join(second.root,'task/lock.json'),' '); assert.match((await inspectDelivery(second.options)).structure.errors.join(),/External lock digest/);
  const third = await fixture(t); await write(third.root,'harness/combined.mjs','console.log("forged pass")'); assert.match((await inspectDelivery(third.options)).structure.errors.join(),/Immutable pin mismatch/);
});

test('forged imported pass never replaces named execution', async t => {
  const f = await fixture(t,{harness:'process.exit(7);'}); f.evidence.pass = true; await f.refresh(); assert.match((await verifyDelivery({...f.options,runChecks:['combined']})).structure.errors.join(),/Unsupported field: pass/);
  delete f.evidence.pass; await f.refresh(); const report = await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(report.acceptance,'rejected'); assert.equal(report.behavior.observations[0].exitCode,7);
});

test('timeout and bounded output cannot pass', async t => {
  const timeout = await fixture(t,{harness:'setInterval(() => {}, 100);'}); const a = await verifyDelivery({...timeout.options,runChecks:['combined']}); assert.equal(a.acceptance,'rejected'); assert.equal(a.behavior.observations[0].timedOut,true);
  const output = await fixture(t,{harness:"process.stdout.write('x'.repeat(100000));"}); const b = await verifyDelivery({...output.options,runChecks:['combined']}); assert.equal(b.acceptance,'rejected'); assert.equal(b.behavior.observations[0].outputLimited,true); assert.ok(b.behavior.observations[0].stdout.length <= 1024);
});

test('successful local observation remains recorded after source or evidence mutation rejects run', async t => {
  for (const target of ['src/render.mjs','task/evidence.json']) {
    const f = await fixture(t,{harness:`import {appendFileSync} from 'node:fs'; appendFileSync(${JSON.stringify(target)}, ' '); console.log('local command passed');`});
    const report = await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(report.acceptance,'rejected'); assert.equal(report.behavior.observations[0].passed,true); assert.match(report.structure.errors.join(),/mutated during execution/);
  }
});

test('configured candidate panel count and ordered repeats are frozen', async t => {
  const f = await fixture(t); await write(f.root,'task/panel.json',{agents:['one','two','three']}); f.plan.candidates = {count:5,panel:{path:'task/panel.json',pointer:'/agents'}}; await write(f.root,'task/plan.json',f.plan);
  const frozen = await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/panel-lock.json'}); assert.deepEqual(frozen.candidateSlots.map(item => item.panelIndex),[0,1,2,0,1]);
  f.plan.mode = 'full'; delete f.plan.narrow; f.plan.candidates = {count:1}; await write(f.root,'task/plan.json',f.plan); await assert.rejects(freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/invalid.json'}),/candidate count/);
});

test('paths, symlinks, extra fields and unpinned harness arguments fail closed', async t => {
  const f = await fixture(t); f.plan.sourceRoots = ['../outside']; await write(f.root,'task/plan.json',f.plan); await assert.rejects(freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/invalid.json'}),/Unsafe path/);
  const symlink = await fixture(t); await fs.symlink('/tmp',path.join(symlink.root,'src/link')); assert.match((await inspectDelivery(symlink.options)).structure.errors.join(),/Symlink/);
  const harness = await fixture(t); harness.plan.immutablePaths = ['harness/config.json']; await write(harness.root,'task/plan.json',harness.plan); await assert.rejects(freezeAcceptance({root:harness.root,plan:'task/plan.json',out:'task/invalid.json'}),/argv file must be immutable/);
  const extra = await fixture(t); extra.evidence.finalSource[0].verified = true; await write(extra.root,'task/evidence.json',extra.evidence); assert.match((await inspectDelivery(extra.options)).structure.errors.join(),/Unsupported field/);
});


test('nested outputs are real files and report cannot overwrite lock or evidence', async t => {
  const f = await fixture(t);
  const frozen = await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/nested/lock.json'});
  assert.equal(sha(await fs.readFile(path.join(f.root,'task/nested/lock.json'))),frozen.lockSha256);
  assert.equal((await verifyDelivery({...f.options,runChecks:['combined'],out:'task/reports/latest/report.json'})).acceptance,'accepted');
  const prior = await fs.readFile(path.join(f.root,'task/lock.json'));
  assert.equal((await verifyDelivery({...f.options,runChecks:['combined'],out:'task/lock.json'})).acceptance,'rejected');
  assert.deepEqual(await fs.readFile(path.join(f.root,'task/lock.json')),prior);
});

test('empty artifacts, empty owned trees, extra API fields and unknown CLI flags reject', async t => {
  const full = await fixture(t,{mode:'full'}); await design(full); await write(full.root,full.evidence.artifacts[0].path,''); full.evidence.artifacts[0].sha256 = sha(''); await full.refresh();
  assert.match((await inspectDelivery(full.options)).structure.errors.join(),/Empty artifact/);
  const empty = await fixture(t); await Promise.all(['src/render.mjs','src/normalize.mjs'].map(rel => fs.unlink(path.join(empty.root,rel)))); await empty.refresh();
  assert.match((await inspectDelivery(empty.options)).structure.errors.join(),/Empty owned source/);
  const extra = await fixture(t); assert.match((await verifyDelivery({...extra.options,verified:true})).structure.errors.join(),/Unsupported field/);
  assert.notEqual(extra.run('verify',['--verified','true']).status,0);
});

function tinyPng(pixel) {
  const chunk = (type,payload=Buffer.alloc(0)) => {
    const typed = Buffer.concat([Buffer.from(type),payload]); let crc = 0xffffffff;
    for (const byte of typed) { crc ^= byte; for (let bit=0;bit<8;bit++) crc = (crc>>>1) ^ (crc&1 ? 0xedb88320 : 0); }
    const output = Buffer.alloc(payload.length+12); output.writeUInt32BE(payload.length,0); typed.copy(output,4); output.writeUInt32BE((crc^0xffffffff)>>>0,output.length-4); return output;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(1,0); header.writeUInt32BE(1,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,...pixel]))),chunk('IEND')]);
}

test('actual PNG measurements enforce frozen bounds and retain capture-authenticity limitation', async t => {
  const f = await fixture(t); const baseline = tinyPng([0,0,0,255]); await fs.writeFile(path.join(f.root,'task/baseline.png'),baseline); await fs.writeFile(path.join(f.root,'task/current.png'),baseline);
  f.plan.narrow.omittedFullRequirements = ['design']; f.plan.visual = {comparatorVersion:'png-rgba-v1',captureConfigPath:'harness/config.json',states:[{id:'home',baselinePath:'task/baseline.png',width:1,height:1,maxChangedPixels:0,maxChannelDelta:0}]}; await write(f.root,'task/plan.json',f.plan);
  const frozen = await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/visual-lock.json'}); f.options.lock = 'task/visual-lock.json'; f.options.expectedLockSha256 = frozen.lockSha256; f.evidence.lockSha256=frozen.lockSha256; f.evidence.captures=[{stateId:'home',path:'task/current.png',sha256:sha(baseline)}]; await f.refresh();
  let result = await verifyDelivery({...f.options,runChecks:['combined'],out:'task/visual-report.json'}); assert.equal(result.visual.status,'passed'); assert.equal(sha(await fs.readFile(path.join(f.root,result.visual.observations[0].diff.path))),result.visual.observations[0].diff.sha256); assert.equal(result.acceptance,'inconclusive'); assert.equal(result.visual.captureAuthenticity,'unverified');
  const changed=tinyPng([0,0,0,0]); await fs.writeFile(path.join(f.root,'task/current.png'),changed); f.evidence.captures[0].sha256=sha(changed); await f.refresh();
  result = await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(result.acceptance,'rejected'); assert.equal(result.visual.observations[0].changedPixels,1); assert.equal(result.visual.observations[0].maxChannelDelta,255);
  f.plan.visual.states[0].masks = []; await write(f.root,'task/plan.json',f.plan); await assert.rejects(freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/masks-lock.json'}),/Unsupported field: masks/);
});

async function nativeRecords(f, assignment, outputs, reviews, {childId=assignment.id,encrypted=false,model='gpt-6.1-sol',reasoning='high'}={}) {
  const fence = (name,value) => '```'+name+'\n'+JSON.stringify(value)+'\n```';
  const shared = {schemaVersion:1,taskId:f.plan.taskId,lockSha256:f.evidence.lockSha256,assignmentId:assignment.id,kind:assignment.kind};
  const request = {task_name:assignment.taskName,fork_turns:'none',model,reasoning_effort:reasoning,message:fence('oms-delivery-assignment-v1',{...shared,taskName:assignment.taskName,outputs:outputs.map(({id,path}) => ({id,path})),reviews}),audit:{contractSha256:sha('fixture-contract'),role:assignment.kind==='writer'?'implementer':'reviewer',route:null}};
  const authority = {kind:'codex-native',assignmentId:assignment.id,requestPath:`task/${assignment.id}-request.json`,parentRecordPath:`task/${assignment.id}-parent.jsonl`,childRecordPath:`task/${assignment.id}-child.jsonl`};
  await write(f.root,authority.requestPath,request);
  await write(f.root,authority.parentRecordPath,[{type:'session_meta',payload:{id:'parent-task',cwd:f.root}},{type:'response_item',payload:{type:'function_call',name:'spawn_agent',arguments:JSON.stringify({task_name:request.task_name,fork_turns:request.fork_turns,model:request.model,reasoning_effort:request.reasoning_effort,message:encrypted?'gAAAAABencryptedplaceholder==':request.message})}}].map(item=>JSON.stringify(item)).join('\n')+'\n');
  await write(f.root,authority.childRecordPath,[{type:'session_meta',payload:{id:childId,source:{subagent:{thread_spawn:{parent_thread_id:'parent-task',agent_path:'/root/'+assignment.taskName}}}}},{type:'turn_context',payload:{model:request.model,effort:request.reasoning_effort}},{type:'response_item',payload:{type:'message',role:'assistant',phase:'final_answer',content:[{type:'output_text',text:fence('oms-delivery-completion-v1',{...shared,outputs,reviews,...(assignment.kind==='review'?{verdict:'accepted'}:{})})}]}},{type:'event_msg',payload:{type:'task_complete'}}].map(item=>JSON.stringify(item)).join('\n')+'\n');
  return authority;
}

test('checker integrates supported native declaration records; encrypted assignments stay inconclusive', async t => {
  const f = await fixture(t,{mode:'full',delegated:true,harness:"import assert from 'node:assert/strict'; import {appendFileSync} from 'node:fs'; import {normalize} from '../src/normalize.mjs'; import {render} from '../src/render.mjs'; assert.equal(render(normalize(' HELLO ')), '<h1>hello</h1>'); appendFileSync('task/candidate_a-parent.jsonl', JSON.stringify({type:'event_msg',payload:{type:'tool_activity'}})+'\\n');"});
  f.plan.nativeParentId='parent-task'; f.plan.assignments=[{id:'candidate_a',taskName:'candidate_a',kind:'writer'},{id:'candidate_b',taskName:'candidate_b',kind:'writer'},{id:'comparison',taskName:'comparison',kind:'review'},{id:'writer_unit',taskName:'writer_unit',kind:'writer'},{id:'review_unit',taskName:'review_unit',kind:'review'}]; await write(f.root,'task/plan.json',f.plan);
  const frozen = await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/native-lock.json'}); f.options.lock='task/native-lock.json'; f.options.expectedLockSha256=frozen.lockSha256; f.evidence.lockSha256=frozen.lockSha256; await design(f);
  for (let slot=0;slot<2;slot++) { const artifact=f.evidence.artifacts[slot]; artifact.authority=await nativeRecords(f,f.plan.assignments[slot],[{id:artifact.id,path:artifact.path,sha256:artifact.sha256}],[]); }
  const comparison=f.evidence.artifacts.find(item=>item.id==='comparison'); comparison.authority=await nativeRecords(f,f.plan.assignments[2],[{id:comparison.id,path:comparison.path,sha256:comparison.sha256}],f.evidence.design.reviewTargets);
  f.evidence.units[0].authority=await nativeRecords(f,f.plan.assignments[3],f.evidence.finalSource.map(file=>({id:file.path,...file})),[]);
  const unitReview=await addArtifact(f,'unit-review','Unit review accepted'); const unitRef=await nativeRecords(f,f.plan.assignments[4],[{id:unitReview.id,path:unitReview.path,sha256:unitReview.sha256}],[{id:'output',sha256:f.evidence.units[0].outputDigest}]); unitReview.authority=unitRef; f.evidence.reviews=[{id:'unit-review',unitId:'output',artifactId:unitReview.id,targetDigest:f.evidence.units[0].outputDigest,authority:unitRef}]; await f.refresh();
  let result=await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(result.acceptance,'accepted',JSON.stringify(result)); assert.equal(result.provenance.status,'verified'); assert.ok(result.provenance.parentRecordLifecycle.every(item=>item.scope==='verified-spawn-prefix')); assert.equal(result.claimCeiling,'local-full-delivery-evidence'); assert.equal(result.upstreamEquivalence,'unassessed'); assert.equal(result.provenance.observations[0].claim,'runtime-recorded-task-attribution'); assert.ok(result.provenance.observations[0].limitations.some(value=>value.includes('do not prove artifact authorship')));
  const artifact=f.evidence.artifacts[0]; artifact.authority=await nativeRecords(f,f.plan.assignments[0],[{id:artifact.id,path:artifact.path,sha256:artifact.sha256}],[],{encrypted:true}); await f.refresh();
  result=await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(result.acceptance,'inconclusive'); assert.equal(result.behavior.status,'passed'); assert.match(result.provenance.gaps.join(),/INDEPENDENCE_UNVERIFIED/);
  artifact.authority=await nativeRecords(f,f.plan.assignments[0],[{id:artifact.id,path:artifact.path,sha256:artifact.sha256}],[]); artifact.authority.childRecordPath=f.evidence.artifacts[1].authority.childRecordPath; await f.refresh();
  result=await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(result.acceptance,'rejected'); assert.equal(result.behavior.status,'passed'); assert.match(result.structure.errors.join(),/Native attribution rejected/);
});

test('native graph uses canonical child identity rather than record filename aliases', async t => {
  const f=await fixture(t,{delegated:true}); f.plan.nativeParentId='parent-task'; f.plan.assignments=[{id:'writer_unit',taskName:'writer_unit',kind:'writer'},{id:'review_unit',taskName:'review_unit',kind:'review'}]; await write(f.root,'task/plan.json',f.plan);
  const frozen=await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/native-lock.json'}); f.options.lock='task/native-lock.json'; f.options.expectedLockSha256=frozen.lockSha256; f.evidence.lockSha256=frozen.lockSha256;
  f.evidence.units[0].authority=await nativeRecords(f,f.plan.assignments[0],f.evidence.finalSource.map(file=>({id:file.path,...file})),[],{childId:'same-child'});
  const artifact=await addArtifact(f,'review','Review accepted'); const ref=await nativeRecords(f,f.plan.assignments[1],[{id:artifact.id,path:artifact.path,sha256:artifact.sha256}],[{id:'output',sha256:f.evidence.units[0].outputDigest}],{childId:'same-child'}); artifact.authority=ref;
  f.evidence.reviews=[{id:'unit-review',unitId:'output',artifactId:artifact.id,targetDigest:f.evidence.units[0].outputDigest,authority:ref}]; await f.refresh();
  const result=await verifyDelivery({...f.options,runChecks:['combined']}); assert.equal(result.acceptance,'rejected'); assert.match(result.structure.errors.join(),/Native self-review/); assert.equal(result.behavior.status,'passed');
});


test('actual Git HEAD stays unchanged while dirty source invalidates final inventory', async t => {
  const f=await fixture(t);
  for (const args of [['init','-q'],['add','src'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','baseline']]) { const result=spawnSync('git',['-C',f.root,...args],{encoding:'utf8'}); assert.equal(result.status,0,result.stderr); }
  const head=()=>spawnSync('git',['-C',f.root,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(); const prior=head();
  await write(f.root,'src/render.mjs','export const render = () => "dirty";'); assert.equal(head(),prior);
  assert.match((await inspectDelivery(f.options)).structure.errors.join(),/Final source inventory mismatch/);
});

async function fullNativeFixture(t, {harness,panel,count=2,candidateSelections=[]}={}) {
  const f = await fixture(t,{mode:'full',delegated:true,harness});
  if (panel) await write(f.root,'task/panel.json',{entries:panel});
  f.plan.candidates = {count,...(panel ? {panel:{path:'task/panel.json',pointer:'/entries'}} : {})};
  f.plan.nativeParentId = 'parent-task';
  const slots = Math.max(count,panel?.length ?? 0,2);
  f.plan.assignments = [...Array.from({length:slots},(_,slot) => ({id:`candidate_${slot}`,taskName:`candidate_${slot}`,kind:'writer'})),...['comparison','writer_unit','review_unit'].map(id => ({id,taskName:id,kind:id==='writer_unit' ? 'writer' : 'review'}))];
  await write(f.root,'task/plan.json',f.plan);
  const frozen = await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/native-lock.json'});
  f.options.lock='task/native-lock.json'; f.options.expectedLockSha256=frozen.lockSha256; f.evidence.lockSha256=frozen.lockSha256;
  const candidates=[];
  for (let slot=0;slot<slots;slot++) {
    const artifact=await addArtifact(f,`candidate-${slot}`,`Complete candidate ${slot}`);
    artifact.authority=await nativeRecords(f,f.plan.assignments[slot],[{id:artifact.id,path:artifact.path,sha256:artifact.sha256}],[],candidateSelections[slot]);
    candidates.push({slot,artifactId:artifact.id});
  }
  const targets=f.evidence.artifacts.map(({id,sha256}) => ({id,sha256}));
  const comparison=await addArtifact(f,'comparison','Complete comparative judgment');
  await addArtifact(f,'decision','Root decision');
  f.evidence.design={candidates,comparisonArtifactId:comparison.id,comparedSlots:candidates.map(item=>item.slot),selectedSlot:0,decisionArtifactId:'decision',reviewTargets:targets};
  comparison.authority=await nativeRecords(f,f.plan.assignments[slots],[{id:comparison.id,path:comparison.path,sha256:comparison.sha256}],targets);
  f.evidence.units[0].authority=await nativeRecords(f,f.plan.assignments[slots+1],f.evidence.finalSource.map(file=>({id:file.path,...file})),[]);
  const review=await addArtifact(f,'unit-review','Independent unit review');
  review.authority=await nativeRecords(f,f.plan.assignments[slots+2],[{id:review.id,path:review.path,sha256:review.sha256}],[{id:'output',sha256:f.evidence.units[0].outputDigest}]);
  f.evidence.reviews=[{id:'unit-review',unitId:'output',artifactId:review.id,targetDigest:f.evidence.units[0].outputDigest,authority:review.authority}];
  await f.refresh(); return f;
}

test('canonical report owner preserves all relative authority and absolute native aliases byte for byte', async t => {
  const unknown=await fixture(t); await write(unknown.root,'task/authority.json','{"original":true}');
  await addArtifact(unknown,'note','note',{kind:'unknown',recordPath:'task/authority.json',taskId:'unknown'}); await unknown.refresh();
  const prior=await fs.readFile(path.join(unknown.root,'task/authority.json'));
  const rejection=await verifyDelivery({...unknown.options,runChecks:['combined'],out:'task/authority.json'});
  assert.equal(rejection.acceptance,'rejected'); assert.match(rejection.structure.errors.join(),/cannot replace/);
  assert.deepEqual(await fs.readFile(path.join(unknown.root,'task/authority.json')),prior);
  for (const key of ['requestPath','parentRecordPath','childRecordPath']) {
    const f=await fullNativeFixture(t); const authority=f.evidence.artifacts[0].authority, rel=authority[key];
    if (key!=='requestPath') authority[key]=path.join(f.root,rel);
    await f.refresh(); const original=await fs.readFile(path.join(f.root,rel));
    const report=await verifyDelivery({...f.options,runChecks:['combined'],out:rel});
    assert.equal(report.acceptance,'rejected'); assert.match(report.structure.errors.join(),/cannot replace/);
    assert.deepEqual(await fs.readFile(path.join(f.root,rel)),original);
  }
  await fs.link(path.join(unknown.root,'task/authority.json'),path.join(unknown.root,'task/authority-alias.json'));
  assert.equal((await verifyDelivery({...unknown.options,out:'task/authority-alias.json'})).acceptance,'rejected');
  assert.deepEqual(await fs.readFile(path.join(unknown.root,'task/authority-alias.json')),prior);
  assert.deepEqual(await fs.readFile(path.join(unknown.root,'task/authority.json')),prior);
  try {
    await fs.access(path.join(unknown.root,'task/AUTHORITY.JSON'));
    assert.equal((await verifyDelivery({...unknown.options,out:'task/AUTHORITY.JSON'})).acceptance,'rejected');
    assert.deepEqual(await fs.readFile(path.join(unknown.root,'task/authority.json')),prior);
  } catch (error) { if (error.code!=='ENOENT') throw error; }
});

test('diff destinations use the same authority protection before any report write', async t => {
  const f=await fixture(t), png=tinyPng([0,0,0,255]);
  await fs.writeFile(path.join(f.root,'task/baseline.png'),png); await fs.writeFile(path.join(f.root,'task/current.png'),png);
  f.plan.narrow.omittedFullRequirements=['design'];
  f.plan.visual={comparatorVersion:'png-rgba-v1',captureConfigPath:'harness/config.json',states:[{id:'home',baselinePath:'task/baseline.png',width:1,height:1,maxChangedPixels:0,maxChannelDelta:0}]};
  await write(f.root,'task/plan.json',f.plan);
  const frozen=await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/visual-lock.json'});
  f.options.lock='task/visual-lock.json'; f.options.expectedLockSha256=frozen.lockSha256; f.evidence.lockSha256=frozen.lockSha256;
  f.evidence.captures=[{stateId:'home',path:'task/current.png',sha256:sha(png)}];
  const authorityPath='task/report.json.visual-0.png'; await write(f.root,authorityPath,'{"original":true}');
  await addArtifact(f,'note','note',{kind:'unknown',recordPath:authorityPath,taskId:'unknown'}); await f.refresh();
  const original=await fs.readFile(path.join(f.root,authorityPath));
  const result=await verifyDelivery({...f.options,runChecks:['combined'],out:'task/report.json'});
  assert.equal(result.acceptance,'rejected'); assert.match(result.structure.errors.join(),/cannot replace/);
  assert.deepEqual(await fs.readFile(path.join(f.root,authorityPath)),original);
  await assert.rejects(fs.access(path.join(f.root,'task/report.json')),/ENOENT/);
});

test('invalid inputs cannot establish an error destination and never write fallback reports', async t => {
  const f=await fixture(t); await write(f.root,'task/authority.json','{"original":true}');
  await addArtifact(f,'note','note',{kind:'unknown',recordPath:'task/authority.json',taskId:'unknown'}); await f.refresh();
  await fs.appendFile(path.join(f.root,f.options.lock),' ');
  const original=await fs.readFile(path.join(f.root,'task/authority.json'));
  assert.equal((await verifyDelivery({...f.options,out:'task/authority.json'})).acceptance,'rejected');
  assert.deepEqual(await fs.readFile(path.join(f.root,'task/authority.json')),original);
  await verifyDelivery({...f.options,out:'task/new-report.json'});
  await assert.rejects(fs.access(path.join(f.root,'task/new-report.json')),/ENOENT/);
});

test('every shared-parent prefix survives traversal reorder; append passes but later spawn mutation rejects', async t => {
  for (const mutation of [false,true]) {
    const harness=mutation
      ? "import {readFileSync,writeFileSync} from 'node:fs'; const p='task/shared-parent.jsonl'; const lines=readFileSync(p,'utf8').trim().split('\\n').map(JSON.parse); lines.at(-1).payload.arguments='{}'; writeFileSync(p,lines.map(JSON.stringify).join('\\n')+'\\n');"
      : "import {appendFileSync} from 'node:fs'; appendFileSync('task/shared-parent.jsonl',JSON.stringify({type:'event_msg',payload:{type:'tool_activity'}})+'\\n');";
    const f=await fullNativeFixture(t,{harness}); const lines=[];
    for (const assignment of f.plan.assignments) {
      const records=(await fs.readFile(path.join(f.root,`task/${assignment.id}-parent.jsonl`),'utf8')).trim().split('\n');
      if (!lines.length) lines.push(records[0]); lines.push(records[1]);
    }
    await write(f.root,'task/shared-parent.jsonl',lines.join('\n')+'\n');
    for (const authority of [...f.evidence.artifacts.map(item=>item.authority),...f.evidence.units.map(item=>item.authority),...f.evidence.reviews.map(item=>item.authority)].filter(Boolean)) authority.parentRecordPath='task/shared-parent.jsonl';
    await f.refresh(); const result=await verifyDelivery({...f.options,runChecks:['combined']});
    const lifecycle=result.provenance.parentRecordLifecycle;
    assert.equal(lifecycle.length,1); assert.equal(lifecycle[0].constraints.length,5);
    assert.deepEqual(lifecycle[0].constraints.map(item=>item.spawnRecordIndex),[4,5,1,2,3]);
    assert.equal(result.behavior.observations[0].passed,true);
    assert.equal(result.acceptance,mutation ? 'rejected' : 'accepted');
    if (mutation) assert.match(result.structure.errors.join(),/spawn prefix mutated: review output/);
  }
});

test('configured ordered panel binds both native model and effort and supports reviewed alias without conflict', async t => {
  const panel=[{model:'gpt-6-astra',reasoning:'high'},{model:'gpt-6-luna',reasoning_effort:'high'}];
  const mismatch=await fullNativeFixture(t,{panel});
  assert.match((await verifyDelivery({...mismatch.options,runChecks:['combined']})).structure.errors.join(),/panel model or effort mismatch/);
  const effort=await fullNativeFixture(t,{panel:[{model:'gpt-6.1-sol',reasoning:'low'}]});
  assert.equal((await verifyDelivery({...effort.options,runChecks:['combined']})).acceptance,'rejected');
  const correct=await fullNativeFixture(t,{panel,count:5,candidateSelections:Array.from({length:5},(_,slot)=>({model:panel[slot%2].model,reasoning:'high'}))});
  const result=await verifyDelivery({...correct.options,runChecks:['combined']});
  assert.equal(result.acceptance,'accepted',JSON.stringify(result)); assert.equal(result.provenance.panelSelection.status,'verified');
  assert.deepEqual(result.provenance.panelSelection.observations.map(item=>item.panelIndex),[0,1,0,1,0]);
  const conflict=await fullNativeFixture(t,{panel:[{model:'gpt-6.1-sol',reasoning:'low',reasoning_effort:'high'}]});
  assert.match((await verifyDelivery({...conflict.options,runChecks:['combined']})).structure.errors.join(),/Conflicting/);
});

test('missing, inherited and unknown configured panel selections cannot accept full delivery', async t => {
  for (const entry of [{model:'gpt-6.1-sol'},{model:'gpt-6.1-sol',reasoning:'high',inheritParent:true},'inherit-parent',{model:'gpt-6.1-sol',reasoning:'high',unsupported:true}]) {
    const f=await fullNativeFixture(t,{panel:[entry],count:2});
    const result=await verifyDelivery({...f.options,runChecks:['combined']});
    assert.equal(result.acceptance,'inconclusive'); assert.equal(result.behavior.status,'passed');
    assert.equal(result.provenance.panelSelection.status,'unverified'); assert.match(result.provenance.gaps.join(),/PANEL_SELECTION_UNVERIFIED/);
  }
});

test('configured slots retain the full floor and must match their derived frozen mapping', async t => {
  const f=await fixture(t,{mode:'full'}); await write(f.root,'task/panel.json',{entries:[{model:'gpt-6.1-sol',reasoning:'high'}]});
  f.plan.candidates={panel:{path:'task/panel.json',pointer:'/entries'}}; await write(f.root,'task/plan.json',f.plan);
  const frozen=await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/panel-lock.json'});
  assert.deepEqual(frozen.candidateSlots.map(item=>item.panelIndex),[0,0]);
  f.options.lock='task/panel-lock.json';
  const lock=JSON.parse(await fs.readFile(path.join(f.root,f.options.lock),'utf8')); lock.candidateSlots.pop();
  await write(f.root,f.options.lock,lock); f.options.expectedLockSha256=sha(await fs.readFile(path.join(f.root,f.options.lock)));
  f.evidence.lockSha256=f.options.expectedLockSha256; await f.refresh();
  assert.match((await inspectDelivery(f.options)).structure.errors.join(),/Frozen candidate slot mapping mismatch/);
});

test('per-unit and comparative judgments cannot reuse one frozen native assignment', async t => {
  const f=await fullNativeFixture(t); f.evidence.reviews[0].authority.assignmentId='comparison'; await f.refresh();
  const result=await verifyDelivery({...f.options,runChecks:['combined']});
  assert.equal(result.acceptance,'rejected'); assert.match(result.structure.errors.join(),/Duplicate required native assignments/);
});

test('pre-execution pins reject artifact, request and child mutation after initial validation', async t => {
  for (const target of ['artifact','request','child']) {
    const f=await fullNativeFixture(t); const artifact=f.evidence.artifacts[0];
    const rel=target==='artifact' ? artifact.path : artifact.authority[target==='request' ? 'requestPath' : 'childRecordPath'];
    const read=fs.readFile; let sourceReads=0,mutated=false;
    fs.readFile=async function(file,...args) {
      if (String(file)===path.join(f.root,'src/normalize.mjs') && ++sourceReads===2) {
        await fs.appendFile(path.join(f.root,rel),' '); mutated=true;
      }
      return read.call(this,file,...args);
    };
    let result;
    try { result=await verifyDelivery({...f.options,runChecks:['combined'],out:'task/error-report.json'}); } finally { fs.readFile=read; }
    assert.equal(mutated,true); assert.equal(result.acceptance,'rejected'); assert.equal(result.behavior.observations.length,0);
    assert.match(result.structure.errors.join(),/changed before execution/);
    assert.equal(JSON.parse(await fs.readFile(path.join(f.root,'task/error-report.json'),'utf8')).acceptance,'rejected');
  }
});

test('canonical source-directory aliases reject existing and new report paths without changing source', async t => {
  const f=await fixture(t), original=await source(f.root);
  let supportsAlias=false;
  try { supportsAlias=await fs.realpath(path.join(f.root,'SRC'))===await fs.realpath(path.join(f.root,'src')); } catch { /* case-sensitive filesystem */ }
  if (!supportsAlias) { t.skip('requires filesystem source-directory case alias'); return; }
  for (const out of ['SRC/normalize.mjs','SRC/new-report.json','SRC/..new-report.json']) {
    const result=await verifyDelivery({...f.options,runChecks:['combined'],out});
    assert.equal(result.acceptance,'rejected'); assert.equal(result.behavior.observations.length,0);
    assert.match(result.structure.errors.join(),/inside a source root/); assert.deepEqual(await source(f.root),original);
  }
});

test('executable replacement after validation cannot establish a new pre-execution baseline', async t => {
  const f=await fixture(t), executable=path.join(f.root,'task/check.sh');
  await fs.writeFile(executable,'#!/bin/sh\nexit 1\n',{mode:0o755}); f.plan.checks[0].argv=[executable];
  await write(f.root,'task/plan.json',f.plan);
  const frozen=await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/exe-lock.json'});
  f.options.lock='task/exe-lock.json'; f.options.expectedLockSha256=frozen.lockSha256;
  f.evidence.lockSha256=frozen.lockSha256; await f.refresh();
  const baseline=await verifyDelivery({...f.options,runChecks:['combined']});
  assert.equal(baseline.acceptance,'rejected'); assert.equal(baseline.behavior.observations[0].exitCode,1);
  const read=fs.readFile; let sourceReads=0,mutated=false;
  fs.readFile=async function(file,...args) {
    if (String(file)===path.join(f.root,'src/normalize.mjs') && ++sourceReads===2) {
      await fs.writeFile(executable,'#!/bin/sh\nexit 0\n'); mutated=true;
    }
    return read.call(this,file,...args);
  };
  let result;
  try { result=await verifyDelivery({...f.options,runChecks:['combined']}); } finally { fs.readFile=read; }
  assert.equal(mutated,true); assert.equal(result.acceptance,'rejected'); assert.equal(result.behavior.observations.length,0);
  assert.match(result.structure.errors.join(),/Executable changed before execution/);
});

test('frozen source exclusions permit reports while included source and immutable exclusions stay protected', async t => {
  for (const wholeWorkspace of [false,true]) {
    const f=await fixture(t), out=wholeWorkspace ? 'task/report.json' : 'src/reports/report.json';
    if (!wholeWorkspace) await fs.mkdir(path.join(f.root,'src/reports'));
    f.plan.sourceRoots=wholeWorkspace ? ['.'] : ['src']; f.plan.sourceExcludes=wholeWorkspace ? ['task','harness'] : ['src/reports'];
    f.plan.units[0].ownedPaths=f.plan.sourceRoots;
    await write(f.root,'task/plan.json',f.plan);
    const frozen=await freezeAcceptance({root:f.root,plan:'task/plan.json',out:'task/excluded-lock.json'});
    f.options.lock='task/excluded-lock.json'; f.options.expectedLockSha256=frozen.lockSha256; f.evidence.lockSha256=frozen.lockSha256;
    await f.refresh();
    const result=await verifyDelivery({...f.options,runChecks:['combined'],out});
    assert.equal(result.acceptance,'accepted',JSON.stringify(result)); assert.equal(JSON.parse(await fs.readFile(path.join(f.root,out),'utf8')).acceptance,'accepted');
    const protectedPath=wholeWorkspace ? 'harness/config.json' : 'task/evidence.json';
    const original=await fs.readFile(path.join(f.root,protectedPath));
    assert.equal((await verifyDelivery({...f.options,runChecks:['combined'],out:protectedPath})).acceptance,'rejected');
    assert.deepEqual(await fs.readFile(path.join(f.root,protectedPath)),original);
    const included=await verifyDelivery({...f.options,runChecks:['combined'],out:'src/new-report.json'});
    assert.equal(included.acceptance,'rejected');
  }
});
