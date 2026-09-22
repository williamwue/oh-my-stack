import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const git = (project, ...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

export function patchId(project, base, head) {
  const patch = execFileSync("git", ["diff", "--binary", base, head], { cwd: project });
  const result = spawnSync("git", ["patch-id", "--stable"], { cwd: project, input: patch, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "git patch-id failed");
  const id = result.stdout.trim().split(/\s+/)[0];
  assert.ok(id, "empty patch identity");
  return id;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value, options = {}) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, options);
}

export async function loadState(root) {
  return readJson(join(root, "provider.json"));
}

export async function saveState(root, state) {
  await writeJson(join(root, "provider.json"), state);
}

export function laneFor(state, id) {
  const lane = state.lanes.find((item) => item.id === Number(id));
  assert.ok(lane, `unknown change ${id}`);
  return lane;
}

export function expectedFor(id) {
  const expected = {
    51: { path: "changes/one.txt", content: "alpha\n" },
    52: { path: "changes/two.txt", content: "beta\n" },
  }[Number(id)];
  assert.ok(expected, `unknown change ${id}`);
  return expected;
}

export function liveCoordinates(project, lane) {
  const baseSha = git(project, "rev-parse", lane.baseRef);
  const headSha = git(project, "rev-parse", lane.headRef);
  return { baseSha, headSha, patchId: patchId(project, baseSha, headSha) };
}

export function verifyLane(project, lane) {
  const expected = expectedFor(lane.id);
  const actual = `${git(project, "show", `${lane.headRef}:${expected.path}`)}\n`;
  const changedPaths = git(project, "diff", "--name-only", lane.baseRef, lane.headRef).split("\n").filter(Boolean);
  return {
    expectedPath: expected.path,
    expectedContent: expected.content,
    actualContent: actual,
    changedPaths,
    passed: actual === expected.content && changedPaths.length === 1 && changedPaths[0] === expected.path,
  };
}

export function assertNativeSession(value, prefix) {
  assert.match(value ?? "", new RegExp(`^${prefix}-(?:[A-Za-z0-9][A-Za-z0-9._:-]*|\\/[A-Za-z0-9][A-Za-z0-9_/-]*)$`));
}
