import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const script = join(repoRoot, "tools", "claude-effort-hook.mjs");

function invoke(output, event) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, "--output", output], { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (part) => { stderr += part; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr }));
    child.stdin.end(JSON.stringify(event));
  });
}

test("Claude effort hook records only bounded child identity and effective effort", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-effort-hook-"));
  const output = join(root, "effort.jsonl");
  const event = { hook_event_name: "PreToolUse", agent_id: "123", agent_type: "ohmystack-how-explorer",
    tool_name: "Read", effort: { level: "high" }, tool_input: { secret: "do-not-record" } };
  assert.equal((await invoke(output, event)).code, 0);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), {
    agentId: "123", agentType: "ohmystack-how-explorer", hookEvent: "PreToolUse", tool: "Read", effort: "high",
  });
  assert.equal((await invoke(output, { ...event, agent_type: "unrelated" })).code, 0);
  assert.equal((await readFile(output, "utf8")).split("\n").filter(Boolean).length, 1);
  const symlinkPath = join(root, "symlink.jsonl");
  await symlink(output, symlinkPath);
  assert.notEqual((await invoke(symlinkPath, event)).code, 0);
});
