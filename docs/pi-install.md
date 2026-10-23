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
Use `action: "list"` to inspect only the current manager's owned handles,
including running count, cached activity phase, last tool name/ID/running flag,
message/tool counts and native session identity. The list omits output and tool
arguments; `collect` returns bounded output for one explicit handle. Snapshots
are copies and carry the last observation time rather than implying a fresh
host scan. Completed and cancelled handles remain available within the existing
retained-task bound; shutdown still stops running children.

By default `--no-session` keeps children ephemeral. An explicit start
`sessionDir` must name an existing absolute directory; this opts that child into
Pi's native session persistence there. The bridge reports the `sessionId` and
absolute `.jsonl` `sessionFile` returned by native `get_state`, never a guessed
filename or a directory scan. A file path is host metadata, not proof that its
contents or all model behavior were verified. No session contents are read by
listing. Missing session paths remain null. Persistence is never enabled by
listing, collection or installation.

Failed terminal tasks set Pi's native tool error flag. Collecting a cancelled
task also reports an error because no completed result exists. A successful
cancel command, a running task and an empty list remain successful operations;
the full task record stays available in the result details.

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

It checks extension discovery, successful and failed native tool collection,
start/list, observed tool
activity, explicit session-file persistence, child completion,
cancellation, parent shutdown, model selection and retry interception. It does
not verify a live account or provider. Read-only tools and a working directory
are not an operating-system sandbox. Unsupported extension-only providers and
virtual model routes produce explicit errors rather than substitutions.
