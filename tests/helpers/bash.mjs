import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";

export function bashExecutable() {
  if (process.platform !== "win32") return "bash";
  const candidates = [];
  try {
    for (const git of execFileSync("where.exe", ["git"], { encoding: "utf8" }).trim().split(/\r?\n/)) {
      candidates.push(resolve(dirname(git), "..", "bin", "bash.exe"));
      candidates.push(join(dirname(git), "bash.exe"));
    }
  } catch { /* The explicit installation candidates below still apply. */ }
  for (const base of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean)) {
    candidates.push(join(base, "Git", "bin", "bash.exe"));
  }
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (directory.toLowerCase().includes("git")) candidates.push(join(directory, "bash.exe"));
  }
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Git Bash is required for shell-script tests on Windows");
  return found;
}

export function bashPath(path) {
  if (process.platform !== "win32") return path;
  const normalized = path.replaceAll("\\", "/");
  const drive = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (drive) return `/${drive[1].toLowerCase()}/${drive[2]}`;
  if (normalized.startsWith("//")) return normalized;
  throw new Error(`expected an absolute Windows path: ${path}`);
}
