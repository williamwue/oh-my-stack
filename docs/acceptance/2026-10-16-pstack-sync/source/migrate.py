import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = Path(__file__).resolve().parent
OLD = 'ce649c03ac3b75b6ae80cbd15b7e2c536caedb5a'
REV = '99743e9c151c8537cbbf1f98bb38f34ef3368453'
SOURCE = f'upstream/snapshots/cursor-pstack-october-16/{REV}/pstack'
manifest_path = ROOT / 'upstream/parity-derivations.json'
manifest = json.loads(manifest_path.read_text())
assert manifest['revision'] == OLD, 'Migration requires the preserved 0.15.23 baseline.'
reviews = []
binding = next(e for e in manifest['entries'] if e['output'] == 'src/core/skills/in-your-own-words/SKILL.md')['replacements'][0]['after'].split('\n\n', 1)[1]

for entry in manifest['entries']:
    source = (ROOT / SOURCE / entry['source']).read_text()
    text = source
    for item in entry['replacements']:
        previous = copy.deepcopy(item)
        if item['before'].startswith('---\n') and item['category'] == 'frontmatter' and item['before'] not in text:
            before = source[:source.index('\n---\n') + 5]
            if item['before'].endswith('\n\n'):
                before += '\n'
            after = '\n'.join(line for line in before.split('\n') if not line.startswith('disable-model-invocation:'))
            after = after.rstrip() + '\n\n' + binding
            item['before'] = before
            item['after'] = after
        count = text.count(item['before'])
        assert count == item['expectedOccurrences'], (entry['output'], item, count)
        text = text.replace(item['before'], item['after'])
        if item != previous:
            reviews.append({'output': entry['output'], 'decision': 'updated-official-frontmatter', 'previous': previous, 'current': copy.deepcopy(item)})
    entry['sourceSha256'] = hashlib.sha256(source.encode()).hexdigest()
    entry['outputSha256'] = hashlib.sha256(text.encode()).hexdigest()

source_name = 'skills/sharpen/SKILL.md'
source = (ROOT / SOURCE / source_name).read_text()
before = source[:source.index('\n---\n') + 5] + '\n'
after = before.replace('disable-model-invocation: true\n', '') + binding
item = {'before': before, 'after': after, 'expectedOccurrences': 1, 'category': 'frontmatter', 'reason': 'Preserve the official task-framing behavior and expose it explicitly through the native host catalog.'}
entry = {'source': source_name, 'output': f'src/core/{source_name}', 'sourceSha256': hashlib.sha256(source.encode()).hexdigest(), 'outputSha256': hashlib.sha256(source.replace(before, after).encode()).hexdigest(), 'replacements': [item]}
manifest['entries'].append(entry)
reviews.append({'output': entry['output'], 'decision': 'new-explicit-official-skill', 'current': item})
manifest['revision'] = REV
manifest['sourceRoot'] = SOURCE
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
for name in ['imports.json', 'semantic-derivations.json']:
    imports_path = ROOT / 'upstream' / name
    imports = json.loads(imports_path.read_text())
    imports['revision'] = REV
    imports['sourceReceipt'] = 'docs/acceptance/2026-10-16-pstack-sync/upstream-files.json'
    imports_path.write_text(json.dumps(imports, indent=2) + '\n')
(EVIDENCE / 'replacement-review.json').write_text(json.dumps(reviews, indent=2, ensure_ascii=False) + '\n')
print(f'{len(manifest["entries"])} exact derivations; {len(reviews)} reviewed adaptations')
