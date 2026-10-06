# OMS 0.7.0 release handoff

## Exact reviewed candidate

Repository: `github.com/williamwue/oh-my-stack`; maintainer identity verified with
`gh api user`: `williamwue`. Base and last passing remote main CI are
`d64afa5a4509dde49182db5a1c8387bd060de867`. The candidate branch is
`codex/pstack-0.15.13-20261006`, still an uncommitted isolated worktree.
Implementation inventory SHA-256:
`ee2de3dd9f6c390bd08e376a26da19ba4de2d31a9b584be612ffb7e4490147b5`.
Acceptance additions are separately preserved under this dated directory.
Five archives and their checksums are in `dist/`; the WORKTREE manifest is
review evidence, not a tag-bound release artifact.

## Prepared publication sequence

1. Obtain authority for this concrete candidate's commit, push, PR, merge,
   release and personal installation scopes. Check inventory and source anchors
   again immediately before writing; original checkout modifications stay intact.
2. Commit the candidate and acceptance in this isolated branch. Push only this
   branch to `williamwue/oh-my-stack`. Create a PR targeting main, titled
   `Port pstack 0.15.13 workflows into OMS 0.7.0`, using
   [the prepared body](pull-request-body.txt). Prefer the host-owned PR tool;
   register the actual URL with the thread using its linking tool.
3. Require fresh remote CI for the exact PR head and satisfy the repository's
   merge policy. Historical main CI is supporting baseline evidence only.
4. Merge only the authorized, reviewed candidate. Use a new clean release
   worktree at the resulting main commit; never switch or reset the dirty
   original checkout. Create tag v0.7.0 only after the exact-candidate gates.
5. Run npm ci with ignore-scripts, npm run check, the explicit complete book
   audit, and tagged deterministic builds from that clean tag. Require the
   tagged manifest to cite the exact commit and a clean checkout. Rebuild all
   five archives and checksums; do not upload the current WORKTREE manifest.
6. Publish the tag and release only under the granted scope, after remote CI
   and tagged builds pass. Download every published asset and compare it with
   the trusted local tagged build before replacing personal installations.
7. Upgrade Codex, Claude Code and OMP through their native managers, after
   inspecting their current registrations and retaining the trusted 0.6.0
   bundles. Verify each cached version, actual source, catalog, health and
   fresh-session explicit invocation; keep model mapping separate. Restart
   hosts to load the new Skill set. Keep old versioned sources for rollback.

## Personal installation coordinates

Current native lists confirm enabled 0.6.0 for all three hosts. Codex uses the
local versioned 0.6.0 marketplace under `~/.local/share/oh-my-stack/releases/`;
Claude uses its user marketplace cache; OMP uses its user plugin manager.
These remain unchanged. Verify fresh lists before a future update.

An OMP user includeSkills whitelist still lists the old Skill set, so merely
installing 0.7.0 may hide its four new entries. Preview the smallest list update
adding the new entries, preserve all user decisions, and apply only under the
personal configuration scope. The continuation smoke uses a temporary session
overlay rather than changing that list. Native OMP OpenAI OAuth is expired;
Cursor native authentication is available. Do not copy tokens between runtimes
or silently change model routes.

## Authorization boundary

The user's approved migration scope produced a local candidate. Generic
continuation has not explicitly authorized external publication or replacement
of personal plugins. The invoked poteto-mode states: “External publication
requires explicit user intent in the current request.” The repository release
runbook keeps clean tag, CI, asset and deliberate personal-install gates.
This document prepares those actions and does not execute them.
