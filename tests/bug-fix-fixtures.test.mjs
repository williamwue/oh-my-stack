import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

for (const fixture of ["bug-fix-root", "bug-fix-delegated"]) {
  test(`${fixture} starts with the intended failure and passes after the bounded fix`, async () => {
    const stage = await mkdtemp(join(tmpdir(), `oh-my-stack-${fixture}-`));
    try {
      const source = join(repoRoot, "evals/fixtures", fixture, "project");
      const project = join(stage, "project");
      await cp(source, project, { recursive: true });
      const before = spawnSync("node", ["--test", "test/port.test.mjs"], {
        cwd: project,
        encoding: "utf8",
        env: childEnvironment,
      });
      assert.notEqual(before.status, 0);
      assert.match(`${before.stdout}\n${before.stderr}`, /rejects the first value above the TCP port range/);

      const implementation = join(project, "lib/port.mjs");
      const original = await readFile(implementation, "utf8");
      await writeFile(implementation, original.replace("value <= 65536", "value <= 65535"));
      const after = spawnSync("node", ["--test", "test/port.test.mjs"], {
        cwd: project,
        encoding: "utf8",
        env: childEnvironment,
      });
      assert.equal(after.status, 0, `${after.stdout}\n${after.stderr}`);
      assert.match(after.stdout, /pass 2/);
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  });
}
