1. **warning** — `tools/generate.mjs:633`
   **Finding:** The handoff binding excludes optional performance delegates.
   **Evidence:** Directly invoked Codex `perf-issue` and `hillclimb` receive the native delegation binding and configured implementer routes, but neither receives the new handoff contract because their metadata lacks `agents.spawn`. Their generated instructions therefore omit fresh repair sessions, consolidated directives, replacement fencing, and host-owned orchestration precedence. The generator’s delegation predicate already includes these workflows separately.
   **Suggestion:** Use the same delegation eligibility predicate for handoff generation, and test these two direct entries.

2. **warning** — `src/core/skills/opening-a-pr/SKILL.md:29`, interacting with `tools/generate.mjs:508`
   **Finding:** Generated Codex instructions contain competing PR creation mandates.
   **Evidence:** The new procedure prefers the host-owned PR tool to preserve task association. However, the generated preamble still directs authorized GitHub creation through `executeGitHubWorkflow(request)`. That implementation creates the PR through `gh api` (`tools/github-autopilot-provider.mjs:373`), bypassing the host-owned creation tool. When both are available, the instructions provide no precedence rule.
   **Suggestion:** Explicitly make the bounded adapter the fallback for operations unavailable through the host-owned tool, while preserving its existing authorization gates.

Reviewed scope digest: `63cb1e0be791386cc0560f1d08684da42ce71539e940548f16c37b5df2e12d3f`. All 110 hashes matched before and after review.

Checks: focused tests passed **4/4**; generated-package check passed. Full validation stopped on a non-frozen native acceptance receipt containing an absolute macOS home path. Native three-host behavioral evidence was outside this frozen review and remains unverified here.

ROLE_POLICY=independent-frozen-review
