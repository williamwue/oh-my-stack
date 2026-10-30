# OMS development

OMS is a Windows developer starter kit. Keep the catalog and installer small.
Use native host CLI installation and configuration; do not bundle or rewrite
third-party skills, model policies or workflows. The only current customization
is the separately maintained pstack-claude T3 fork.

Run `./tests/run.ps1`. Separate simulated CLI tests, actual host discovery and
live model execution in reports. Skip unsupported environments explicitly; do
not provision WSL to satisfy checks.

Never adopt or uninstall pre-existing plugins automatically. Preserve personal
model sheets and project configuration. Use native account login; do not read
application env files or add a credential store. Verify repository and account
before remote writes. Keep book licensing and authorization separate from MIT.
