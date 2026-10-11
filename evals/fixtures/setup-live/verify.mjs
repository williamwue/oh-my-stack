import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const packageRoot = join(root, "package");
const workspace = join(root, "workspace");
const output = join(workspace, "configured");

const inventoryRaw = await readFile(join(workspace, "inventory.json"));
const inventory = JSON.parse(inventoryRaw);
const descriptor = JSON.parse(await readFile(join(packageRoot, "config", "runtime-resolution.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(output, "oh-my-stack.resolution.json"), "utf8"));

assert.equal(inventory.schemaVersion, 1);
assert.equal(inventory.runtime, descriptor.target);
assert.ok(!Number.isNaN(Date.parse(inventory.observedAt)));
assert.ok(inventory.source.length > 0);
assert.ok(inventory.models.length > 0);

const selected = inventory.models.find((model) =>
  ["low", "medium", "high"].every((effort) => model.reasoningEfforts.includes(effort))
);
assert.ok(selected, "inventory needs one model that supports low, medium, and high");

assert.equal(manifest.owner, "oh-my-stack");
assert.equal(manifest.target, descriptor.target);
assert.equal(manifest.observedInventory.observedAt, inventory.observedAt);
assert.equal(manifest.observedInventory.source, inventory.source);
assert.equal(
  manifest.observedInventory.sha256,
  createHash("sha256").update(inventoryRaw).digest("hex"),
);
assert.deepEqual(manifest.workloads, {
  fast: { model: selected.id, reasoning: "high" },
  balanced: { model: selected.id, reasoning: "high" },
  deep: { model: selected.id, reasoning: "high" },
});
assert.equal(manifest.budget, "medium");
assert.equal(manifest.budgetPolicy.level, "high");

const extension = descriptor.adapter.format === "toml" ? "toml" : descriptor.adapter.format === "json" ? "json" : "md";
const roleNames = descriptor.roles.map((role) => role.name).sort();
assert.deepEqual(Object.keys(manifest.roles).sort(), roleNames);
assert.deepEqual(Object.keys(manifest.routes).sort(), Object.keys(descriptor.routes).sort(), "configured route membership drift");
const expectedFiles = roleNames.map((name) => `agents/${name}.${extension}`);

for (const [name, specification] of Object.entries(descriptor.routes)) {
  const route = manifest.routes[name];
  assert.equal(route.kind, specification.kind, `${name}: route kind drift`);
  assert.equal(route.role, specification.role, `${name}: route role drift`);
  assert.equal(route.entries.length, specification.kind === "panel" ? specification.defaultCount : 1, `${name}: fresh membership drift`);
  if (specification.kind === "panel") assert.equal(route.entries.length, 2, `${name}: fresh panels have two members`);
  for (const [index, entry] of route.entries.entries()) {
    const agent = `ohmystack-${name.replaceAll(".", "-")}${route.kind === "panel" ? `-${index + 1}` : ""}`;
    assert.equal(entry.agent, agent, `${name}: ordered agent selector drift`);
    assert.equal(entry.model, selected.id, `${name}: selected model drift`);
    assert.equal(entry.reasoning, manifest.workloads[specification.workload].reasoning, `${name}: selected effort drift`);
    expectedFiles.push(`agents/${agent}.${extension}`);
  }
}
assert.deepEqual(Object.keys(manifest.ownedFiles).sort(), expectedFiles.sort(), "configured owned-file membership drift");

for (const role of descriptor.roles) {
  const expectedEffort = manifest.workloads[role.workload].reasoning;
  const resolution = manifest.roles[role.name];
  assert.equal(resolution.model, selected.id);
  assert.equal(resolution.reasoning, expectedEffort);
  assert.equal(resolution.diversityEstablished, false);
  const text = await readFile(join(output, "agents", `${role.name}.${extension}`), "utf8");
  assert.ok(text.includes(selected.id));
  assert.ok(text.includes(expectedEffort));
}

assert.equal(await readFile(join(output, "keep-me.txt"), "utf8"), "user-owned\n");
assert.deepEqual((await readdir(join(output, "agents"))).sort(), expectedFiles.map((path) => path.slice("agents/".length)));
for (const path of expectedFiles) {
  const bytes = await readFile(join(output, path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.ownedFiles[path], `${path}: configured hash drift`);
  assert.ok(bytes.toString("utf8").includes(selected.id), `${path}: selected model missing`);
  assert.ok(bytes.toString("utf8").includes("high"), `${path}: selected effort missing`);
}

const allowed = new Set([
  "workspace/inventory.json",
  "workspace/configured/oh-my-stack.resolution.json",
  ...expectedFiles.map((path) => `workspace/configured/${path}`),
]);
const status = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
  cwd: root,
  encoding: "utf8",
});
const changed = status.trim().split("\n").filter(Boolean).map((line) => line.slice(3));
assert.deepEqual(new Set(changed), allowed);

console.log(JSON.stringify({
  runtime: inventory.runtime,
  source: inventory.source,
  observedAt: inventory.observedAt,
  inventoryCount: inventory.models.length,
  selectedModel: selected.id,
  roleCount: roleNames.length,
  routeCount: Object.keys(manifest.routes).length,
  ownedFileCount: expectedFiles.length,
  changedPaths: changed.sort(),
}, null, 2));
