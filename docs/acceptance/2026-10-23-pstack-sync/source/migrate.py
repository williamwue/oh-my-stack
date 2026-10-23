import argparse
import copy
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--source-checkout', required=True)
CHECKOUT = Path(parser.parse_args().source_checkout).resolve()
OLD = '99743e9c151c8537cbbf1f98bb38f34ef3368453'
REV = '4ec7ffa173eaa70d3d9467a627baf0954645a353'
SOURCE = f'upstream/snapshots/cursor-pstack-october-23/{REV}/pstack'
RECEIPT = 'docs/acceptance/2026-10-23-pstack-sync/upstream-files.json'
def git(*args): return subprocess.check_output(['git', '-C', str(CHECKOUT), *args])
def save(path, value):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
def sha(data): return hashlib.sha256(data).hexdigest()
manifest = json.loads((ROOT/'upstream/parity-derivations.json').read_text())
assert manifest['revision'] == OLD
previous = json.loads((ROOT/'docs/acceptance/2026-10-16-pstack-sync/source/provenance.json').read_text())
files = []
for line in git('ls-tree', '-r', REV, 'pstack').decode().splitlines():
    meta, path = line.split('\t'); mode, kind, blob = meta.split()
    assert kind == 'blob' and mode in ['100644', '100755']
    rel = path.removeprefix('pstack/')
    data = git('cat-file', 'blob', blob)
    assert hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest() == blob
    dest = ROOT/SOURCE/rel
    dest.parent.mkdir(parents=True, exist_ok=True);dest.write_bytes(data)
    dest.chmod(int(mode[-3:], 8))
    files.append({'path': rel, 'sha256': sha(data), 'gitBlob': blob, 'size': len(data)})
files.sort(key=lambda x:x['path'])
before = {f['path']: f['sha256'] for f in previous['files']}
after = {f['path']: f['sha256'] for f in files}
delta = {'oldCount':len(before),'newCount':len(after),'modified':sorted(p for p in before if p in after and before[p]!=after[p]),'added':sorted(after.keys()-before.keys()),'deleted':sorted(before.keys()-after.keys())}
save('docs/acceptance/2026-10-23-pstack-sync/source/provenance.json',{'repository':'https://github.com/cursor/plugins','revision':REV,'tree':git('rev-parse',f'{REV}:pstack').decode().strip(),'url':f'https://github.com/cursor/plugins/commit/{REV}','version':'0.15.30','sourceRoot':SOURCE,'files':files,'previousRevision':OLD,'delta':delta})
save(RECEIPT,{'revision':REV,'repository':'https://github.com/cursor/plugins','files':[{'upstreamPath':'pstack/'+f['path'],'path':SOURCE+'/'+f['path'],'sha256':f['sha256'],'blobSha1':f['gitBlob']} for f in files]})
binding = next(e for e in manifest['entries'] if e['output']=='src/core/skills/sharpen/SKILL.md')['replacements'][0]['after'].split('\n\n',1)[1]
reviews=[]
for entry in manifest['entries']:
    source=(ROOT/SOURCE/entry['source']).read_text();text=source
    for item in entry['replacements']:
        old=copy.deepcopy(item)
        if item['category']=='frontmatter' and text.count(item['before'])!=item['expectedOccurrences']:
            front=source[:source.index('\n---\n')+5]
            if item['before'].endswith('\n\n'):front+='\n'
            item['before']=front
            item['after']='\n'.join(l for l in front.split('\n') if not l.startswith('disable-model-invocation:')).rstrip()+'\n\n'+binding
        if entry['source']=='skills/poteto-help/SKILL.md' and item['before'] in ['/setup-pstack', 'Cursor']:
            item['expectedOccurrences']=text.count(item['before'])
        if entry['source']=='skills/make-bot-ui/SKILL.md' and item['category']=='frontmatter':
            item['after']=old['after']
        import re
        item['after']=re.sub(r'https://github.com/cursor/plugins/blob/[a-f0-9]{40}/pstack/',f'https://github.com/cursor/plugins/blob/{REV}/pstack/',item['after'])
        count=text.count(item['before'])
        assert count==item['expectedOccurrences'],(entry['source'],item,count)
        text=text.replace(item['before'],item['after'])
        if item!=old:reviews.append({'output':entry['output'],'previous':old,'current':copy.deepcopy(item),'decision':'reviewed-upstream-frontmatter-or-new-setup-references'})
    if entry['source']=='skills/poteto-help/SKILL.md':
        extra={'before': 'pstack is built for the source host, and it also installs in Claude Code with `/plugin marketplace add cursor/plugins`, then `/plugin install pstack@cursor-plugins`. There, each command takes a `pstack:` prefix, such as `/pstack:poteto-mode`. The [Claude Code adapter](../../docs/harness/claude-code.md) maps the the source host names, and a step that needs a the source host-only feature, such as Bugbot or Automations, is skipped with a one-line note.', 'after': 'Use the installed host package for installation and command-prefix conventions. The [official source-host harness documentation](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/harness/claude-code.md) describes its additional harness. Host bindings map source names; disclose unavailable source-only features rather than claiming they ran.', 'expectedOccurrences': 1, 'category': 'tools', 'reason': 'Keep upstream harness provenance while routing installation and unsupported features through the installed host binding.'}
        assert text.count(extra['before'])==1
        text=text.replace(extra['before'],extra['after']);entry['replacements'].append(extra)
        reviews.append({'output':entry['output'],'decision':'portable-host-installation-guidance','current':extra})
    entry['sourceSha256']=sha(source.encode());entry['outputSha256']=sha(text.encode())
known={e['source'] for e in manifest['entries']}
for f in files:
    path=f['path']
    if path in known or not path.startswith('skills/'):continue
    data=(ROOT/SOURCE/path).read_text();replacements=[]
    if path.endswith('/SKILL.md'):
        front=data[:data.index('\n---\n')+5]+'\n'
        out='\n'.join(l for l in front.split('\n') if not l.startswith('disable-model-invocation:')).rstrip()+'\n\n'+binding
        replacements=[{'before':front,'after':out,'expectedOccurrences':1,'category':'frontmatter','reason':'Expose the official Skill explicitly and retain host authorization and execution boundaries.'}]
        name=path.split('/')[1]
        metadata=json.loads((ROOT/'src/core/skills/create-verification-skill/skill.json').read_text())
        metadata['name']=name
        save(f'src/core/skills/{name}/skill.json',metadata)
    output=data
    for r in replacements:output=output.replace(r['before'],r['after'])
    manifest['entries'].append({'source':path,'output':'src/core/'+path,'sourceSha256':sha(data.encode()),'outputSha256':sha(output.encode()),'replacements':replacements})
manifest['revision']=REV;manifest['sourceRoot']=SOURCE
save('upstream/parity-derivations.json',manifest)
for name in ['imports.json','semantic-derivations.json']:
    value=json.loads((ROOT/'upstream'/name).read_text());value['revision']=REV;value['sourceReceipt']=RECEIPT;save('upstream/'+name,value)
catalog=json.loads((ROOT/'src/core/skill-catalog.json').read_text())
for name in ['create-formal-verification-skill','maintain-formal-verification-skill','statechart']:
    if name not in catalog['public']:catalog['public'].append(name)
for name in ['create-formal-verification-skill','maintain-formal-verification-skill','statechart']:
    if not any(e.get('name')==name for e in catalog['entries']):
        catalog['entries'].append({'kind':'skill','name':name,'path':f'src/core/skills/{name}','origin':'pstack','distribution':'core','audience':'public'})
for name in ['create-formal-verification-skill','maintain-formal-verification-skill','statechart']:
    catalog['entries'].append({'kind':'reference','path':f'src/core/skills/{name}/**','origin':'pstack','distribution':'core','owner':name})
catalog['public'].sort();save('src/core/skill-catalog.json',catalog)
save('docs/acceptance/2026-10-23-pstack-sync/source/replacement-review.json',reviews)
save('docs/acceptance/2026-10-23-pstack-sync/source/source-decisions.json',{'revision':REV,'semanticAuthority':f'https://github.com/cursor/plugins/tree/{REV}/pstack','externalWorkflowImports':[],'files':[{'source':p,'change':'added' if p in delta['added'] else 'modified','decision':'derive-official-runtime' if any(e['source']==p for e in manifest['entries']) else 'preserve-official-snapshot','outputs':[e['output'] for e in manifest['entries'] if e['source']==p]} for p in sorted(delta['modified']+delta['added'])]})
print(len(files),'source files;',len(manifest['entries']),'derivations;',len(reviews),'adaptation changes')
