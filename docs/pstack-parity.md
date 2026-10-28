# Distribution boundary

The current direct source is fixed pstack-claude, with latest official pstack
pinned independently for comparison. See the [reviewed transition](maintainers/upstream-0.21.0.md).
Sources are immutable under upstream/vendor; source receipts record full commits,
Git blobs, modes and SHA256. tools/generate.mjs owns packages. Only its packaging
identity/namespace/installation pointers and the centralized T3 mapping adapt
upstream behavior. Original AIHero skill directories are copied with complete
resources; prototype is an explicit wayfinder dependency. They are independent
extensions, not mandatory pstack stages. Old parity derivations and module
registries describe the retained historical OMS implementation.
