import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

const scriptsDirectory = import.meta.dir;

function currentInstallKey(): string {
  return createHash("sha256")
    .update(readFileSync(join(scriptsDirectory, "package.json")))
    .update("\0")
    .update(readFileSync(join(scriptsDirectory, "bun.lock")))
    .digest("hex");
}

// Codex trusts a plugin's hooks by a hash of every file in the installed
// plugin, so a node_modules beside these scripts would turn the session-start
// hook off. The dependencies live in a per-user cache instead, one directory
// per install key, and reach the scripts through NODE_PATH.
function dependencyDirectory(): string {
  const cache = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
  return join(cache, "t3-pstack", "poteto-mode-tools", currentInstallKey());
}

// The install lands in a staging directory that is renamed into place, so a
// crash or a concurrent run never leaves a partial install at the key's path.
function install(directory: string, commanderPackagePath: string): void {
  const staging = `${directory}.${process.pid}.tmp`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  for (const file of ["package.json", "bun.lock"]) {
    copyFileSync(join(scriptsDirectory, file), join(staging, file));
  }
  const result = Bun.spawnSync(
    [process.execPath, "install", "--frozen-lockfile", "--production"],
    { cwd: staging }
  );
  if (result.exitCode !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    rmSync(staging, { recursive: true, force: true });
    throw new Error(
      `bun install --frozen-lockfile exited with status ${result.exitCode}`
    );
  }
  try {
    renameSync(staging, directory);
  } catch {
    // A run that finished first keeps its install. A key directory without
    // commander, as a node_modules cleaner leaves it, is replaced.
    if (!existsSync(commanderPackagePath)) {
      rmSync(directory, { recursive: true, force: true });
      renameSync(staging, directory);
    }
  }
  rmSync(staging, { recursive: true, force: true });
  if (!existsSync(commanderPackagePath)) {
    throw new Error(
      "bun install --frozen-lockfile completed without installing commander"
    );
  }
}

export function ensureDependenciesInstalled(): void {
  const directory = dependencyDirectory();
  const nodeModulesDirectory = join(directory, "node_modules");
  const commanderPackagePath = join(
    nodeModulesDirectory,
    "commander",
    "package.json"
  );
  if (!existsSync(commanderPackagePath)) {
    install(directory, commanderPackagePath);
  }
  const nodePath = process.env.NODE_PATH;
  if (nodePath?.split(delimiter).includes(nodeModulesDirectory)) return;

  // Bun reads NODE_PATH only at startup, so the script runs again with it set.
  // execve keeps the PID, so signals and the exit status stay the script's.
  // Windows, and a Bun without execve, run the script as a child instead.
  const argv = [process.execPath, ...process.argv.slice(1)];
  const env = {
    ...process.env,
    NODE_PATH: nodePath
      ? `${nodeModulesDirectory}${delimiter}${nodePath}`
      : nodeModulesDirectory,
  };
  if (process.platform !== "win32" && process.execve) {
    process.execve(process.execPath, argv, env);
  }
  const restarted = Bun.spawnSync(argv, {
    cwd: process.cwd(),
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(restarted.exitCode ?? 1);
}
