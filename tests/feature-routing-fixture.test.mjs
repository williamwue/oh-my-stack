import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

test("feature-routing starts with absent behavior and passes through the named boundary", async () => {
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-feature-routing-"));
  try {
    const source = join(repoRoot, "evals/fixtures/feature-routing/project");
    const project = join(stage, "project");
    await cp(source, project, { recursive: true });

    const before = spawnSync("node", ["--test", "test/receipt.test.mjs"], {
      cwd: project,
      encoding: "utf8",
      env: childEnvironment,
    });
    assert.notEqual(before.status, 0);
    assert.match(`${before.stdout}\n${before.stderr}`, /renders a trimmed optional customer note/);
    assert.match(before.stdout, /pass 1/);
    assert.match(before.stdout, /fail 1/);

    const normalizerPath = join(project, "lib/normalize-order.mjs");
    const normalizer = await readFile(normalizerPath, "utf8");
    await writeFile(
      normalizerPath,
      normalizer.replace(
        "customer: input.customer.trim(),",
        'customer: input.customer.trim(),\n    note: typeof input.note === "string" && input.note.trim() !== "" ? input.note.trim() : null,',
      ),
    );

    const receiptPath = join(project, "lib/receipt.mjs");
    await writeFile(
      receiptPath,
      `export function renderReceipt(order) {\n  return [\n    \`Customer: \${order.customer}\`,\n    ...(order.note ? [\`Note: \${order.note}\`] : []),\n    \`Items: \${order.items.join(", ")}\`,\n  ].join("\\n");\n}\n`,
    );

    const after = spawnSync("node", ["--test", "test/receipt.test.mjs"], {
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
