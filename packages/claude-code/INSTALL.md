# OMS installation and updates

This is the Oh My Stack distribution. For installation, update, uninstall,
marketplace identity and version checks, follow
https://github.com/williamwue/oh-my-stack/blob/main/README.md and the matching
OMS release manifest at https://github.com/williamwue/oh-my-stack/releases/latest.
Those packaging instructions take precedence over upstream pstack installation
examples. Keep the OMS identity `oh-my-stack`. Do not install a second pstack
plugin as an OMS update. Restart the host and verify the loaded path and version.

Model setup remains upstream-owned: existing pstack-models.md follows its normal
rules. Installation does not migrate or alter any personal model file.
The AIHero setup skill may configure tracker/docs only when explicitly invoked;
its original install examples are not an instruction to replace this OMS package.
