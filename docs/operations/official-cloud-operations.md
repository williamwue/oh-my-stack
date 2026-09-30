# Official cloud operations — oh-my-stack

This is the current operations entry point. The 2026-09-30 change is local policy/configuration maintenance; it is not deployment, migration, remote push, or live cloud acceptance.

## Repository and target identity

Locally checked Git origin: `github.com/williamwue/oh-my-stack`. No verified business-cloud binding is inferred from this origin.

Before each actual cloud operation, resolve the current repository/worktree, check `git remote get-url origin`, branch, HEAD and working-tree changes, then verify the authenticated provider account/organization, region, exact resource and environment through the official provider. A cached ID, login, installed tool, or successful local build is not target verification or authorization. Never push to a template/vendor remote. Preserve unrelated changes; use an isolated worktree if needed.

## Provider access

| Provider | Approved access | Official reference |
| --- | --- | --- |
| github | Official GitHub MCP or gh; official REST/GraphQL API | [Documentation](https://cli.github.com/manual/) |

The table records declared providers or template targets, not live authentication or production readiness. For templates, demos and locally derived products, do not provision or operate a cloud resource merely because framework code exists. Providers disabled or unbound in the retained resource metadata remain blocked until an explicit, verified configuration change.

Use the provider's official MCP/CLI/SDK/API and applicable official skills. Select the supported path for the operation; do not require all transports. If an official MCP lacks an operation, use the official CLI or SDK/API after the same identity and authorization checks. Discover CLI syntax with local `--help` and current official documentation. Keep provider approval controls enabled. Repository scripts may still orchestrate official tools, local builds, data-plane transfers and release checks only after confirming they neither invoke retired tooling nor import its credentials.

## Credentials and evidence

Authenticate on this workstation with official OAuth/CLI profiles or an explicitly approved local credential manager. Keep secrets outside Git, chat, command arguments and reports; log names/statuses only. Do not read production credentials from repository `.env*`, read/import the retired `~/.cloud-ops/secrets.env` store, copy another machine's tokens, or invoke retired credential importers. Missing credentials block the specific operation; configure fresh provider authentication when that operation is authorized. Never grant production access just to make a local check pass.

For database diagnostics, use the verified target and a least-privilege reader with a bounded read-only transaction. Never run session-level `SET` through the Supabase 6543 transaction pooler. Do not substitute an admin/service-role connection for a missing reader. Structure changes require a reviewed, versioned migration and the existing migration/release approval flow.

## Release and change gates

Existing release branches, migration merge requirements, candidate SHA/tree checks, review, dry-run, regression and human approval gates remain mandatory. An official tool or skill does not override them. State the exact target, environment and requested action before authorized writes. Production deployment/configuration changes, schema migrations, deletion, rollback, credential changes and billable actions need explicit authorization for their scope. Prefer Git-tracked release sources; no ad-hoc local production snapshot.

This maintenance authorizes local reversible edits only. Do not run deployments, remote pushes, migrations or release commands with cloud side effects as validation. A command called dry-run, doctor, preview, verify or plan is not automatically offline: inspect its implementation first. Local verification and provider/production acceptance must be reported separately.

## Retired sources and historical records

`william-cloud-ops` and its `project-cloud-operations` skill, gateway tools, scripts, hooks and credential stores are retired. Do not activate/install the plugin, execute its scripts or import its credentials. Official provider connections are configured independently; a cached retired tool visible in an old session is not an approved route.

`cf-cutover-20260929` is a historical rehearsal snapshot. Never use it as the current application checkout, deployment source or production runbook; never execute its forward/rollback bundles. Preserve executed SQL, migration ledgers, dated evidence and original checksums. Mark retirement in a separate current document, not by rewriting checksummed history. Use the current project repository and its reviewed release process for future changes.

Existing `.cloud-ops` JSON files are retained legacy metadata/evidence only. Account/resource identifiers and provider restrictions may inform verification, but runbooks, commands, extensions, operation bindings and credential bundles are not execution or secret-loading configuration. Do not invoke the old gateway to validate them. Dated reports describe their original machine/time and are not current authentication or deployment evidence.

Existing project gates (paths from the repository root):

- `docs/release-process.md`
