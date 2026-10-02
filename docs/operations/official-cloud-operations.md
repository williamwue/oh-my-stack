# Official cloud operations — oh-my-stack

This is the current operations entry point. The 2026-09-30 retirement and 2026-10-01 single-maintainer cleanup are local policy/configuration maintenance; it is not deployment, migration, remote push, or live cloud acceptance.

## Repository and target identity

Locally checked Git origin: `github.com/williamwue/oh-my-stack`. No verified business-cloud binding is inferred from this origin.

Before each actual cloud operation, resolve the current repository/worktree, check `git remote get-url origin`, branch, HEAD and working-tree changes, then verify the authenticated provider account/organization, region, exact resource and environment through the official provider. A cached ID, login, installed tool, or successful local build is not target verification or authorization. Never push to a template/vendor remote. Preserve unrelated changes; use an isolated worktree if needed.

## Provider access

| Provider | Daily official entry | Official reference |
| --- | --- | --- |
| GitHub | `gh auth login` / `gh auth status`; official GitHub MCP or `gh` / REST / GraphQL | [CLI](https://cli.github.com/manual/) |

The table records declared providers or template targets, not live authentication or production readiness. For templates, demos and locally derived products, do not provision or operate a cloud resource merely because framework code exists. Providers disabled or unbound in the retained resource metadata remain blocked until an explicit, verified configuration change.

Use the provider's official MCP/CLI/SDK/API and applicable official skills. Select the supported path for the operation; do not require all transports. If an official MCP lacks an operation, use the official CLI or SDK/API after the same identity and authorization checks. Discover CLI syntax with local `--help` and current official documentation. Keep provider approval controls enabled. Repository scripts may still orchestrate official tools, local builds, data-plane transfers and release checks only after confirming they neither invoke retired tooling nor import its credentials.

## Single-maintainer workflow

Use the existing maintainer account through official OAuth/CLI login. Do not require new custom reader roles, fixed RAM principals, permission tiers or a unified gateway for routine management. Verify the actual account and target; preserve application authorization and existing release/migration approvals.

Use repository-pinned CLIs where available; run Wrangler commands from the application/configuration root named above. Official MCP, CLI and SDK/API are supported alternatives: choose the tool that covers the operation. A documentation-only MCP does not provide account management. Run `--help` before unfamiliar commands. Login is workstation setup, not project provisioning.

### Project targets

These non-secret coordinates are discovery inputs. Confirm them through the provider before a live operation; the table is not current authentication, deployment or application-health evidence. Template defaults and placeholder IDs do not bind production resources.

| Provider | Exact target / configuration |
| --- | --- |
| github | repository `williamwue/oh-my-stack` |

### Safe first reads

`git remote get-url origin`, `git branch --show-current`, `git rev-parse HEAD`, and `git status --short` establish the checkout. Verify the provider login and then perform only the relevant resource read:


Do not run deploy, provisioning, migrations, cleanup, or billable application flows to validate this tooling change. Record live resource reads separately from local checks. Historical `.cloud-ops` operation names and credentials are never execution inputs.

## Credentials and evidence

Authenticate on this workstation with official OAuth/CLI profiles or an explicitly approved local credential manager. Keep secrets outside Git, chat, command arguments and reports; log names/statuses only. Do not read production credentials from repository `.env*`, read/import the retired `~/.cloud-ops/secrets.env` store, copy another machine's tokens, or invoke retired credential importers. Missing credentials block the specific operation; configure fresh provider authentication when that operation is authorized. Never grant production access just to make a local check pass.

For database diagnostics, use the verified project through official MCP/CLI/SDK/API or an existing database connection, with bounded read-only queries/transactions. Routine official management does not require creating a separate reader role. Existing repository SQL scripts retain their credential and transaction contracts. Never run session-level `SET` through the Supabase 6543 transaction pooler. Structure changes require a reviewed, versioned migration and the existing migration/release approval flow.

## Release and change gates

Existing release branches, migration merge requirements, candidate SHA/tree checks, review, dry-run, regression and human approval gates remain mandatory. An official tool or skill does not override them. State the exact target, environment and requested action before authorized writes. Production deployment/configuration changes, schema migrations, deletion, rollback, credential changes and billable actions need explicit authorization for their scope. Prefer Git-tracked release sources; no ad-hoc local production snapshot.

Tooling validation does not authorize deployments, migrations or release commands with cloud side effects. Git commits, pushes and cleanup of integrated task worktrees/branches may proceed when explicitly requested by the maintainer; preserve unrelated changes and existing production/release gates. A command called dry-run, doctor, preview, verify or plan is not automatically offline: inspect its implementation first. Local verification and provider/production acceptance must be reported separately.

## Retired sources and historical records

`william-cloud-ops` and its `project-cloud-operations` skill, gateway tools, scripts, hooks and credential stores are retired. Do not activate/install the plugin, execute its scripts or import its credentials. Official provider connections are configured independently; a cached retired tool visible in an old session is not an approved route.

`cf-cutover-20260929` is a historical rehearsal snapshot. Never use it as the current application checkout, deployment source or production runbook; never execute its forward/rollback bundles. Preserve executed SQL, migration ledgers, dated evidence and original checksums. Mark retirement in a separate current document, not by rewriting checksummed history. Use the current project repository and its reviewed release process for future changes.

Existing `.cloud-ops` JSON files are retained legacy metadata/evidence only. Account/resource identifiers and provider restrictions may inform verification, but runbooks, commands, extensions, operation bindings and credential bundles are not execution or secret-loading configuration. Do not invoke the old gateway to validate them. Dated reports describe their original machine/time and are not current authentication or deployment evidence.

Existing project gates (paths from the repository root):

- `docs/release-process.md`

## Tooling acceptance (2026-10-01)

Local instructions and tool routes checked. No product cloud resources were inferred or provisioned for this checkout.

These are control-plane metadata/tool-access checks, not deployment, object-content, business-data, schema or end-to-end production acceptance. Current workstation authentication is not portable to another machine.

## 2026-10-01 管理入口

使用 [管理入口](management-entry.md) 的官方 MCP／CLI／API 和非敏感资源坐标。没有登记的业务云平台保持未启用；不根据模板代码或别的项目账号推断生产绑定。

使用本机维护者正常登录；不新增 IAM 或权限网关。只读元数据读取可按当前任务授权执行。部署、远程推送、迁移、删除、生产配置修改和付费操作遵循具体操作授权与原有发布审核要求。

凭据不进入代码、聊天、命令参数和报告；不读取仓库生产 `.env*`，不导入旧凭据。保留已有修改、历史证据、已执行 SQL 和校验和。
