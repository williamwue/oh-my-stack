import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("repository Actions checks have only explicit manual triggers and no stable publisher", async () => {
  const files = await readdir(new URL("../.github/workflows/", import.meta.url));
  assert.deepEqual(files, ["ci.yml"]);
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const triggers = workflow.match(/^on:\n([\s\S]*?)\npermissions:/m)?.[1];
  assert.ok(triggers);
  assert.match(triggers, /^  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(triggers, /push|pull_request|release|schedule|workflow_run/);
  assert.match(workflow, /node-version: 22\.23\.3/);
  assert.doesNotMatch(workflow, /contents: write|--publish/);
});
