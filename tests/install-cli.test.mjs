// The installer finds each CLI by path or on PATH, and starts it with every
// argument intact. On Windows, npm installs claude and codex as .cmd shims,
// which Node starts only through cmd.exe. CI's Windows job runs this file.
// The installer runs on Node, so the calls go through a Node child.
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const common = pathToFileURL(fileURLToPath(new URL("../tools/install/common.mjs", import.meta.url))).href;
const windows = process.platform === "win32";
const dir = realpathSync(mkdtempSync(join(tmpdir(), "t3-pstack-cli-")));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// What cmd.exe would split, expand, or run as a second command.
const ARGS = ["plugin", "C:\\Program Files (x86)\\t3 pstack\\", 'say "hi"', "a&b|c", "100%", "%PATH%", "^caret", "!bang!", "<in>out", "x;y,z", ""];

writeFileSync(join(dir, "argv.js"), "console.log(JSON.stringify(process.argv.slice(2)));\n");
if (windows) {
  // npm's cmd-shim, as it installs a package's bin, beside the sh script npm
  // also writes, which Windows cannot run.
  writeFileSync(join(dir, "fake-cli"), '#!/bin/sh\nexec node "$(dirname "$0")/argv.js" "$@"\n');
  writeFileSync(
    join(dir, "fake-cli.cmd"),
    [
      "@ECHO off",
      "GOTO start",
      ":find_dp0",
      "SET dp0=%~dp0",
      "EXIT /b",
      ":start",
      "SETLOCAL",
      "CALL :find_dp0",
      'SET "_prog=node"',
      'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\argv.js" %*',
      "",
    ].join("\r\n"),
  );
} else {
  writeFileSync(join(dir, "fake-cli"), `#!/bin/sh\nexec node "${join(dir, "argv.js")}" "$@"\n`);
  chmodSync(join(dir, "fake-cli"), 0o755);
}

// Windows spells it Path, and a second key in the child's environment would
// not replace it.
const PATH = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";

function installer(bin, args) {
  const script =
    `import { hasCli, runCli } from ${JSON.stringify(common)};\n` +
    "const [bin, args] = [process.argv[1], JSON.parse(process.argv[2])];\n" +
    "console.log(JSON.stringify({ found: hasCli(bin), argv: JSON.parse(runCli(bin, args)) }));\n";
  const r = spawnSync("node", ["--input-type=module", "-e", script, bin, JSON.stringify(args)], {
    env: { ...process.env, [PATH]: `${dir}${delimiter}${process.env[PATH]}` },
    encoding: "utf8",
  });
  expect(r.status, r.stderr).toBe(0);
  return JSON.parse(r.stdout);
}

describe("the installer's CLI launch", () => {
  test("finds a CLI on PATH and passes every argument through unchanged", () => {
    expect(installer("fake-cli", ARGS)).toEqual({ found: true, argv: ARGS });
  });

  test("finds a CLI named by its full path", () => {
    const path = join(dir, windows ? "fake-cli.cmd" : "fake-cli");
    expect(installer(path, ["plugin", "list"])).toEqual({ found: true, argv: ["plugin", "list"] });
  });
});
