#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [action, rootArg = "."] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const statePath = join(root, "state.json");
const state = JSON.parse(await readFile(statePath, "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();
const units = [
  { id: "unit-a", file: "lib/unit-a.mjs", exportName: "unitA", expected: "alpha" },
  { id: "unit-b", file: "lib/unit-b.mjs", exportName: "unitB", expected: "beta" },
  { id: "unit-c", file: "lib/unit-c.mjs", exportName: "unitC", expected: "gamma" },
];

const snapshot = () => ({
  predicate: `${state.completed}/${state.total}`,
  active: state.active,
  expected: state.active === null ? null : units[state.completed].expected,
  head: state.head,
  done: state.completed === state.total,
});

if (action === "status") {
  process.stdout.write(`${JSON.stringify(snapshot(), null, 2)}\n`);
} else if (action === "advance") {
  assert(state.completed < state.total, "predicate already met");
  const unit = units[state.completed];
  const head = git("rev-parse", "HEAD");
  assert.notEqual(head, state.head, "advance requires one new verified commit");
  assert.equal(git("rev-parse", `${head}^`), state.head, "advance requires exactly one direct commit");
  assert.equal(git("status", "--porcelain"), "", "worktree must be clean before advance");
  assert.equal(git("diff", "--name-only", `${state.head}..${head}`), unit.file, "iteration changed the wrong path set");
  const observed = execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { ${unit.exportName} } from './${unit.file}'; process.stdout.write(${unit.exportName}());`,
  ], { cwd: project, encoding: "utf8" });
  assert.equal(observed, unit.expected, `${unit.id} did not satisfy its behavior`);
  for (const future of units.slice(state.completed + 1)) {
    assert.match(await readFile(join(project, future.file), "utf8"), /return "pending"/, `${future.id} changed before it became active`);
  }
  state.events.push({
    iteration: state.completed + 1,
    unit: unit.id,
    from: state.head,
    to: head,
    predicateBefore: `${state.completed}/${state.total}`,
    predicateAfter: `${state.completed + 1}/${state.total}`,
  });
  state.completed += 1;
  state.active = state.completed === state.total ? null : units[state.completed].id;
  state.head = head;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ advanced: unit.id, ...snapshot() }, null, 2)}\n`);
} else {
  throw new Error("usage: node controller.mjs <status|advance> <fixture-root>");
}
