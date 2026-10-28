import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { agentsReport, listing } from "../../plugins/pstack/pi/agent-text.ts";

const shellTest = process.platform === "win32" ? test.skip : test;

function record(status) {
  const agent = { id: "a12345678", description: "read the transcript", subagentType: "general-purpose", startedAt: "2026-10-17T00:00:00Z" };
  return status === "running"
    ? { agent, status, parentPid: process.pid }
    : { agent, status, exitCode: 0, endedAt: "2026-10-17T00:01:00Z", finalText: "done" };
}

// The real shell parses the displayed command. Functions record argv instead
// of requiring a signed-in Pi or leaving a real tail process running.
const captureArgs = 'pi() { printf "%s\\n" "$@"; }; tail() { printf "%s\\n" "$@"; };\n';

for (const status of ["running", "completed"]) {
  for (const directory of ["plain", "Jane Doe", "O'Brien", "literal$PSTACK_TEST_EXPAND", "中文 (notes)"]) {
    shellTest(`${status} transcript command passes ${directory} as one literal path`, () => {
      const root = mkdtempSync(join(tmpdir(), "pstack-command-"));
      try {
        mkdirSync(join(root, directory));
        const transcript = join(root, directory, "session.jsonl");
        writeFileSync(transcript, "{}\n");
        const lookups = { transcriptOf: () => transcript, activityOf: () => undefined };
        const report = agentsReport([record(status)], lookups);
        const command = report.split("\n").find((line) => line.startsWith("read it: ")).slice("read it: ".length);
        const result = spawnSync("sh", ["-c", captureArgs + command], {
          cwd: root,
          encoding: "utf8",
          env: { PATH: process.env.PATH, PSTACK_TEST_EXPAND: "expanded" },
        });
        assert.equal(result.status, 0, result.stderr || result.error?.message);
        assert.deepEqual(result.stdout.trimEnd().split("\n"), [status === "running" ? "-f" : "--export", transcript]);
        assert.ok(report.includes(`transcript: ${transcript}`), "the path label is not shell-escaped");
        assert.equal(listing([record(status)], lookups)[0].sessionFile, transcript);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
}

test("does not offer a read command before the transcript exists", () => {
  const report = agentsReport([record("running")], { transcriptOf: () => undefined, activityOf: () => undefined });
  assert.ok(report.includes("transcript: not written yet"));
  assert.ok(!report.includes("read it:"));
});
