import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

function run(project) {
  return spawnSync("node", ["--test", "test/docs.test.mjs"], {
    cwd: project,
    encoding: "utf8",
    env: childEnvironment,
  });
}

test("writing cleanup rejects slop and accepts a meaning-preserving how-to", async () => {
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-writing-cleanup-"));
  try {
    const source = join(repoRoot, "evals/fixtures/writing-cleanup/project");
    const project = join(stage, "project");
    await cp(source, project, { recursive: true });

    const before = run(project);
    assert.notEqual(before.status, 0);
    assert.match(`${before.stdout}\n${before.stderr}`, /Run the service locally/);

    await writeFile(
      join(project, "docs/run-locally.md"),
      `# Run the service locally

Use this procedure to run the service on port \`4100\` and check its health.

1. Run the tests.

   \`\`\`text
   npm test
   \`\`\`

   The command prints \`4 passing, 0 failing\`.

2. Start the service.

   \`\`\`text
   node server.mjs --port 4100
   \`\`\`

   The server prints \`listening on 4100\`.

3. Check the health endpoint.

   \`\`\`text
   curl http://127.0.0.1:4100/health
   \`\`\`

   The endpoint returns \`{"status":"ok"}\`.

4. Press \`Ctrl+C\` to stop the service.
`,
    );

    const after = run(project);
    assert.equal(after.status, 0, `${after.stdout}\n${after.stderr}`);
    assert.match(after.stdout, /pass 1/);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});
