# OMP 18.2.9 live acceptance plan

Date: 2026-09-23. This records the first native runs of the unreleased
74-Skill package on the user's normal OMP 18.2.9 profile. It does not claim
full workflow or plugin-lifecycle parity.

## First normal-profile run

The user authorized using the normal OMP environment rather than an isolated
profile. Before the change, `omp plugin list --json` showed only
`william-cloud-ops`; `omp plugin doctor --json` was healthy. The generated
`packages/omp` directory was linked with `omp plugin link` into the user's
plugin directory. `omp plugin list` and `doctor` then showed `oh-my-stack`
version `0.2.0-alpha.4` as enabled, and the symlink resolved to this working
tree's generated OMP package. The previous plugin remained enabled.

The first model turn did **not** prove native Skill discovery: it could not
resolve `skill://prove-it-works` and instead read a workspace copy. The cause
was the existing normal-profile `skills.includeSkills` allowlist, which
contained only `project-cloud-operations`. OMP's `plugin list` success does
not bypass that filter. The allowlist now preserves that existing entry and
adds all 74 public Oh My Stack names (75 total). `omp read skill://...`
successfully returned all 74 installed public Skill bodies; the existing
`project-cloud-operations` still resolves. The 12 probes were not added.

A fresh native model turn then called `read` on `skill://prove-it-works`,
received the package's complete `SKILL.md`, read `.git/HEAD`, reported the
correct workspace and Git status, and made no project edits. The saved OMP
session is `01a0cc06-9041-7676-b28d-e733cee0bcca` under the normal agent
session store. This is direct loading and a bounded W1 read-only result, not
evidence for other workflows.

A second normal-profile turn selected `skill://swarm` and launched one native
`task` batch with two `evidence-reader` workers, `SkillCatalogA` and
`PluginManifestB`, on disjoint read-only slices. The root read both workers'
resources and independently checked the 74-entry source catalog and the
installed plugin manifest/version. Both workers completed. The saved parent
session is `01a0cc07-8c64-71a8-a334-3d016a3d3b0d`. The model initially
tried to use `hub` as a shell command, found that unavailable, and recovered
through OMP resource reads. This is a positive read-only coverage fan-out,
not a guarantee of writing isolation, cancellation, or every `swarm` branch.

The normal-profile installation and allowlist are intentionally left in place
for the user's hands-on use. Because `omp plugin link` points at the generated
working-tree package, later regeneration changes what the user loads. No Git
commit, tag, push, or public release occurred.

## Starting point and safety boundary

- Local `omp --version` reports 18.2.9. `packages/omp/package.json` is a
  native OMP manifest (`omp.skills: ["./skills"]`); its generated catalog has
  74 public Skills and no probes. The root adapter manifest and generated
  manifest match in the current unreleased working tree.
- The local model catalog lists `openai-codex` models. The two successful
  normal-profile turns prove the selected live route worked; they do not
  establish availability for every listed model.
- The OMP 18.2.6 plugin-manager probe recorded `plugin link --dry-run`
  writing a user-level symlink and lock entry. The explicit user authorization
  allowed a real link in the normal profile here; the `--dry-run` invariant
  has not been retested on 18.2.9.
- Do not point an automated writer or cleanup workflow at the dirty source
  checkout. Claude Code is outside this test because no local account is
  available.

## Execution sequence

1. Record `omp --version`, source revision and `git status --short`, generated
   catalog count, and a content hash of the OMP package before each new batch.
   Make a disposable fixture directory for any examples that could write.
2. Extend `swarm` to failure and cancellation branches, and run an `arena`
   fixture equivalent to the Codex check. For `arena`, freeze the rubric first,
   start two candidates before wait, and use a distinct judge only after both
   proposals finish. Mark model diversity unknown unless child model
   identities differ in the runtime trace.
3. Expand to newly ported `why`, `architect`, then the remaining entries in
   `docs/upstream-completion-plan.md`. Use read-only or disposable fixtures
   first, then scoped write fixtures. Require each result to identify the
   requested behavior, native calls, root verification, failure/cleanup path,
   and uncovered branches.
4. If release readiness depends on the `--dry-run` safety contract, retest it
   against snapshotted plugin state. Do not infer it from this real link.

The first OMP runs above are fresh native 18.2.9 records, not relabeled
18.2.6/18.2.8 evidence. Keep package discovery, direct Skill loading, workflow
execution, and plugin-manager safety as separate result categories.

Later 18.2.10 retesting found the `plugin link --dry-run` write defect still
present. The disposable test plugin was removed and the user plugin lock and
package-manifest hashes returned to their original values. See
[release-candidate readiness](release-candidate-readiness.md); the historical
18.2.9 observations above are unchanged.
