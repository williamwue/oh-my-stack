# AIHero complements: diagnosis and review

Date: 2026-10-08. Base: `3bc672568a8ccba812a804bec082d6d24a1d0cab`.
Status: second source batch on `codex/aihero-complement-20261008`; not published
or globally installed. The [first-batch record](aihero-complements-2026-10-08.md)
and its dated evidence retain their original scope.

## Selected source

Add original `diagnosing-bugs` and `code-review` at upstream main revision
`f3fc5632f401156837ee3872f14fe33ccf1024ea`, rechecked during this import.
The first fourteen originals remain at their existing revision. A separate
`aihero-20261008` source record pins the two new directories, their five files,
and the unchanged MIT license. All forty first-source file records are unchanged.

The two newer bodies differ from the first source's revision: diagnosis verifies
deliberately induced failure against a pristine copy; review searches all
documented standards, requires known standards files, accepts supplied tracker
instructions, and explicitly starts both reviewers together. Importing their
complete newer directories retains these changes without editing originals or
upgrading previously selected Skills.

All three generated targets carry complete instructions, UI metadata, the
original HITL Bash template, `LICENSE`, and `SOURCE.json`. No original text is
adapted. Public entries increase from 93 to 95: 71 workflows and 24 principles.
AIHero original entries increase from fourteen to sixteen.

## Invocation and complementary use

| Original | Invocation | Requirements and boundaries | Pstack complement |
| --- | --- | --- | --- |
| `diagnosing-bugs` | Automatic or explicit | Local commands, workspace inspection and writing, relative resources, optional Bash HITL interaction. Full diagnosis, fix, and cleanup process. | Difficult reproduction and falsifiable probes; `bug-fix` retains bounded fix coordination and root verification. |
| `code-review` | Automatic or explicit | A resolvable fixed ref, standards and spec/tracker context, actual parallel read-only reviewers and result collection. | Separate Standards and Spec reports; `interrogate` retains adversarial review, synthesis, and verdict. |

Neither body invokes another Skill through the Skill tool. Their invoked-Skill
dependency arrays are empty. A reference to `setup-matt-pocock-skills` describes
missing tracker configuration, not an automatic dependency invocation.

The original review's three-dot diff compares committed changes; worktree edits
are excluded despite its broad trigger description. The user guide makes that
limit explicit. A missing spec skips the Spec reviewer. Local review does not
authorize tracker writes, PR comments, merge, or publication.

Existing OMS routes and model settings are unchanged. The guide explains which
primary workflow to select; it does not nest whole workflows automatically.
Provider, release, production, and paid-operation gates still apply.

## Bash template

The retained `scripts/hitl-loop.template.sh` uses Bash, prompts for observations,
and writes them to stdout. Its default URL and Export button are placeholders;
copy and tailor the steps before use. Capture only observations, never
credentials. The template itself performs no network calls or filesystem writes.
The source script and three packaged copies are listed in the executable
inventory. Preserve the original file bytes when adapting a local copy.

## Acceptance boundaries

Source acceptance checks all original resources, both source licenses,
invocation modes, provenance, and dependency closure. Tamper checks cover an
original document and the second source's packaged Bash script. The inventory
test went red with exactly the two missing entries before import.

All four source tests pass. Full `npm run check` passes generation and docs
checks, conformance, release reproducibility, source validation, book validation,
and Markdown. The repository suite reports 281 passed, four failed, and two
skipped. The four failing tests and decisive errors match the unchanged base
reproduction recorded during batch one: the JavaScript Claude fixture cannot
spawn on Windows, two routing-hook path assertions fail, and the Git promotion
fixture requires `which`. The full gate remains failed; no release approval is
implied. See the [local check receipt](../acceptance/aihero-complements-second-batch-2026-10-08/local-checks.json).

The [Codex discovery receipt](../acceptance/aihero-complements-second-batch-2026-10-08/native-discovery.json)
records both generated originals enabled in a temporary repository-local
installation, with expected interface labels and no discovery errors. Codex
CLI 0.161.0 was used through its installed Node entry point after a PowerShell
wrapper initialization timed out. No model turn was started and global
installation was unchanged. The response does not report invocation policy,
so discovery does not verify that policy.

The [Bash receipt](../acceptance/aihero-complements-second-batch-2026-10-08/bash-template.json)
records successful syntax checking and prompt/capture helper execution using
synthetic stdin with Git Bash. This checks the template mechanics; it does not
exercise an app, reproduce a real defect, or establish a human interaction flow.

Local generation and metadata discovery do not establish full instruction
injection, diagnostic effectiveness, actual reviewer independence, automatic
selection quality, or native OMP/Claude Code behavior. Publication and global
installation remain separate, subject to the existing
[release gates](../release-process.md).
