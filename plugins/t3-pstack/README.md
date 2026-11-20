# t3-pstack

Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack) for T3 Code: rigorous agent workflows whose subagents, panels, schedules, and PR watches dispatch through T3's orchestration, so a panel can mix Claude, GPT, and Grok.

Tell `poteto-mode` your goal and it runs the workflow that fits: reproduce and root-cause a bug, sketch a design with `architect`, race candidates in `arena`, review a diff with `interrogate`, cut prose with `unslop`. It keeps code concise, simple, and verified, and it reports what it checked.

## What it contains

- Skills: upstream's skill text, with its Cursor mechanics rewritten for T3. Each appears as `/t3-pstack:<name>`.
- Agents: `poteto-agent`, `comment-sicko`, and the two thermo-nuclear reviewers, each read by path in a `delegate_task` brief.
- A session-start hook that tells each chat when to enter `poteto-mode`, unless your model sheet turns it off.
- Local scripts for watching pull requests, checking plans, and auditing worktrees.

## Data handling

t3-pstack has no server or telemetry. Anything its skills ask your agent to read, including session transcripts, goes to your model provider. Scripts run locally, and PR tools use your GitHub CLI login.

## Links

- [Install and setup](https://github.com/chhoumann/t3-pstack#readme)
- [Issues and support](https://github.com/chhoumann/t3-pstack/issues)
- [Security policy](https://github.com/chhoumann/t3-pstack/blob/main/SECURITY.md)

## License

MIT. Original pstack © 2026 Lauren Tan; imported cursor-team-kit and thermos skills © 2026 Cursor; T3 modifications © 2026 Christian Bager Bach Houmann. See [NOTICE.md](https://github.com/chhoumann/t3-pstack/blob/main/NOTICE.md).
