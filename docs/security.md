# Security model

## Trust boundaries

Oh My Stack packages instructions and may optionally package scripts, Hooks, MCP configuration, or integrations. These components do not share the same risk. Skills are untrusted instructions until reviewed; scripts and Hooks are executable code; MCP servers and external CLIs add network, credential, and mutation authority.

Upstream content, external web content, subagent reports, transcripts, generated patches, and integration responses are all untrusted inputs. A successful child session or tool call is evidence, not authorization or final verification.

## Baseline rules

- Skills-only installation is the default minimum package.
- Hooks, scripts, MCP servers, and external integrations are separately declared and never silently enabled.
- Every executable entry point names its purpose, required permissions, input boundary, and uninstall behavior.
- Runtime adapters request the smallest available permission set and fail closed when a required capability is unavailable.
- User-owned configuration is never replaced wholesale. Updates use owned regions or additive files and preserve unrelated settings.
- Install, update, rollback, and uninstall are tested in isolated homes.
- Imported executable files retain source revision, license, content hash, and review status.
- CI actions are pinned to immutable revisions and generated release artifacts receive checksums.
- Credentials, transcripts, and private workspace content are excluded from fixtures and generated packages.
- External mutations, merges, destructive operations, and irreversible decisions remain root- and user-governed.

The model-inventory collector may use the runtime's authenticated network path
to read the current account catalog. It writes only an explicitly selected
inventory file. The configuration step is offline, validates every selection
against that file, and preflights all project-owned targets before applying an
update. Neither step writes into the user's broader runtime configuration.

## Hook policy

A target may generate a Hook only when a workflow declares it as an optional or required capability. The package documents the trigger, command, files read or written, network behavior, and disable path. Installation alone does not imply trust; the runtime's native trust or approval mechanism remains authoritative.

## Supply-chain policy

Upstream synchronization operates from pinned commits and immutable source slices. A failed transformation, denylist hit, provenance gap, conflict, validation failure, or test failure leaves both generated files and the baseline pin unchanged. Release archives are built from a tagged clean checkout, not from a developer's working tree.

## Security gates

Security validation starts in Phase 0 rather than at release time:

1. provenance and license validation;
2. forbidden-token, path-escape, and executable-entry inventory checks;
3. target manifest and permission validation;
4. isolated install/update/uninstall tests;
5. runtime probes under the minimum permission profile;
6. release checksum and clean-tag reproduction.
