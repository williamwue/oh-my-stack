import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: childEnvironment });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

test("opening-pr fallback fixture has a clean verifiable two-file commit range", async () => {
  const fixture = join(repoRoot, "evals/fixtures/opening-pr-fallback");
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-opening-pr-"));
  try {
    await cp(join(fixture, "snapshots/base/project"), join(stage, "project"), { recursive: true });
    run("git", ["init", "-q", "-b", "main"], stage);
    run("git", ["config", "user.name", "Oh My Stack Fixture"], stage);
    run("git", ["config", "user.email", "fixture@oh-my-stack.invalid"], stage);
    run("git", ["add", "."], stage);
    run("git", ["commit", "-qm", "chore: add greeting baseline"], stage);
    run("git", ["switch", "-qc", "feature/normalize-greeting"], stage);
    await rm(join(stage, "project"), { recursive: true, force: true });
    await cp(join(fixture, "snapshots/head/project"), join(stage, "project"), { recursive: true });
    run("git", ["add", "."], stage);
    run("git", ["commit", "-qm", "feat: normalize greeting names"], stage);

    const testOutput = run("node", ["--test", "test/greeting.test.mjs"], join(stage, "project"));
    assert.match(testOutput, /pass 2/);
    const paths = run("git", ["diff", "--name-only", "main..HEAD"], stage).trim().split("\n");
    assert.deepEqual(paths, ["project/lib/greeting.mjs", "project/test/greeting.test.mjs"]);
    assert.equal(run("git", ["status", "--short"], stage), "");
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});
