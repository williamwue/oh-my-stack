import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("recorded AIHero research and planning fixtures preserve approval gates and actual artifacts", async () => {
  await execFileAsync(process.execPath, [fileURLToPath(new URL("../evals/fixtures/aihero-spec-research/verify.mjs", import.meta.url))]);
});
