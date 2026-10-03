# Support policy

## Release baseline: 0.3.0

0.3.0 is the release baseline. It is not a promise of complete Cursor
pstack behavioral parity or stable 1.0 APIs. Support is scoped to the observed
versions and surfaces in the [host matrix](host-compatibility.md). Other
combinations require a fresh inventory, installation check and bounded worker
test.

## Supported core

- All 74 public Skill entries remain directly selectable: 51 workflows and
  23 principles. Entry availability is not exhaustive execution certification.
- Deterministic runtime packages, integrity verification, owned-directory
  installation, update, rollback and uninstall.
- Explicit setup preview and apply; user defaults and project overrides;
  named routes and panels; model/effort validation from observed inventories.
- Bounded workflow execution and worker-result auditing on tested hosts.
  Codex uses explicit model/effort dispatch, not a claim that generated custom
  role files are natively activated. OMP and Claude use their native role paths.
- Recovery uses validated repository/branch/HEAD checkpoints. Do not repeat
  completed work or replace a writer until old work is terminal or isolated.

Model access, authentication, provider pricing and host delegation APIs are
controlled by their providers. Setup never grants merge, deployment or
credential authority. Root review and independent verification remain required.

## Experimental or unverified behavior

- Live-worker reattachment after coordinator restart; uncontrolled late-result
  races; long-running autonomous convergence and unrestricted multi-writer use.
- End-to-end PR/CI approvals, merges, scheduled wakeups and authenticated
  Benny/webhook integrations. Instructions exist but are not certified services.
- Full real-project execution of every Skill, complete cross-host parity and
  every model/provider combination.
- Windows/Linux interactive compatibility beyond reported observations;
  Ubuntu offline CI is not interactive runtime certification.

These limitations do not silently disappear with a successful core smoke test.
Unsupported or missing capabilities must produce an explicit stop or a disclosed
fallback, not a success claim. See [project status](project-status.md) for gaps.

## Source operations in 0.3.0

The subsequent [GitHub provider](github-autopilot-provider.md)
uses official `gh` for real target observation and explicitly authorized
library mutations. Its journal reconciles uncertain external results without
blind retries. The command-line interface is read only; unattended operation
and atomic expected-base protection are not claimed. This addition does not change installed plugin versions or the
experimental boundaries above.

The current Codex candidate adds packaged bindings and a
[single-PR workflow helper](github-workflow.md) for `opening-a-pr`, `babysit`
check and root-authorized `shipping`. Other hosts, babysit drive, automatic
stack-frontier computation and hosted lifecycle acceptance are not covered
by this bounded integration. Strict target-revision semantics stop; ordinary
server-policy behavior needs explicitly bound authority. See the
[integration acceptance](github-workflow-acceptance-2026-10-03.md).

Separate [hosted acceptance](github-hosted-acceptance-2026-10-03.md) now covers
real PR creation, CI failure/repair and operator-assisted recovery after a
client kill. Independent approval, merge and interrupted-merge acceptance
remain open; this is not full hosted lifecycle acceptance.

The source checkout adds local run, evidence, matrix, and read-only doctor
tooling in 0.3.0. These are source commands, not global plugin commands. Use the
[operations guide](operations-guide.md) for prerequisites, recovery, and
diagnostic exit codes. A valid local store and passing doctor report do not
establish hosted autopilot, POSIX runtime acceptance, authenticated backend
work, or full pstack equivalence.

## Updating, rollback and support reports

Retain the previous trusted archives and release manifest before upgrading.
Plugin files and model setup are separate: an upgrade must not reset personal
choices, and uninstalling a plugin does not delete setup files. Use the
[release procedure](release-process.md) for integrity checks and rollback.
Pre-1.0 configuration changes will be documented; do not assume a downgrade
can interpret configuration newly written by a later version.

For a bug report, provide the plugin version, host version/platform, selected
Skill, expected/actual outcome, effective setup scope and redacted runtime
evidence. Never attach credentials or unredacted provider/account logs.
Use [GitHub Issues](https://github.com/williamwue/oh-my-stack/issues);
security reports follow [SECURITY.md](../SECURITY.md).
