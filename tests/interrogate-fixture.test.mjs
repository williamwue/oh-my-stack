import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { repoRoot } from "../tools/generate.mjs";

test("interrogate fixture contains both intended reachable defects", async () => {
  const modulePath = join(repoRoot, "evals/fixtures/interrogate/project/lib/window.mjs");
  const { parseWindow } = await import(`${pathToFileURL(modulePath)}?test=${Date.now()}`);
  assert.equal(parseWindow("25"), 25);
  assert.equal(parseWindow("25px"), 25);
  assert.equal(parseWindow("0"), 0);
  assert.equal(parseWindow("-3"), -3);
  assert.equal(parseWindow("101"), 100);
  const source = await readFile(modulePath, "utf8");
  assert.match(source, /Number\.parseInt/);
  assert.doesNotMatch(source, /throw|eval|process|globalThis/);
});
