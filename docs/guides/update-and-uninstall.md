# Update and uninstall

Use the [current install guide](../../README.md#install) for the host's stable
marketplace. Inspect the installed source and scope before updating. Preserve
personal pstack-models.md and unrelated files; never remove a whole host directory.
For archive installations, use tools/install-release.mjs with the matching
release manifest to plan, verify or update the dedicated OMS directory. It
checks ownership and archive inventories and restores the backup after a failed
replacement. Native plugin registration/uninstall remains the host's own action.
OMP and old OMS routing/model configuration are historical and are not migrated.
