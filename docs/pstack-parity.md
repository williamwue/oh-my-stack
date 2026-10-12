# Pinned pstack core and optional extensions

The 0.16.0 release targets pstack 0.15.17 at
`978ca6e9c0e012047cd5058b8e829240336e704e`. Its default packages contain
upstream workflows, built-in OMS automatic routing, and the bindings needed by
Codex, Claude Code, Pi and OMP. Routing hooks and configuration are supported
on Codex and Claude Code; Pi and OMP retain the explicit workflow fallback.
Generating or testing the source does not update an installed plugin or publish
a release.

The [complete source receipt](acceptance/2026-10-11-parity/upstream-files.json)
records all 165 pinned upstream files. Runtime instructions derive from these
inputs through exact, reviewed replacements. The derivation record explains
each changed span. Hashes establish source integrity; they do not establish
that an agent followed the instructions.

Markdown style checks exclude exactly the derived Markdown paths and their
generated host copies, as listed in the derivation manifest. Their source
wording and formatting are checked by derivation hashes instead. Local prose,
adapter code and optional additions keep their usual checks.

## Select a distribution

Ordinary generation includes automatic routing and selects no extensions.
The entry, configuration helper and supported native hooks are part of the
default distribution. Missing configuration means manual mode; generation and
installation never enable routing or rewrite existing settings.

```sh
npm run generate
```

Select additions explicitly and generate them into a separate directory.

```sh
node tools/generate.mjs --extensions enhanced-delivery,extras,aihero --output-root .tmp/extended
```

| Extension | Added capability |
| --- | --- |
| `enhanced-delivery` | Explicit OMS delivery evidence entry and its local verification tools. |
| `extras` | Optional diagnostic and automation entries. Benny retains its upstream pstack attribution and separate discovery boundary. |
| `aihero` | Selected pinned AIHero originals, resources and licenses. |

The previous `--extensions auto-routing` option remains accepted for compatibility.
It adds nothing and is omitted from the selected extension list, because routing
is now always included. Existing routing configuration paths and precedence are
unchanged.

An artifact records the selected extensions. Its catalog describes the skills
actually present. An extension does not replace the strict workflow body or
silently add a required stage to it. Existing installed packages retain their
own contents until explicitly upgraded.

## Preserved behavior and necessary adaptations

| Upstream contract | Host adaptation boundary |
| --- | --- |
| General Mode triggers apply together, with the full principle index and leaf-reading requirements. | Skill invocation and resource paths use the host's supported mechanism. |
| Large or cross-cutting work selects Figure It Out even when a narrower playbook matches. | An unavailable native capability is reported rather than replaced with an invented successful workflow. |
| How uses the upstream exploration and explanation stages. Interrogate leaves synthesis and judgment with the lead. | Native child tools, model selection and result collection differ by host. |
| Code-quality blockers and Comment Sicko's exceptions, deletion and rerun rules remain intact. | Comment-only writes remain distinct from application-code editing. |
| A fresh comparison panel has two entries. | Selectors and reasoning levels must exist in the observed host inventory. |
| Architect proceeds into authorized implementation. | An explicit design-only request remains design-only. |
| Workflow publication steps describe the upstream process. | User scope and host authorization continue to control publication, messages, deployments and irreversible operations. |

Saved model choices remain separate from default configuration. Reconfiguring
the same target and preset preserves saved panel membership and order, including
three-entry panels. Changing a preset or selecting an explicit override is a
different operation. Nothing in source generation changes personal settings.

## Pi is a separate host

Pi uses its own `pi.skills` and `pi.extensions` package declarations, resolution
manifest and native `oms_delegate` tool. OMP keeps its `omp.skills` declaration.
The Pi bridge uses native CLI/RPC child processes with explicit model selection.
It does not copy credentials or implement provider authentication.

The workflow starts one child for the selected route member, collects its
result and can cancel it. The bridge does not choose review stages or synthesize
findings. Read-only children lack shell and mutation tools. A working directory
and role instruction are not an operating-system sandbox. Concurrent writers
need separate checkouts.

Requested and observed model/effort are separate evidence. A model listed in an
inventory has not thereby completed a task. Providers registered only in a
parent extension and unsupported virtual routes require an explicit capability
result rather than a hidden provider substitution.

## Verification boundaries

Source derivation, selected catalogs, generated files, model retention and
archive installation are local checks. Native skill discovery, child execution,
return, cancellation and routing require separate observations for each host.
Codex, OMP or T3 records do not establish standalone Pi acceptance. Historical
conformance records do not certify changed instructions on a new runtime.

The optional OMS delivery protocol may report inconclusive task attribution
when the host encrypts native prompt bodies. That limitation remains visible;
it does not create an additional completion stage in the default pstack workflow.
