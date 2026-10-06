# Install Oh My Stack in OMP

[English](omp.md) | [简体中文](../zh-CN/install/omp.md)

OMP has a separate installation gate. Use the
[release process](../release-process.md#omp-preflight-and-isolated-native-acceptance)
for its complete commands and prerequisites.

## Check the package in an isolated profile

1. Download one release's OMP archive, `release-manifest.json`, and `SHA256SUMS`.
2. Verify the archive checksum.
3. Use the repository's `tools/install-release.mjs` to extract into a new directory owned by Oh My Stack.
4. Run `tools/check-omp-install.mjs` against that package and manifest.

These tools require the source checkout and Node.js. The linked release
procedure provides the exact commands. The native gate performs a real
install in a disposable profile, checks discovery, and uninstalls there.
It is not a zero-write dry run.

On observed OMP 18.3.0, `plugin link --dry-run` wrote state, and local-path
`--scope=project` did not isolate installation. Use a separate profile for
testing. Existing core workflow evidence does not establish live execution
of the five AIHero originals added in 0.9.0.

## Install in your own profile

After the isolated gate passes, inspect existing plugins before running:

```bash
omp plugin install /absolute/owned/path/oh-my-stack
omp plugin list --json
omp plugin doctor --json
omp read skill://prove-it-works
```

Replace the example path with the verified package directory. An existing
plugin with the same name may be replaced. Retain the previous package for
rollback. Reading `skill://prove-it-works` establishes resource access, not
execution of every workflow.

Model setup is separate. Review [support](../support-policy.md) before using
an untested workflow or model combination.
