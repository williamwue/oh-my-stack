import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);
const fixture = join(repoRoot, "evals", "fixtures", "session-pickup");

test("pause checkpoint survives a cold session pickup without redoing completed work", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-session-pickup-"));
  try {
    await cp(fixture, root, { recursive: true });
    await execFileAsync(process.execPath, [join(root, "setup.mjs"), root]);
    const project = join(root, "project");
    const before = JSON.parse(await readFile(join(root, "before.json"), "utf8"));

    await execFileAsync(process.execPath, [
      "--test",
      "--test-name-pattern=display preserves operator-authored spacing",
      "test/labels.test.mjs",
    ], { cwd: project });
    await execFileAsync("git", ["add", "lib/labels.mjs"], { cwd: project });
    await execFileAsync("git", [
      "commit",
      "-qm",
      "wip: preserve label display spacing",
      "-m",
      "Pending: labelKey creates lowercase hyphenated keys",
    ], { cwd: project });
    const checkpointHead = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: project })).stdout.trim();
    await writeFile(join(root, "checkpoint.json"), `${JSON.stringify({
      schemaVersion: 1,
      kind: "oh-my-stack-resume",
      objective: "Preserve display labels and add stable label keys.",
      repository: {
        branch: "feature/labels",
        base: before.main,
        head: checkpointHead,
        clean: true,
      },
      completed: [{
        id: "display-preservation",
        evidence: "display preserves operator-authored spacing",
      }],
      pending: [{
        id: "label-key",
        nextAction: "Implement labelKey without changing displayLabel or tests.",
      }],
      verification: {
        passing: ["display preserves operator-authored spacing"],
        failing: ["labelKey creates lowercase hyphenated keys"],
      },
      keyFiles: ["lib/labels.mjs", "test/labels.test.mjs"],
      gotchas: ["Display labels preserve surrounding spaces."],
      firstAction: "Run node resume-check.mjs . before editing.",
    }, null, 2)}\n`);

    const paused = await execFileAsync(process.execPath, [join(root, "verify-pause.mjs"), root]);
    assert.match(paused.stdout, new RegExp(`PAUSE_CHECKPOINT_OK=${checkpointHead}`));
    const anchored = await execFileAsync(process.execPath, [join(root, "resume-check.mjs"), root]);
    assert.match(anchored.stdout, new RegExp(`RESUME_ANCHOR_OK=${checkpointHead}`));

    await writeFile(join(project, "unexpected.txt"), "stale\n");
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "resume-check.mjs"), root]),
      /checkpoint expected a clean worktree/,
    );
    await rm(join(project, "unexpected.txt"));

    await writeFile(join(project, "lib", "labels.mjs"), [
      "export function displayLabel(label) {",
      "  return label;",
      "}",
      "",
      "export function labelKey(label) {",
      "  return label.trim().toLowerCase().replace(/\\s+/g, \"-\");",
      "}",
      "",
    ].join("\n"));
    await execFileAsync(process.execPath, ["--test", "test/labels.test.mjs"], { cwd: project });
    await execFileAsync("git", ["add", "lib/labels.mjs"], { cwd: project });
    await execFileAsync("git", ["commit", "-qm", "complete label key behavior"], { cwd: project });
    const finalHead = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: project })).stdout.trim();
    await writeFile(join(root, "result.json"), `${JSON.stringify({
      workflow: "session-pickup",
      checkpointHead,
      finalHead,
      inherited: ["display-preservation"],
      newlyCompleted: ["label-key"],
      redone: [],
      verification: [
        "display preserves operator-authored spacing",
        "labelKey creates lowercase hyphenated keys",
      ],
      published: false,
      result: "complete",
    }, null, 2)}\n`);
    const verified = await execFileAsync(process.execPath, [join(root, "verify-final.mjs"), root]);
    assert.match(verified.stdout, new RegExp(`SESSION_PICKUP_OK=${finalHead}`));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
