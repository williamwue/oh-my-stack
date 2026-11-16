# pstack T3 model configuration

Astra coordinates engineering work and handles difficult diagnosis and review.
Sol handles routine implementation, exploration, judgment and prose.
Sol and Astra compare architectural designs. The cross-judge pool skips the parent model family.
Terra is reserved for explicitly requested specialist tasks, not a default role.

feature, refactoring: codex/gpt-6.1-sol @medium
bug-fix: codex/gpt-6-astra @high
perf-issue: codex/gpt-6-astra @high
hillclimb: codex/gpt-6-astra @high
judgment and prose: codex/gpt-6.1-sol @high
strongest judgment: codex/gpt-6-astra @xhigh
how explorer: codex/gpt-6.1-sol @medium
how explainer: codex/gpt-6.1-sol @medium
why investigators: codex/gpt-6.1-sol @medium
why synthesizer: codex/gpt-6-astra @high
reflect tooling: codex/gpt-6.1-sol @medium
reflect judgment, divergent, synthesizer: codex/gpt-6-astra @high
arena runners: codex/gpt-6.1-sol @high, codex/gpt-6-astra @high
arena cross-judge pool: codex/gpt-6-astra @high, codex/gpt-6.1-sol @high
swarm workers: codex/gpt-6.1-sol @medium
architect runners: codex/gpt-6.1-sol @high, codex/gpt-6-astra @high
interrogate reviewers: codex/gpt-6-astra @high, codex/gpt-6.1-sol @high
thermos reviewers: codex/gpt-6-astra @high
no-comments reviewer: codex/gpt-6.1-sol @medium

default effort: medium
