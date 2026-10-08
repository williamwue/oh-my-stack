# Oh My Stack stable marketplace

Published release: [v0.11.2](https://github.com/williamwue/oh-my-stack/releases/tag/v0.11.2).

This generated branch contains released Codex and Claude Code payloads.
Original Skill files retain their release bytes; STABLE_RELEASE.json records provenance.

Codex:

```bash
codex plugin marketplace add williamwue/oh-my-stack --ref stable
codex plugin add oh-my-stack@oh-my-stack
```

Claude Code:

```bash
claude plugin marketplace add https://github.com/williamwue/oh-my-stack.git#stable
claude plugin install oh-my-stack@oh-my-stack --scope user
```

[Installation and update guides](https://github.com/williamwue/oh-my-stack/blob/main/docs/README.md).
