# codex runtime binding

Prepare each worker with scripts/codex-delegation.mjs and pass its model, reasoning_effort, task_name, fork_turns=none and full role/task message to the native spawn tool. Resolve saved configuration with scripts/model-resolution.mjs. Verify observed routing from native records when available.

The native bounded GitHub helpers scripts/github-workflow.mjs, scripts/github-autopilot-provider.mjs and scripts/durable-run-state.mjs support only their documented single-PR operations and gates. Read docs/github-workflow.md before invoking them.

Role contracts preserve upstream task semantics. Follow the selected workflow's stages and review standard. Delegate the workers that workflow calls for. Host authorization and available tool contracts continue to apply.
