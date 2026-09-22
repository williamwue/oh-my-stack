#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
await writeFile(join(root, "state.json"), `${JSON.stringify({
  schemaVersion: 1,
  providerRevision: "provider-r1",
  providerState: "WAITING",
  releaseCount: 0,
  completionCount: 0,
  measurementCount: 0,
}, null, 2)}\n`, { flag: "wx" });
console.log("AUTONOMOUS_WAKE_READY=provider-r1");
