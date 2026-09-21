import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);
const fixture = join(repoRoot, "evals", "fixtures", "autonomous-run");
const logHelper = join(repoRoot, "packages", "omp", "skills", "show-me-your-work", "scripts", "log.sh");

async function prepare() {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-autonomous-run-"));
  await cp(fixture, root, { recursive: true });
  const helperTarget = join(root, "project", ".agents", "skills", "show-me-your-work", "scripts", "log.sh");
  await mkdir(join(helperTarget, ".."), { recursive: true });
  await cp(logHelper, helperTarget);
  await execFileAsync(process.execPath, [join(root, "setup.mjs"), root]);
  return { root, project: join(root, "project"), helperTarget };
}

test("autonomous run advances one verified unit per iteration and stops at its predicate", async () => {
  const { root, project, helperTarget } = await prepare();
  try {
    const units = [
      { id: "unit-a", exportName: "unitA", value: "alpha" },
      { id: "unit-b", exportName: "unitB", value: "beta" },
      { id: "unit-c", exportName: "unitC", value: "gamma" },
    ];
    const commits = [];
    for (const [offset, unit] of units.entries()) {
      const status = JSON.parse((await execFileAsync(process.execPath, [join(root, "controller.mjs"), "status", root])).stdout);
      assert.equal(status.active, unit.id);
      assert.equal(status.expected, unit.value);
      await writeFile(join(project, "lib", `${unit.id}.mjs`), [
        `export function ${unit.exportName}() {`,
        `  return "${unit.value}";`,
        "}",
        "",
      ].join("\n"));
      await execFileAsync("git", ["add", `lib/${unit.id}.mjs`], { cwd: project });
      await execFileAsync("git", ["commit", "-qm", `complete ${unit.id}`], { cwd: project });
      const advanced = JSON.parse((await execFileAsync(process.execPath, [join(root, "controller.mjs"), "advance", root])).stdout);
      assert.equal(advanced.predicate, `${offset + 1}/3`);
      commits.push(advanced.head);
      await execFileAsync("bash", [
        helperTarget,
        join(root, "decisions.tsv"),
        `iteration-${offset + 1}`,
        `keep ${unit.id}`,
        "predicate advanced",
        `controller advance ${offset + 1}/3`,
        `predicate ${offset + 1}/3`,
      ]);
    }
    const terminal = JSON.parse((await execFileAsync(process.execPath, [join(root, "controller.mjs"), "status", root])).stdout);
    assert.deepEqual({ predicate: terminal.predicate, active: terminal.active, done: terminal.done }, {
      predicate: "3/3",
      active: null,
      done: true,
    });
    await writeFile(join(root, "report.json"), `${JSON.stringify({
      workflow: "autonomous-run",
      exitPredicate: "controller completed 3/3",
      budget: { maxIterations: 4, maxMinutes: 10 },
      wakeStrategy: "continuous-local-no-scheduled-wake",
      iterations: 3,
      commits,
      kept: ["unit-a", "unit-b", "unit-c"],
      discarded: [],
      decisionLog: "decisions.tsv",
      finalPredicate: "3/3",
      stopReason: "predicate-met",
      published: false,
      result: "complete",
    }, null, 2)}\n`);
    const verified = await execFileAsync(process.execPath, [join(root, "verify.mjs"), root]);
    assert.match(verified.stdout, new RegExp(`AUTONOMOUS_RUN_OK=${commits[2]}`));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("autonomous controller rejects an iteration that edits a future unit", async () => {
  const { root, project } = await prepare();
  try {
    await writeFile(join(project, "lib", "unit-a.mjs"), "export function unitA() { return \"alpha\"; }\n");
    await writeFile(join(project, "lib", "unit-b.mjs"), "export function unitB() { return \"beta\"; }\n");
    await execFileAsync("git", ["add", "lib/unit-a.mjs", "lib/unit-b.mjs"], { cwd: project });
    await execFileAsync("git", ["commit", "-qm", "batch two units"], { cwd: project });
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "controller.mjs"), "advance", root]),
      /iteration changed the wrong path set/,
    );
    const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
    assert.equal(state.completed, 0);
    assert.equal(state.events.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
