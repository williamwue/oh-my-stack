#!/usr/bin/env node

import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { isAbsolute } from "node:path";

const output = process.argv[1] && process.argv[2] === "--output" ? process.argv[3] : null;
if (!output || !isAbsolute(output) || process.argv.length !== 4) {
  console.error("usage: claude-effort-hook.mjs --output ABSOLUTE-JSONL-PATH");
  process.exitCode = 1;
} else {
  try {
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk;
      if (input.length > 1_000_000) throw new Error("hook input exceeded 1 MB");
    }
    const event = JSON.parse(input);
    if (event.hook_event_name === "PreToolUse" && /^(?:ohmystack-[a-z0-9-]+|oh-my-stack:[a-z0-9-]+)$/.test(event.agent_type ?? "")) {
      const bounded = value => typeof value === "string" && value.length <= 256 ? value : null;
      const record = {
        agentId: bounded(event.agent_id),
        agentType: bounded(event.agent_type),
        hookEvent: event.hook_event_name,
        tool: bounded(event.tool_name),
        effort: ["low", "medium", "high", "xhigh", "max"].includes(event.effort?.level) ? event.effort.level : null,
      };
      let before;
      try { before = await lstat(output); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (before?.isSymbolicLink()) throw new Error("refusing to write through a symbolic link");
      const file = await open(output,
        constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | (constants.O_NOFOLLOW ?? 0), 0o600);
      try {
        const [opened, current] = await Promise.all([file.stat(), lstat(output)]);
        if (current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino) {
          throw new Error("refusing to write through a changed or symbolic-link path");
        }
        await file.writeFile(`${JSON.stringify(record)}\n`);
      }
      finally { await file.close(); }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
