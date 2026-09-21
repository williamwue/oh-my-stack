import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

async function observedLabels(modulePath, revision) {
  const module = await import(`${pathToFileURL(modulePath).href}?revision=${revision}`);
  return [
    module.renderTask({ name: " Draft ", completed: false }),
    module.renderTask({ name: "Ship", completed: true }),
    module.renderProject({ name: " Alpha ", archived: false }),
    module.renderProject({ name: "Legacy", archived: true }),
  ];
}

test("refactoring-routing preserves the pinned behavior while removing duplication", async () => {
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-refactoring-routing-"));
  try {
    const source = join(repoRoot, "evals/fixtures/refactoring-routing/project");
    const project = join(stage, "project");
    await cp(source, project, { recursive: true });
    const implementation = join(project, "lib/labels.mjs");

    const beforeTest = spawnSync("node", ["--test", "test/labels.test.mjs"], {
      cwd: project,
      encoding: "utf8",
      env: childEnvironment,
    });
    assert.equal(beforeTest.status, 0, `${beforeTest.stdout}\n${beforeTest.stderr}`);
    assert.match(beforeTest.stdout, /pass 2/);
    const before = await observedLabels(implementation, "before");

    await writeFile(
      implementation,
      `function renderLabel(kind, name, closed) {\n  const state = closed ? "done" : "open";\n  return \`\${kind} \${name.trim()}: \${state}\`;\n}\n\nexport function renderTask(task) {\n  return renderLabel("Task", task.name, task.completed);\n}\n\nexport function renderProject(project) {\n  return renderLabel("Project", project.name, project.archived);\n}\n`,
    );

    const afterTest = spawnSync("node", ["--test", "test/labels.test.mjs"], {
      cwd: project,
      encoding: "utf8",
      env: childEnvironment,
    });
    assert.equal(afterTest.status, 0, `${afterTest.stdout}\n${afterTest.stderr}`);
    assert.match(afterTest.stdout, /pass 2/);
    const after = await observedLabels(implementation, "after");
    assert.deepEqual(after, before);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});
