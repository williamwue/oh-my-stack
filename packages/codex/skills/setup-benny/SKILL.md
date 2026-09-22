---
name: setup-benny
description: "Configure Benny and prepare its triage and repro automations. Use when installing Benny or changing its Slack, tracker, repository, routing, control, model, or budget settings."
---

# Set up Benny

Benny is a dormant pair of automation workflows backed by the sibling **triage-issue-reports** and **reproduce-and-fix-issues** skills. Benny needs external configuration and two live host automations or durable loops. Do not assume a particular editor, cloud checkout, plugin cache, protocol link, or automation backend.

Do not create or update an automation until the user explicitly asks. Never put a secret value in skill files, prompts, or committed configuration.

## 1. Install the operational skills and shared dependencies

Do this before asking for Benny configuration and before using the host's automation facility.

Ask which repository will run the automations. Use the current package's `skills/` directory as the source. The target must expose these project-local paths, either through the host's package installation mechanism or as committed files:

- `skills/setup-benny/SKILL.md`
- `skills/triage-issue-reports/SKILL.md` and its references
- `skills/reproduce-and-fix-issues/SKILL.md` and its references
- the shared pstack skills named by the two operational skills

When copying is required:

1. Copy every file from each required skill directory to the same project-relative path.
2. Preserve destination-only files. Never delete unrelated files during install or refresh.
3. Keep user-owned configuration, feature maps, and routing maps outside the imported skill directories. Never overwrite them.
4. Inspect differences in source-managed files and merge without discarding local edits. If ownership is ambiguous, stop and ask before replacing anything.
5. Verify that both operational skills and every imported reference resolve from the target repository.

If this file is already running from the target repository, treat installation as complete only after the same verification.

Start a fresh agent rooted in the target repository and verify that these sibling skills resolve from project scope:

- `how`
- `tdd`
- `unslop`
- `principle-separate-before-serializing-shared-state`
- `principle-minimize-reader-load`
- `principle-guard-the-context-window`
- `principle-sequence-verifiable-units`
- `principle-fix-root-causes`
- `principle-prove-it-works`

Do not count a skill visible only through the current session or a user-global installation. The check must show that a fresh agent in the target repository receives the dependencies through project scope.

If project-scoped skill installation is unavailable or any shared dependency does not resolve, stop and explain the limit.

Tell the user that the operational skills and any referenced secret-free configuration must be committed on the branch used by the automation checkout before either automation is enabled. Do not commit them unless the user asks.

Once this check passes, live automation prompts may read the committed operational skills by stable repository-relative paths. They must not embed an installation cache path or copy the skill contents.

## 2. Create user-owned configuration

Create configuration outside the imported skill directories. Recommended project-local locations:

- `.benny/configuration.yaml`
- `.benny/feature-map.md`
- `.benny/routing.md`

Start from [`references/configuration.example.yaml`](references/configuration.example.yaml). Replace every placeholder and keep secrets outside the file.

A user-level path such as `~/.config/benny/configuration.yaml` or `~/.config/benny/feature-map.md` is valid only when the live automation can access it. Prefer committed, secret-free project files when an isolated checkout must read them. Otherwise paraphrase the required values into the live prompt. Reference a repository file only after the host automation facility confirms that it is committed in the repository where the automation runs. Store secrets in the host's secret manager or environment.

Start the feature map from [`../reproduce-and-fix-issues/references/feature-map.example.md`](../reproduce-and-fix-issues/references/feature-map.example.md). Fill one section for every user-facing feature the automation may reproduce. Keep it at the user point of view; do not freeze implementation details or current code paths.

Do not edit imported examples. Package refreshes may update source-managed files after conflict review, but they must never touch user-owned copies.

Use stable repository-relative paths in live automation prompts. Never reference an installation cache or a vendor-global path.

## 3. Fill the required choices

Ask for or confirm:

- Source Slack channel ID
- Optional operations or status channel ID
- Repository URL and default branch
- Triage identity or Slack user ID
- Issue tracker type, team, project, labels, and intake status
- Tracker adapter skill or host actions
- Optional routing map path
- Required control skill name
- Required user-facing feature-map path
- Status emoji strings
- Pull request URL format
- Polling and effort budgets
- Role or model choice for triage, repro, code work, and media review

Use canonical runtime roles or only model choices confirmed by the live host inventory. Do not guess a slug or carry over a private default.

The source channel, triage identity, repository, tracker adapter, control skill, and feature map must be explicit. Fail setup if any required value stays ambiguous.

Invoke the sibling **unslop** skill on final automation names, descriptions, and prompt shims before saving them.

## 4. Check integration capabilities

The triage automation needs:

- Read access to the configured source Slack channel and its threads
- Thread-reply access in that channel
- Attachment metadata and file download access when reports include media
- Search, read, create, and update access through the configured issue-tracker adapter

The repro automation needs:

- Read access to the source thread
- Thread-reply access in the source channel
- Optional post and edit access in the configured operations channel
- Repository read and history access
- A pull request action that can open a draft pull request
- The configured control-adapter skill

Prefer Slack actions exposed by the current host. The optional `BENNY_SLACK_BOT_TOKEN` may fill a narrow missing capability such as editing one operations status message or downloading an attachment. Store it in a secret manager or environment, never YAML, and never expose it to a child.

Do not use undocumented integration endpoints.

## 5. Prepare the routing map

If the user wants reroutes or owner pings:

1. Copy [`../triage-issue-reports/references/routing.example.md`](../triage-issue-reports/references/routing.example.md) to a user-owned path such as `.benny/routing.md`.
2. Replace every placeholder with public or organization-local values.
3. Keep owner pings off by default.
4. Allow a ping only for a configured feature owner or a confirmed likely regression author.

If no routing map is configured, triage may classify a report but must not guess a destination or owner.

## 6. Verify the control adapter

Read [`../reproduce-and-fix-issues/references/control-adapter.md`](../reproduce-and-fix-issues/references/control-adapter.md) and the user's completed feature map.

Confirm that the named skill can:

- Bring up the target app
- Navigate every mapped feature through the real UI
- Exercise mapped states through declared adapter actions
- Inspect state without forcing the result
- Capture screenshots
- Start and stop a recording
- Clean up its processes and temporary data

If any capability is missing, leave the repro automation disabled. It must fail closed rather than claim a reproduction it did not perform.

## 7. Prepare the live automations

Ask whether this is first-time creation or configuration of existing automations. Use the host's reviewed durable automation, scheduled task, or long-running loop facility. If none exists, produce the reviewed configuration and prompt text for manual installation, report the host limit, and do not claim either automation is live.

### First-time creation

Create one automation at a time. For each automation:

1. Read the matching operational skill as the primary source and use the finished Benny configuration as the binding for its trigger, tools, instructions, outcomes, and shared rules.
2. Turn that intent into a complete natural-language request.
3. Tell the live prompt to read and follow its exact committed operational skill path.
4. Use stable repository-relative paths and do not inline the operational skill body.
5. Let the host discover connected channels, repositories, and integrations when it supports discovery; otherwise verify each configured capability directly.
6. Confirm that the operational skills and referenced configuration are committed in the repository and branch where the automation runs.
7. Let the documented host surface handle authentication, completeness review, draft review, approval, readiness, and final handoff when it provides those gates. Recreate every missing gate explicitly when it does not.
8. Show the user the complete draft and obtain explicit approval before creation or enablement.
9. Finish the reviewed handoff for this automation before starting the next one.

Use this complete triage intent, filled from configuration:

- Name `benny-triage`.
- Read and follow `skills/triage-issue-reports/SKILL.md` for every run.
- Trigger on each new top-level report in the configured source Slack channel.
- Read the triggering thread and reply only inside it.
- Use the configured issue-tracker integration.
- Classify, inspect evidence, trace cause, dedupe, and create only clear new bugs.
- End one thread-only verdict with the configured `[benny:bug]`, `[benny:performance]`, or `[benny:other]` marker and optional tracker URL.
- Never post a source-channel root message.

After the triage handoff is complete, use this complete repro and fix intent:

- Name `benny-reproduce`.
- Read and follow `skills/reproduce-and-fix-issues/SKILL.md` for every run.
- Trigger on the same new top-level reports in the configured source Slack channel.
- Use the configured repository and default branch.
- Read the source thread and reply only inside it.
- Include pull request creation and the configured tracker, control-adapter, and feature-map requirements. Paraphrase mapped user paths and states unless the host confirms an eligible committed file in the same repository.
- Wait for a trusted triage marker before acting.
- Reproduce the exact symptom twice through the mapped real UI and capture evidence.
- Verify an existing fix without authoring over it.
- Attempt an optional bounded fix only after confirmed repro, then open a draft pull request when proof and checks pass.
- Never post a source-channel root message.

Do not duplicate the host automation facility's Slack, repository, integration, completeness, authentication, draft-review, approval, readiness, or handoff work.

### Existing automations

Finish configuration, routing, control-adapter, and feature-map validation. Use the host's supported editor or update surface. Do not search for or mutate an automation through an undocumented backend. Give the user this concise checklist when the host cannot inspect existing automations.

For the existing triage automation, update:

- Name and description
- Direct instruction to read `skills/triage-issue-reports/SKILL.md`
- New top-level Slack report trigger and source channel
- Slack thread read and reply capabilities
- Issue-tracker integration
- Paraphrased triage instructions, thread-only rule, and Benny verdict markers

For the existing repro automation, update:

- Name and description
- Direct instruction to read `skills/reproduce-and-fix-issues/SKILL.md`
- Matching Slack trigger and source channel
- Repository and default branch
- Slack thread read and reply capabilities
- Pull request action
- Tracker, control-adapter, and feature-map requirements
- Paraphrased marker wait, evidence, verification, and bounded-fix instructions

Ask the user to update each existing automation through the documented host surface. Never create replacements or duplicates merely because the host cannot inspect an existing automation.

### Creation boundary

Use only a documented, reviewed host surface. Never call an undocumented automation backend, encode draft fields in a browser URL, or build a vendor protocol deep link. Do not enable either automation until the thread-safety test passes after save.

## 8. Test thread safety

Use a test channel or harmless test report.

Before testing, confirm that both operational skills and every referenced secret-free configuration file are committed on the branch used by the automation checkout. Confirm that both live prompts point at their exact committed operational skill paths. If any check fails, stop and tell the user that the automation cannot be enabled yet.

Verify:

1. Triage stores the root `thread_ts` and posts exactly one verdict as a reply.
2. The verdict contains one configured marker.
3. Repro accepts the marker only from the configured triage identity.
4. Repro keeps the same immutable source coordinates.
5. No source-channel root message appears.
6. A delegated worker cannot use any Slack write action.
7. Missing coordinates, a deleted parent, or a failed preflight produces no post and no tracker issue.

Enable normal traffic only after all seven checks pass.
