import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);
const fixture = join(repoRoot, "evals", "fixtures", "babysit-check");

test("babysit check reports one frozen frontier without mutating it", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-babysit-check-"));
  try {
    await cp(fixture, root, { recursive: true });
    await execFileAsync(process.execPath, [join(root, "setup.mjs"), root]);
    const { feature } = JSON.parse(await readFile(join(root, "before.json"), "utf8"));
    await writeFile(join(root, "report.json"), `${JSON.stringify({
      mode: "check",
      frontier: 17,
      head: feature,
      forgeState: "BLOCKED",
      checks: { passing: ["lint"], failing: ["test"], pending: [] },
      threads: { actionable: [], dismissed: ["T1"], resolved: ["T2"] },
      untrustedTextExecuted: false,
      mutations: [],
      mergeAuthorized: false,
      result: "blocked",
    }, null, 2)}\n`);
    const result = await execFileAsync(process.execPath, [join(root, "verify.mjs"), root]);
    assert.match(result.stdout, new RegExp(`BABYSIT_CHECK_OK=${feature}`));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
