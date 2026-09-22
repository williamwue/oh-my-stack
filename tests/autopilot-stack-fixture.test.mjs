import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const fixture = join(process.cwd(), "evals", "fixtures", "autopilot-stack");
const command = (script, root, args) => args.length === 0
  ? [join(fixture, script), root]
  : [join(fixture, script), args[0], root, ...args.slice(1)];
const run = (script, root, ...args) => execFileSync(process.execPath, command(script, root, args), { encoding: "utf8" }).trim();
const attempt = (script, root, ...args) => spawnSync(process.execPath, command(script, root, args), { encoding: "utf8" });

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-autopilot-stack-"));
  try {
    run("setup.mjs", root);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function review(root, id, lane, reviewer) {
  assert.match(run("review.mjs", root, "verify", String(id), lane), /"passed": true/);
  assert.match(run("review.mjs", root, "record", String(id), lane, reviewer), /:PASS$/);
}

test("autopilot stack builds, independently verifies, and delivers an unmerged linear chain", async () => {
  await withFixture(async (root) => {
    run("owner.mjs", root, "build", "51", "owner-/root/change_51");
    run("owner.mjs", root, "build", "52", "owner-/root/change_52");
    run("owner.mjs", root, "self-proof", "51");
    run("owner.mjs", root, "self-proof", "52");

    review(root, 51, "gates", "reviewer-/root/change_51_gates");
    review(root, 51, "live", "reviewer-/root/change_51_live");
    review(root, 52, "gates", "reviewer-/root/change_52_gates");
    review(root, 52, "live", "reviewer-/root/change_52_live");
    run("review.mjs", root, "aggregate", "51", "root-coordinator");
    run("review.mjs", root, "aggregate", "52", "root-coordinator");

    run("topology.mjs", root, "append", "51", "root-coordinator");
    run("topology.mjs", root, "append", "52", "root-coordinator");
    assert.match(run("topology.mjs", root, "report"), /^AUTOPILOT_STACK_REPORT_OK=/);
    assert.match(run("verify.mjs", root), /^AUTOPILOT_STACK_OK=/);
  });
});

test("autopilot stack rejects missing verdicts, owner topology writes, and changed reviewed heads", async () => {
  await withFixture(async (root) => {
    run("owner.mjs", root, "build", "51", "owner-/root/change_51");
    run("owner.mjs", root, "self-proof", "51");
    assert.notEqual(attempt("topology.mjs", root, "append", "51", "root-coordinator").status, 0);

    review(root, 51, "gates", "reviewer-/root/change_51_gates");
    review(root, 51, "live", "reviewer-/root/change_51_live");
    run("review.mjs", root, "aggregate", "51", "root-coordinator");
    assert.notEqual(attempt("topology.mjs", root, "append", "51", "owner-/root/change_51").status, 0);

    execFileSync("git", ["checkout", "-q", "change-51"], { cwd: join(root, "project") });
    execFileSync("git", ["commit", "--allow-empty", "-qm", "move reviewed head"], { cwd: join(root, "project") });
    assert.notEqual(attempt("topology.mjs", root, "append", "51", "root-coordinator").status, 0);
  });
});
