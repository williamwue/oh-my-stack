# Automatic routing setup

On a target with the generated routing binding, a general setup invocation starts
with automatic routing choices. The user need not write an enable command or
know the configuration script. A request specifically for model setup goes
straight to the model procedure below; a routing status or preview request stays
read-only. If the user already specified a routing mode or scope, reuse it and
ask only for the missing choice.

Inspect the effective routing mode and scope through the binding before offering
choices. Show that current state in the user's language, including any project
override. If inspection fails, report the error before changing configuration.
Use the host's native fixed-choice question tool when available and allowed in
the current mode. Otherwise show the same explicit text choices in the conversation
and wait for a selection. Do not ask the user to compose a configuration prompt.

Offer these routing choices:

- **Enable automatic routing**: match ordinary engineering tasks to OMS workflows.
- **Disable automatic routing**: use explicit workflow entries.
- **Keep current settings**: leave all routing configuration untouched.

Recommend keeping the current settings when routing is already enabled;
otherwise recommend enabling it. A recommendation or preselected option is not
a submitted choice. If the user chooses enable or disable and has not specified
the destination, offer these scope choices:

- **Default across projects (recommended)**: save the personal default;
  existing project overrides still take precedence.
- **Only this project**: save a project override without changing the personal
  default. Show the actual destination project before asking.

Explain that selecting a mode and scope saves that setting. Map enable to
`auto`, disable to `manual`, personal default to `user`, and this project to
`project`. Preview the selected change through the generated binding, then
apply that same choice without asking the user to repeat an enable instruction
or reconfirm a completed selection. An explicit preview-only request still
stops before apply. Keep, cancellation, and an unanswered question authorize no
routing write. A free-text answer that leaves mode or scope ambiguous requires
clarification before apply.

Report the saved scope separately from the actual effective mode and any project
override. Preserve model mappings and native hook trust. Give the exact native
hook review and fresh-session step from the binding when enabling; saving the
switch does not prove hook execution or automatic workflow selection.

A routing-only request ends here without model inventory, mapping changes, or
a paid worker probe. After a general setup invocation completes these choices,
offer **Configure models and reasoning budget** or **Finish setup**; continue
below only when model setup is selected or was already requested. Finishing or
not answering this optional question leaves model configuration untouched.
On targets without automatic routing support, skip the routing menu during
ordinary model setup. If routing was requested, report the unsupported target
without changing model configuration.
