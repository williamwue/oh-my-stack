import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);
const fixture = join(repoRoot, "evals", "fixtures", "babysit-drive");

test("babysit drive repairs and pushes one wave without merging", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-babysit-drive-"));
  try {
    await cp(fixture, root, { recursive: true });
    await execFileAsync(process.execPath, [join(root, "setup.mjs"), root]);
    const project = join(root, "project");
    const before = JSON.parse(await readFile(join(root, "before.json"), "utf8"));
    const broken = execFileSync(process.execPath, [
      "--input-type=module",
      "-e",
      "import { renderReceipt } from './lib/receipt.mjs'; process.stdout.write(renderReceipt('  fragile  '));",
    ], { cwd: project, encoding: "utf8" });
    assert.equal(broken, "Note: fragile");
    await writeFile(join(project, "lib", "receipt.mjs"), [
      "export function renderReceipt(note) {",
      "  return note ? `Note: ${note}` : \"No note\";",
      "}",
      "",
    ].join("\n"));
    await execFileAsync("git", ["add", "lib/receipt.mjs"], { cwd: project });
    await execFileAsync("git", ["commit", "-qm", "fix: preserve receipt note spacing"], { cwd: project });
    await execFileAsync("git", ["push", "-q", "origin", "feature/normalize-note"], { cwd: project });
    await execFileAsync(process.execPath, [join(root, "forge.mjs"), "refresh", root]);
    const finalHead = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: project })).stdout.trim();
    await writeFile(join(root, "report.json"), `${JSON.stringify({
      mode: "drive",
      frontier: 23,
      initialHead: before.feature,
      finalHead,
      pushWaves: 1,
      fixed: ["check:test", "thread:T1"],
      dismissed: [],
      forgeState: "READY",
      mergeAuthorized: false,
      result: "merge-ready",
    }, null, 2)}\n`);
    const verified = await execFileAsync(process.execPath, [join(root, "verify.mjs"), root]);
    assert.match(verified.stdout, new RegExp(`BABYSIT_DRIVE_OK=${finalHead}`));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
