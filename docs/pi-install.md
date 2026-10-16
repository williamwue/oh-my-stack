# Pi package

Pi and OMP use different native packages. The current source generates
`packages/pi` with `pi.skills` and `pi.extensions`. See
[pstack parity](pstack-parity.md) for default and optional contents.

## Load and configure

After reviewing a candidate or downloading a released Pi archive, install its
unpacked package directory using Pi's native command:

```sh
pi install /absolute/path/to/pi-package
```

This changes Pi package settings. Source generation and the OMS acceptance
commands do not install the package. `pi remove /absolute/path/to/pi-package`
removes that native package registration. Keep model configuration separately
unless you explicitly intend to remove it too.

In a new Pi session, load `setup-oh-my-stack`. It gathers the native model
inventory, previews the model choices and writes the selected scope only when
authorized. Pi resolution lives under the project's `.pi` directory or the
user's `.pi/agent` directory. It does not read OMP resolution as a substitute.

An inventory can also be collected without a model prompt:

```sh
node packages/pi/scripts/collect-model-inventory.mjs --runtime pi --output pi-inventory.json
```

On Windows, when `pi` is only a PowerShell wrapper, pass the actual executable
and installed CLI module with `--pi-bin node --pi-cli /absolute/path/to/cli.js`.
For extension-created children, set `OMS_PI_BINARY` to the executable and
`OMS_PI_CLI` to that CLI module in the parent process environment. These are
executable selectors, not credential settings. Locate the module in your Pi
installation; paths and versions differ between machines.

The `oms_delegate` tool starts one configured route member and returns a task
handle. `collect` returns its state or waits for completion; `cancel` stops it.
Writing roles need `independentCheckout: true` and a separate Git checkout.
The parent and child Git worktree roots must differ. Two active writers cannot
reserve the same worktree, even when their working directories differ.
Parent shutdown cancels owned children. The bridge does not automatically
expand panels or synthesize reviews. Native parent tool allowlists must include
`oms_delegate` if an allowlist is used.

## Verify the installed host

From the source checkout, this command tests an installed Pi CLI against an
isolated local simulated provider using the generated package:

```sh
node tools/pi-native-acceptance.mjs --cli /absolute/path/to/cli.js --package packages/pi
```

It checks extension discovery, native tool start/collect, child completion,
cancellation, parent shutdown, model selection and retry interception. It does
not verify a live account or provider. Read-only tools and a working directory
are not an operating-system sandbox. Unsupported extension-only providers and
virtual model routes produce explicit errors rather than substitutions.
