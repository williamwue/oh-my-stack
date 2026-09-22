#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { git, saveProgram } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
for (const directory of ["assignments", "briefs", "inbox", "outputs", "verdicts", join("project", "delivered")]) {
  await mkdir(join(root, directory), { recursive: true });
}
await writeFile(join(project, "delivered", ".keep"), "");
git(project, "init", "-q", "-b", "main");
git(project, "config", "user.name", "Oh My Stack Fixture");
git(project, "config", "user.email", "fixture@oh-my-stack.invalid");
git(project, "add", ".");
git(project, "commit", "-qm", "program base");

await saveProgram(root, {
  schemaVersion: 1,
  programId: "migration-four",
  generation: 1,
  predicate: { target: 4, measurement: "node verify.mjs ." },
  wallClockBudgetMinutes: 30,
  landingReservePercent: 30,
  maxInFlight: 2,
  retryLimit: 1,
  authority: { localIntegration: true, externalPublication: false },
  standingOrders: "standing-orders.md",
  order: ["pilot", "alpha", "beta", "join"],
  units: [
    { id: "pilot", track: "foundation", dependencies: [], scope: "outputs/pilot.txt", state: "ready" },
    { id: "alpha", track: "parallel", dependencies: ["pilot"], scope: "outputs/alpha.txt", state: "blocked" },
    { id: "beta", track: "parallel", dependencies: ["pilot"], scope: "outputs/beta.txt", state: "blocked" },
    { id: "join", track: "integration", dependencies: ["alpha", "beta"], scope: "outputs/join.txt", state: "blocked" }
  ],
  processedInbox: [],
  drains: [],
  integrations: [],
  gates: []
});
console.log(`ORCHESTRATE_FIXTURE_READY=${git(project, "rev-parse", "HEAD")}`);
