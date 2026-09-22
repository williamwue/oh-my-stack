import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const git = (project, ...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

export function patchId(project, base, head) {
  const patch = execFileSync("git", ["diff", "--binary", base, head], { cwd: project });
  const result = spawnSync("git", ["patch-id", "--stable"], { cwd: project, input: patch, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "git patch-id failed");
  const id = result.stdout.trim().split(/\s+/)[0];
  if (!id) throw new Error("empty patch identity");
  return id;
}

export async function loadState(root) {
  return JSON.parse(await readFile(join(root, "provider.json"), "utf8"));
}

export function liveCoordinates(project, pullRequest) {
  const baseSha = git(project, "rev-parse", pullRequest.baseRef);
  const headSha = git(project, "rev-parse", pullRequest.headRef);
  return { baseSha, headSha, patchId: patchId(project, baseSha, headSha) };
}

export async function loadVerdict(root, id) {
  try {
    return JSON.parse(await readFile(join(root, "verdicts", `${id}.json`), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function assertFreshVerdict(pullRequest, live, verdict) {
  if (!verdict) throw new Error(`missing independent verdict for PR ${pullRequest.id}`);
  if (!["PASS", "PASS+NOTES"].includes(verdict.verdict)) throw new Error(`non-passing verdict for PR ${pullRequest.id}`);
  if (verdict.reviewerSession === pullRequest.writerSession) throw new Error(`writer cannot review PR ${pullRequest.id}`);
  if (verdict.baseSha !== live.baseSha) throw new Error(`stale base revision for PR ${pullRequest.id}`);
  if (verdict.headSha !== live.headSha) throw new Error(`stale head revision for PR ${pullRequest.id}`);
  if (verdict.patchId !== live.patchId) throw new Error(`stale patch identity for PR ${pullRequest.id}`);
}
