# pstack model configuration example

Optional Codex/T3 profile, checked against pstack 0.9.133. Confirm every model and effort in the current host before applying. This file is not installed automatically; merge it through setup-pstack and preserve existing personal settings. See ../pstack-configuration.md.

Role defaults do not change the parent conversation model or effort. Apply upstream task-difficulty adjustments and current host dispatch/capacity rules. Report unavailable models instead of silently substituting. Two models from the same provider are not cross-provider review.

Only arena and architect candidate counts are reduced. The cross-judge pool selects one judge; interrogate retains the four-model Codex default. The hook setting is omitted so an existing choice must be preserved. `panel vendors: any` permits the upstream validator to accept a Codex-only panel.

feature, refactoring: gpt-6.1-sol @medium
bug-fix: gpt-6-astra
perf-issue: gpt-6-astra
hillclimb: gpt-6-astra
judgment and prose: gpt-6-astra
strongest judgment: gpt-6-astra
how explorer: gpt-6.1-sol @medium
how explainer: gpt-6.1-sol
why investigators: gpt-6.1-sol
why synthesizer: gpt-6-astra
reflect tooling: gpt-6.1-sol @medium
reflect judgment, divergent, synthesizer: gpt-6-astra
arena runners: gpt-6.1-sol, gpt-6-astra
arena cross-judge pool: gpt-6-astra, gpt-6.1-sol, gpt-6.1-terra, gpt-6-luna
swarm workers: gpt-6.1-sol
architect runners: gpt-6.1-sol, gpt-6-astra
interrogate reviewers: gpt-6-astra, gpt-6.1-sol, gpt-6.1-terra, gpt-6-luna
thermos reviewers: gpt-6-astra
no-comments reviewer: gpt-6.1-sol

default effort: high
panel vendors: any
