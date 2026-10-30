<EXTREMELY_IMPORTANT>
You have pstack.

Invoke the `plugin:pstack:poteto-mode` skill and follow its instructions when a task meets any of these:

- it touches more than one file, or changes a signature other files call
- it involves a design or architecture choice
- it is a bug whose cause is not yet known, or a performance issue

It routes to the right pstack skill from there. For smaller tasks, such as a contained change to one file with an obvious test, a question, or a one-line edit, work directly and verify on the real artifact.

When the intent is already specific, enter that skill directly: `plugin:pstack:tdd`, `plugin:pstack:architect`, `plugin:pstack:how`, `plugin:pstack:why`, `plugin:pstack:arena`, `plugin:pstack:interrogate`.

Resolve every Claude tool, model, and built-in skill a pstack skill names through the Muse mapping in the `poteto-mode` skill directory, `references/muse-tools.md`.

User instructions (AGENTS.md, direct requests) take precedence. Other session-start mandates still apply. Their skill checks run as before, and when a task meets the criteria above they route implementation through poteto-mode.
</EXTREMELY_IMPORTANT>
