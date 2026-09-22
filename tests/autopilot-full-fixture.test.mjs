import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const fixture = join(process.cwd(), "evals", "fixtures", "autopilot-full");
const command = (script, root, args) => args.length === 0
  ? [join(fixture, script), root]
  : [join(fixture, script), args[0], root, ...args.slice(1)];
const run = (script, root, ...args) => execFileSync(process.execPath, command(script, root, args), { encoding: "utf8" }).trim();
const attempt = (script, root, ...args) => spawnSync(process.execPath, command(script, root, args), { encoding: "utf8" });

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-autopilot-full-"));
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

function swarm(root, id) {
  review(root, id, "gates", `reviewer-/root/change_${id}_gates`);
  review(root, id, "live", `reviewer-/root/change_${id}_live`);
  review(root, id, "regression", `reviewer-/root/change_${id}_regression`);
  run("review.mjs", root, "aggregate", String(id), "root-coordinator");
}

test("autopilot full keeps verdicts in root while each owner lands its own current change", async () => {
  await withFixture(async (root) => {
    run("owner.mjs", root, "build", "61", "owner-/root/change_61");
    run("owner.mjs", root, "build", "62", "owner-/root/change_62");
    run("owner.mjs", root, "self-proof", "61", "owner-/root/change_61");
    run("owner.mjs", root, "self-proof", "62", "owner-/root/change_62");

    swarm(root, 61);
    const first = run("root.mjs", root, "countersign", "61", "root-coordinator").split(":").at(-1);
    run("owner.mjs", root, "merge", "61", "owner-/root/change_61", first);

    run("owner.mjs", root, "rebase", "62", "owner-/root/change_62");
    run("owner.mjs", root, "self-proof", "62", "owner-/root/change_62");
    swarm(root, 62);
    const second = run("root.mjs", root, "countersign", "62", "root-coordinator").split(":").at(-1);
    run("owner.mjs", root, "merge", "62", "owner-/root/change_62", second);

    assert.match(run("root.mjs", root, "report"), /^AUTOPILOT_FULL_REPORT_OK=/);
    assert.match(run("verify.mjs", root), /^AUTOPILOT_FULL_OK=/);
  });
});

test("autopilot full rejects uncountersigned, root-executed, stale, and operator-held merges", async () => {
  await withFixture(async (root) => {
    assert.notEqual(attempt("owner.mjs", root, "build", "63", "owner-/root/change_63").status, 0);
    run("owner.mjs", root, "build", "61", "owner-/root/change_61");
    run("owner.mjs", root, "self-proof", "61", "owner-/root/change_61");
    assert.notEqual(attempt("owner.mjs", root, "merge", "61", "owner-/root/change_61", "invented").status, 0);
    swarm(root, 61);
    const token = run("root.mjs", root, "countersign", "61", "root-coordinator").split(":").at(-1);
    assert.notEqual(attempt("owner.mjs", root, "merge", "61", "root-coordinator", token).status, 0);
    execFileSync("git", ["checkout", "-q", "change-61"], { cwd: join(root, "project") });
    execFileSync("git", ["commit", "--allow-empty", "-qm", "move authorized head"], { cwd: join(root, "project") });
    assert.notEqual(attempt("owner.mjs", root, "merge", "61", "owner-/root/change_61", token).status, 0);
  });
});
