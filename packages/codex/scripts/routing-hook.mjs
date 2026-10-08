#!/usr/bin/env node

import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRouting } from "./routing.mjs";

export async function routingHook(input, { configHome, runtime = "codex", pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..") } = {}) {
  if (input?.hook_event_name !== "SessionStart"
    || !["startup", "resume", "clear", "compact"].includes(input.source)
    || typeof input.cwd !== "string" || !input.cwd) return {};
  const routing = await resolveRouting({ cwd: input.cwd, configHome, runtime });
  if (!routing.enabled) return {};
  const skill = join(pluginRoot, "skills", "oms-auto", "SKILL.md");
  await access(skill);
  return { hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: [
      "OMS automatic engineering routing is enabled. For a repository engineering request",
      `without a user-selected Skill, read the automatic entry at ${JSON.stringify(skill)}.`,
      ...(runtime === "claude-code" ? [
        "Use the Skill tool to invoke oh-my-stack:oms-auto with the user's task; read its file if the tool is unavailable.",
        "After its status check returns enabled=true, read the sibling poteto-mode/SKILL.md and select its primary workflow.",
      ] : []),
      "Run that entry's routing status command first. Only enabled=true permits reading poteto-mode or an engineering workflow.",
      "Honor an explicit Skill, a bounded child assignment, or a request to skip OMS instead.",
      "Ordinary chat, translation, and tool-use questions do not enter engineering execution.",
      "Use the smallest verified path: local direct work for narrow tasks, broader investigation",
      "or independent review only when the evidence or explicit request calls for it.",
      "Routing never adds permission to write, delegate, publish, merge, deploy, or access credentials.",
    ].join("\n"),
  } };
}

export async function runRoutingHook(runtime) {
  try {
    const chunks = [];
    let length = 0;
    for await (const chunk of process.stdin) {
      length += chunk.length;
      if (length > 65536) throw new Error("hook input exceeds 65536 bytes");
      chunks.push(chunk);
    }
    const result = await routingHook(JSON.parse(Buffer.concat(chunks).toString("utf8")), { runtime });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch {
    process.stderr.write("OMS automatic routing unavailable; use the explicit poteto-mode entry.\n");
    process.stdout.write("{}\n");
  }
}
