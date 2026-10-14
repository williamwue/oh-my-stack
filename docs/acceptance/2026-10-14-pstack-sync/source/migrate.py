import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = Path(__file__).resolve().parent
OLD = '978ca6e9c0e012047cd5058b8e829240336e704e'
REV = 'ce649c03ac3b75b6ae80cbd15b7e2c536caedb5a'
MANIFEST = ROOT / 'upstream/parity-derivations.json'
SOURCE = f'upstream/snapshots/cursor-pstack-october-14/{REV}/pstack'
manifest = json.loads(MANIFEST.read_text())
assert manifest['revision'] in [OLD, REV]
if manifest['revision'] == REV:
    raise SystemExit('Migration already recorded. Run node tools/derive-pstack.mjs --check.')
old_manifest = copy.deepcopy(manifest)
binding = next(e for e in manifest['entries'] if e['output'] == 'src/core/skills/poteto-mode/SKILL.md')['replacements'][0]['after'].split('\n\n', 1)[1]
reviews = []

def replacement(before, after, category, reason):
    return {'before': before, 'after': after, 'expectedOccurrences': 1, 'category': category, 'reason': reason}

def add(entry, text, before, after, category, reason):
    count = text.count(before)
    if count:
        item = replacement(before, after, category, reason)
        item['expectedOccurrences'] = count
        entry['replacements'].append(item)
        reviews.append({'output': entry['output'], 'decision': 'new-adaptation', **item})
        return text.replace(before, after)
    return text

for entry in manifest['entries']:
    source = (ROOT / SOURCE / entry['source']).read_text()
    text = source
    retained = []
    for item in entry['replacements']:
        original = copy.deepcopy(item)
        if item['category'] == 'frontmatter' and item['before'].startswith('---\n') and item['before'] not in source:
            item['before'] = source[:source.index('\n---\n') + 5]
            if entry['source'].startswith('agents/'):
                item['after'] = item['after']
            else:
                front = item['before']
                name = Path(entry['output']).parent.name
                front = '\n'.join('name: ' + name if line.startswith('name:') else line for line in front.split('\n'))
                front = '\n'.join(line for line in front.split('\n') if not line.startswith(('disable-model-invocation:', 'icon:', 'color:', 'mode:', 'reminder:')))
                item['after'] = front.rstrip() + '\n\n' + binding
        if entry['source'] == 'skills/arena/SKILL.md' and item['before'].startswith('If the Task tool rejects a configured entry,'):
            item['before'] = "If the Task tool rejects a configured entry, run that seat on its family's default and say so. Families go by prefix: `claude-*`, and `grok-*` with `cursor-grok-*` and `composer-*`. A refused `composer-*` entry runs on `observed code-model choice`. With no family match, use `observed judgment-model choice`. If it rejects a default, use the closest valid slug of the same family from its error message."
            item['after'] = "If the host rejects a configured entry, run that seat on its family's observed default and disclose it. Resolve families from host metadata. In the source-host examples, `cursor-grok-*` and `composer-*` belong to the `grok-*` family, so a refused composer entry uses that family's default. With no family match, use the observed judgment-model default. If the default is rejected, use the closest observed equivalent in the same family from the host's valid model IDs. Aliases inherit the parent model and never use model fallback."
        if entry['source'] == 'skills/interrogate/SKILL.md' and item['before'].startswith('Families go by prefix:'):
            item['before'] = 'Families go by prefix: `claude-*`, and `grok-*` with `cursor-grok-*` and `composer-*`.'
            item['after'] = 'Resolve model families from observed host metadata. In the source-host examples, `cursor-grok-*` and `composer-*` belong to the `grok-*` family.'
        if entry['source'] == 'skills/no-comments/SKILL.md' and item['before'] == '`subagent_type: "Comment Sicko"`':
            item['before'] = '`subagent_type: "comment-sicko"`'
        count = text.count(item['before'])
        if not count:
            assert item['category'] in ['path', 'tools'], (entry['output'], item)
            reviews.append({'output': entry['output'], 'decision': 'retired-anchor-absent-in-new-source', 'previous': original})
            continue
        item['expectedOccurrences'] = count
        retained.append(item)
        if item != original:
            reviews.append({'output': entry['output'], 'decision': 'reviewed-anchor-or-count', 'previous': original, 'current': copy.deepcopy(item)})
        text = text.replace(item['before'], item['after'])
    entry['replacements'] = retained
    if entry['source'] == 'skills/poteto-mode/SKILL.md':
        start = text.index('**Match the model to the job.**')
        end = text.index('\n\n', start)
        policy = "**Match the model to the job.** Before each spawn, start from the role's line or default and pick the reasoning level and speed the job needs. The `/setup-oh-my-stack` budget sets each role's starting level, xhigh by default. Raise it one supported step, up to the host's maximum, for the hardest or subtlest work. Lower it one step for judgment and two or more steps for routine work. Use fast mode only when the job is urgent, meaning CI or trunk is red or a person is blocked on the result right now. Otherwise use standard speed. Verification is the exception and stays on the `swarm workers` model and speed. Change only supported effort and speed options. Keep the model family the role names so a diverse panel stays diverse. If that family lacks the requested settings, use its nearest observed supported settings. A role on `auto` or `inherit-parent` stays on the parent model. If the host rejects the adjusted selection, do not try another adjusted selection. Use the role's original line or default and disclose it. Translate the source host's effort and `-fast` slug examples through the generated model-selection binding rather than inventing model IDs or claiming unsupported option enforcement."
        text = add(entry, text, text[start:end], policy, 'model-selection', 'Preserve effort, urgency, family, alias and verifier exceptions through supported native options.')
        text = add(entry, text, 'every Task spawn', 'every native child spawn', 'tools', 'The receiving chat owns native delegation.')
    if entry['source'] == 'agents/poteto-agent.md':
        before = 'With no path, before any other work, search `~/.cursor/plugins/` for a file whose path ends in `skills/poteto-mode/SKILL.md`. If more than one file matches, use the copy whose `.cursor-plugin/plugin.json` has the highest `version`. Your skill catalog hides this skill, so a missing catalog entry does not mean pstack is absent.'
        text = add(entry, text, before, "With no path, before any other work, locate the installed package through the host's documented package catalog and resolve `skills/poteto-mode/SKILL.md` there. Use the selected installed package rather than guessing a cache path or reading unrelated host plugins. A missing catalog entry alone does not establish that the package is absent.", 'path', 'Resolve installed skill ownership through the native package instead of a Cursor cache.')
        text = add(entry, text, 'every Task spawn', 'every native child spawn', 'tools', 'The parent owns native delegation.')
    if entry['source'] == 'skills/poteto-mode/playbooks/multi-phase-plan.md':
        command = 'node pstack/skills/poteto-mode/../poteto-mode/scripts/check-plan.mjs <plan.md>' if entry['output'] == 'src/core/skills/multi-phase-plan/SKILL.md' else 'node pstack/skills/poteto-mode/scripts/check-plan.mjs <plan.md>'
        text = add(entry, text, command, 'node "<absolute installed package>/skills/poteto-mode/scripts/check-plan.mjs" <plan.md>', 'path', 'Resolve the installed package once and use the exact portable checker path from either entry.')
        text = add(entry, text, 'pstack/skills/', 'src/core/skills/', 'path', 'Repository source examples refer to the current semantic tree, not the upstream checkout.')
        relative = '../poteto-mode/scripts/check-plan.mjs' if entry['output'] == 'src/core/skills/multi-phase-plan/SKILL.md' else '../scripts/check-plan.mjs'
        text = add(entry, text, 'and fix every line it prints', f'and fix every line it prints. Resolve the installed package from this entry. The [bundled checker]({relative}) is the portable helper authorized by the runtime binding', 'path', 'Provide a real relative link while retaining a package-aware executable command.')
    entry['sourceSha256'] = hashlib.sha256(source.encode()).hexdigest()
    entry['outputSha256'] = hashlib.sha256(text.encode()).hexdigest()

for source in ['skills/in-your-own-words/SKILL.md', 'skills/poteto-mode/scripts/check-plan.test.ts']:
    assert not any(e['source'] == source for e in manifest['entries'])
    text = (ROOT / SOURCE / source).read_text()
    entry = {'source': source, 'output': f'src/core/{source}', 'sourceSha256': hashlib.sha256(text.encode()).hexdigest(), 'replacements': []}
    if source.endswith('SKILL.md'):
        before = text[:text.index('\n---\n') + 5] + '\n'
        after = before.replace('disable-model-invocation: true\n', '') + binding
        text = add(entry, text, before, after, 'frontmatter', 'Expose the new entry explicitly through the host catalog with unchanged semantic body.')
    entry['outputSha256'] = hashlib.sha256(text.encode()).hexdigest()
    manifest['entries'].append(entry)
manifest['revision'] = REV
manifest['sourceRoot'] = SOURCE
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
imports = ROOT / 'upstream/imports.json'
data = json.loads(imports.read_text()); data['revision'] = REV
imports.write_text(json.dumps(data, indent=2) + '\n')
(EVIDENCE / 'replacement-review.json').write_text(json.dumps(reviews, indent=2, ensure_ascii=False) + '\n')
print(len(manifest['entries']), 'derivations', len(reviews), 'review records')
