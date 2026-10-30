# OMS

Build a small Windows developer starter kit. Keep components and target
environments separate. Codex, Claude Code and T3 Code are peer user-facing
targets. Shared native installations must not be removed while another target
uses them.

All prepared pstack packages include the local T3 mapping. Keep upstream
workflows/models unchanged; do not add a scheduler or role router. There is no
separate T3 repository or user-facing T3 patch switch.

Run `./tests/run.ps1`. Report mock, native-host and live-session evidence
separately. Skip unsupported environments explicitly; do not provision WSL.
Preserve existing plugins, personal configuration and book authorization.
Use native login, no credential store or application env-file loading.
