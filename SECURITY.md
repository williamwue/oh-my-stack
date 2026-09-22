# Security policy

## Supported versions

Oh My Stack is currently in public Alpha preparation. Security fixes target
the latest Alpha release only; older prerelease builds may not receive fixes.

## Reporting a vulnerability

After the public repository is available, use
[GitHub private vulnerability reporting](https://github.com/williamwue/oh-my-stack/security/advisories/new).
Do not include credentials, private transcripts, customer data, or unpublished
repository content in a public issue.

Include the affected version, runtime and surface, a minimal reproduction, the
permissions required, and the expected impact. If private reporting is not yet
available, retain the report until a private channel is published rather than
disclosing exploit details publicly.

## Scope

Security-sensitive components include generated instructions, packaged
scripts, installers, runtime manifests, capability fallbacks, model inventory
collection, upstream synchronization, and release archives. The detailed
trust model, supply-chain rules, and release gates are documented in the
[security model](docs/security.md).
