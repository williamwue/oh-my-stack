import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

export const writeJson = async (path, value, options = {}) => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, options);
};

export const load = (root) => readJson(join(root, "provider.json"));
export const save = (root, value) => writeJson(join(root, "provider.json"), value);

export const git = (project, ...args) => execFileSync("git", args, {
  cwd: project,
  encoding: "utf8",
}).trim();

export function sourceRoot(state) {
  return state.messages.find((message) =>
    message.channel === state.configuration.sourceChannelId
      && message.ts === state.configuration.sourceThreadTs
      && message.threadTs === null);
}

export function sourceReplies(state) {
  return state.messages.filter((message) =>
    message.channel === state.configuration.sourceChannelId
      && message.threadTs === state.configuration.sourceThreadTs);
}

export function assertParent(state) {
  const parent = sourceRoot(state);
  assert.ok(parent, "source parent missing");
  assert.equal(parent.deleted, false, "source parent deleted");
  return parent;
}

export function assertCapabilities(state, names) {
  for (const name of names) assert.equal(state.capabilities[name], true, `missing capability ${name}`);
}

export function assertNoSourceRootWrites(state) {
  const roots = state.messages.filter((message) =>
    message.channel === state.configuration.sourceChannelId
      && message.threadTs === null
      && message.ts !== state.configuration.sourceThreadTs);
  assert.deepEqual(roots, [], "workflow wrote a source-channel root message");
}

