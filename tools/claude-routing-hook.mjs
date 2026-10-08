#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runRoutingHook } from "./routing-hook.mjs";

export { routingHook } from "./routing-hook.mjs";

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runRoutingHook("claude-code");
}
