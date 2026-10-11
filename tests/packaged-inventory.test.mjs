import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "../tools/generate.mjs";
import { validateDerivedResourceClosure } from "../tools/validate.mjs";

test("selected upstream skills retain every derived resource on all four hosts", async () => {
  await validateDerivedResourceClosure(repoRoot);
});

test("all host collectors retain the native Pi inventory import closure", () => {
  for (const host of ["codex", "claude-code", "omp", "pi"]) {
    const result = execFileSync(process.execPath, ["--input-type=module", "-e",
      "const m = await import('./pi-inventory.mjs'); if(typeof m.collectPiInventory !== 'function') process.exit(1);"],
    { cwd: join(repoRoot, "packages", host, "scripts"), encoding: "utf8", windowsHide: true });
    assert.equal(result, "");
  }
});
