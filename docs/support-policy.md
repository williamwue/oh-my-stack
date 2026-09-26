# Support policy for 0.2.0

0.2.0 is the first non-beta release, not a promise of complete Cursor pstack
behavioral parity or stable 1.0 APIs. Support is scoped to the observed versions
and surfaces in the [host matrix](host-compatibility.md). Other combinations
require a fresh inventory, installation check and bounded worker test.

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
