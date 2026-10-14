export const t3BindingArtifacts = [
  { kind: "script", path: "tools/t3-orchestration.mjs", output: "scripts/t3-orchestration.mjs" },
  { kind: "script", path: "tools/t3-receipts.mjs", output: "scripts/t3-receipts.mjs" },
  { kind: "reference", path: "src/schemas/t3-resolution.schema.json", output: "config/t3-resolution.schema.json" },
  { kind: "reference", path: "docs/t3-orchestration.md", output: "docs/t3-orchestration.md" },
  { kind: "reference", path: "docs/zh-CN/t3-orchestration.md", output: "docs/zh-CN/t3-orchestration.md" },
  { kind: "reference", path: "src/core/roles/**", output: "config/t3-role-contracts.json", generated: true },
].map((artifact) => ({ ...artifact, origin: "oh-my-stack", distribution: "core", orchestration: "t3", targets: ["codex", "claude-code"] }));

export function normalizeOrchestration(orchestration = "native") {
  if (!["native", "t3"].includes(orchestration)) throw new Error(`unknown orchestration ${orchestration}`);
  return orchestration;
}

export function usesT3(model, adapter) {
  return model.orchestration === "t3" && ["codex", "claude-code"].includes(adapter.id);
}

export function targetSelection(model, adapter) {
  return usesT3(model, adapter) ? { ...model.selection, orchestration: "t3" } : model.selection;
}

export function t3RoleContracts(model, adapter, routes) {
  return {
    schemaVersion: 1,
    orchestration: "t3",
    host: adapter.id,
    roles: Object.fromEntries(model.roles.map((role) => [role.metadata.name, {
      description: role.metadata.description,
      instructions: role.instructions.trim(),
      writes: role.metadata.writes,
      constraints: role.metadata.constraints,
    }])),
    routes: Object.fromEntries(Object.entries({ ...routes, ...model.hostRoutes }).map(([name, route]) => [name, {
      kind: route.kind,
      role: route.role,
      defaultCount: route.kind === "panel" ? route.defaultCount : 1,
    }])),
  };
}

export function t3SkillBinding(packageRoot = "../../") {
  return [
    "## T3 orchestration binding",
    "",
    "This selected package makes delegated workflow units explicitly T3-owned.",
    "This binding replaces OMS native delegation, model selection, setup, PR",
    "monitoring, browser, device, and scheduler tool instructions below.",
    "Preserve the complete source workflow, its stages, and its review standard.",
    `Read [the T3 orchestration guide](${packageRoot}docs/t3-orchestration.md) before`,
    `preparing requests with \`${packageRoot}scripts/t3-orchestration.mjs\`.`,
    "The helper prepares requests. The host invokes the actual available tools.",
    "Use `delegate_task` for every selected unit, including same-provider work.",
    "Prepare the canonical role or route and exact ordered panel entry directly",
    `from \`${packageRoot}config/t3-role-contracts.json\`. Supply the full bounded brief.`,
    "Keep each round's client request identity stable across retries. Start a",
    "fresh delegated review round with the original requirement, prior findings,",
    "responses, and unresolved objections. Do not send a new review round to",
    "the backing child thread. Async completion wakes the parent. End the turn.",
    "Read `task_status` when its result is needed during a turn. A wait timeout",
    "does not cancel work. Keep the published result separate from later child",
    "runs. A cancellation request does not prove observed cancellation.",
    "",
    "Use `orchestrator_capabilities` for exact provider instances, opaque model",
    "IDs, typed options, and supported modes. Resolve the nearest complete",
    "project `.oh-my-stack/t3/resolution.json` before the user configuration.",
    "Preview the full ordered selection. Preserve same-preset membership and",
    "order unless an explicit override replaces them. Omitted options remain",
    "inherited or unpinned. Requested settings need independent runtime evidence.",
    "Fresh panels contain defaultCount independent seats, including inherited",
    "aliases. A saved empty panel stays empty; the judge pool selects one seat.",
    "Supply the intended jobProfile when preparing workflow requests:",
    "routine, judgment, hardest, or verification, with urgent only when needed.",
    "Preparation adjusts advertised effort and speed without changing model",
    "identity. Verification retains speed; aliases remain untouched. Omission",
    "keeps older callers compatible. If an adjusted selection is rejected,",
    "retry the original configured role line in a new step before fallback.",
    "Save every first actual prepared request, including verification and no-op",
    "jobs. Its chainOrigin binds later rejections to that actual channel.",
    "Bound chains validate their next target directly; unavailable actual",
    "channels fail instead of invoking fresh-request channel fallback.",
    "All candidates share slug/typed-selector coherence checks, including",
    "observed defaults, equivalents, job changes and final explicit targets.",
    "Pass rejectedPreparedRequest to retain that choice across catalog changes.",
    "Later rejected targets retain their own modelRejections[].preparedRequest;",
    "keep earlier evidence unchanged and use each request's captured catalog.",
    "Later model fallback retains all valid refusals, including adjustments;",
    "never reselect a refused target as a default or equivalent.",
    "Verified same-origin equivalents belong to later refusal history; append",
    "errors in execution order and use the latest default/equivalent valid IDs.",
    "Use selectionPolicy for explicit channel fallbacks and ordered trail",
    "candidates. Route modelFallbacks handle evidenced model rejection only:",
    "Without a policy, defaults derive only from runnable observed catalog",
    "models on the original provider. Explicit user policy remains authoritative.",
    "Interrogate may use the closest observed equivalent; Arena and Architect",
    "keep runner replacements in the default's family. Inherited aliases do",
    "not use model fallback. Provider unavailability is a separate failure.",
    "Panel family minimums are optional user constraints, not pstack defaults.",
    "With a custom minimum, a single-seat family change cannot establish",
    "whole-panel compliance; configure the complete effective panel first.",
    "Report Arena candidates with no output as dropouts; Architect still",
    "needs two structurally distinct designs. Prefer a different-family Arena",
    "judge. A trail reviewer must differ from the reviewed model family.",
    "Unknown families or unavailable required trail reviewers stay BLOCKED.",
    "Do not override prepared",
    "targets manually. Retry the saved request; a new selection needs a new step.",
    "Record configured and selected targets, skipped candidates and reasons.",
    "Pass the saved prepared request to observe alongside the task result.",
    "Report requested versus reported provider/model and every substitution.",
    "Never attribute an agent-selected target to T3's automatic choice.",
    "Native host manifests keep their own authority. T3 setup does not rewrite",
    "them, install a daemon, change personal configuration, or authorize probes.",
    "The parent owns playbook coordination and independent review; a child",
    "owns its bounded assignment and acceptance checks. Read the prepared",
    "absolute Poteto Mode entry and its WORKFLOW.md wrapper fallback in full.",
    "",
    "Immediately link every created PR, including each stack layer, with",
    "`link_pull_request`. Inspect existing review and checks before watching.",
    "Use the actual available unsettle interface before watching a settled",
    "thread. Use `watch_pull_request`, then end the turn. Before handing work",
    "back, use `unwatch_pull_request`. A wake is news, not approval to merge.",
    "Create separate top-level threads only on an explicit user request.",
    "",
    "Prepare structured scheduler drafts only within authorized scheduling.",
    "Same-project schedules default to this thread. Another project cannot",
    "bind to it. Fresh-thread destinations need explicit user intent. Preserve",
    "native booleans and structured triggers. Do not add model overrides.",
    "Read `preview_status` before browser work. Human-owned tabs are read-only.",
    "Act only on an owned tab or an unclaimed tab with no human controller.",
    "For devices, call `device_list`, then `device_open`, and use its exact",
    "returned launcher. Open tools and fixtures do not establish UI acceptance.",
    "Report unavailable tools and live evidence separately. Preserve existing",
    "authorization, release, migration, publication, and human approval gates.",
    "",
  ].join("\n");
}

export function t3RuntimeBindingGuide(runtime) {
  const helpers = runtime === "codex" ? `
The native bounded GitHub helpers scripts/github-workflow.mjs,
scripts/github-autopilot-provider.mjs, and scripts/durable-run-state.mjs
retain only their documented operations and gates. Read docs/github-workflow.md
before invoking them. PR monitoring uses T3 watch_pull_request and
unwatch_pull_request instead of native polling helpers.
` : "";
  return `# ${runtime} runtime binding\n\n${t3SkillBinding("../")}
## Portable helpers and local evidence

Resolve the actual installed package root before invoking a supported helper.
The portable plan checker supports this exact package-aware command:

\`node "<absolute-package-root>/skills/poteto-mode/scripts/check-plan.mjs" "<absolute-plan.md>"\`

The checker validates plan structure only. It does not execute the plan or
prove live acceptance. Other source-host helpers under Skill scripts remain
reference-only unless this binding supports their exact operation.
${helpers}
For worktree cleanup, inspect git worktree list and the host's active and pinned
threads through supported interfaces. Cross-check child tasks and processes.
Do not execute Cursor worktree-audit.sh or assume Cursor transcript, SQLite,
snapshot, or storage paths apply to T3. Missing active-thread or pinned-thread
evidence leaves deletion candidates unresolved. Preserve cleanup approval gates.

Read native transcripts only through supported host tools or authorized local
records. Task summaries do not prove complete transcript access or sandboxed
read-only execution. Report unavailable transcript evidence. Cleanup skills
not exposed by the host remain unavailable; inspect the bounded diff locally.
`;
}

export function t3ModelSelectionGuide() {
  return `# Model selection

Read [the T3 orchestration guide](t3-orchestration.md). Collect exact provider
instances, model IDs, typed options and modes from orchestrator_capabilities.
Prepare requests with ../scripts/t3-orchestration.mjs. The host invokes tools.
The nearest project .oh-my-stack/t3/resolution.json shadows the whole user
configuration. Same-preset refresh preserves saved targets and ordered entries;
availability is checked when preparing the selected task.
selectionPolicy supplies explicit channel fallbacks, ordered trail candidates
and route-scoped modelFallbacks. Without a policy, prepare derives observed
defaults on the original provider; configure saves them for explicit panels.
An explicit policy replaces the whole policy, including derived defaults.
Confirmed model rejection can select a mapped
family default, then an observed equivalent from the rejection's valid IDs.
Interrogate prefers the same family; Arena and Architect runner equivalents
must stay in the default's family. Aliases do not use model fallback.
Disabled providers, invalid options and unsupported modes are separate failures.
Panel family minimums are optional custom constraints, not pstack defaults.
Arena reports no-output candidates and can proceed with the remaining outputs.
Architect still needs two structurally distinct designs. Arena's judge prefers
a different family; trail review requires one and stays BLOCKED without it.
Preserve prepared targets and record selection reasons and option changes.
Compare selections with reported task metadata through observe. A replacement
requires a new step identity; retry the saved request unchanged.
Preview the complete selection before an authorized write. Omitted options
remain inherited or unpinned. Native host manifests remain independent.
Requested settings and reported model IDs do not prove option enforcement.
Workflow callers supply jobProfile with kind routine, judgment, hardest, or
verification and optional urgent. Omitted profiles retain configured choices.
Effort moves two levels down, one down, or one up capped at max respectively.
Urgent selects advertised fast speed; other jobs use standard speed.
Verification preserves configured speed and effort. Aliases stay untouched.
Use typed options or an advertised variant of the same model identity only.
After adjusted-selection rejection, retry the original role line with a new
stepId. Keep configured and selected choices and actual errors in the audit.
`;
}
