// The npm package `oh-my-stack` carries the T3 installer and the plugin it
// installs. Pack it, then check the tarball holds every tracked file the
// installer reads and runs from it as it runs from a checkout.
import { afterAll, describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { HOME_REPO } from "../tools/install/common.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const pkgDir = join(repoRoot, "t3-installer");
const dir = realpathSync(mkdtempSync(join(tmpdir(), "oms-npm-")));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const npm = (args, cwd) => execFileSync("npm", args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
const [packed] = Object.values(JSON.parse(npm(["pack", "--json", "--pack-destination", dir], pkgDir)));
const files = new Map(packed.files.map((f) => [f.path, f]));
const tracked = (...paths) =>
  execFileSync("git", ["ls-files", "-s", ...paths], { cwd: repoRoot, encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.match(/^(\d+) \S+ \S+\t(.+)$/))
    .map(([, mode, path]) => ({ path, executable: mode === "100755" }));

describe("the oh-my-stack npm package", () => {
  test("is named oh-my-stack at VERSION", () => {
    const version = readFileSync(join(repoRoot, "VERSION"), "utf8").trim();
    expect([packed.name, packed.version]).toEqual(["oh-my-stack", version]);
  });

  test("holds every tracked installer and plugin file at its repository path", () => {
    const want = tracked("tools/install.mjs", "tools/install", "tools/plugin.mjs", "tools/frozen-hooks.json", "plugins/pstack");
    expect(want.map((f) => f.path).filter((path) => !files.has(path))).toEqual([]);
    if (process.platform !== "win32") {
      const lost = want.filter((f) => f.executable && !(files.get(f.path).mode & 0o111)).map((f) => f.path);
      expect(lost).toEqual([]);
    }
  });

  test("holds nothing outside the installer, the plugin, and the licenses", () => {
    const outside = [...files.keys()].filter(
      (path) => !/^(tools\/|plugins\/pstack\/|LICENSE|NOTICE|package\.json$)/.test(path) || path.includes("node_modules/"),
    );
    expect(outside).toEqual([]);
  });

  test("runs doctor from the unpacked tarball against this repository on GitHub", () => {
    const unpacked = join(dir, "unpacked");
    mkdirSync(unpacked);
    execFileSync("tar", ["-xzf", packed.filename], { cwd: dir });
    const home = join(dir, "home");
    mkdirSync(home);
    const env = { ...process.env, HOME: home, USERPROFILE: home };
    for (const name of ["CODEX_HOME", "CLAUDE_CONFIG_DIR", "KIRO_HOME", "T3CODE_HOME", "XDG_CONFIG_HOME"]) delete env[name];
    const r = spawnSync("node", [join(dir, "package", "tools", "install.mjs"), "doctor", "--json"], { cwd: unpacked, env, encoding: "utf8" });
    expect([0, 1], r.stderr).toContain(r.status);
    const report = JSON.parse(r.stdout);
    expect([report.version, report.source]).toEqual([packed.version, HOME_REPO]);
  });
});
