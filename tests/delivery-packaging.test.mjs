import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { deliveryRuntimeScripts, loadModel, renderTarget, repoRoot, validateRenderedTarget } from "../tools/generate.mjs";

const execute = promisify(execFile);
const sha = value => createHash("sha256").update(value).digest("hex");

test("every standalone package rejects broken public behavior and accepts repaired narrow output", async t => {
  const temporary = await realpath(await mkdtemp(join(tmpdir(), "oms-delivery-packages-")));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const model = await loadModel();
  for (const adapter of model.adapters) {
    const target = await renderTarget(join(temporary, "bundles"), model, adapter);
    await validateRenderedTarget(target, adapter, model);
    for (const script of deliveryRuntimeScripts) {
      assert.deepEqual(await readFile(join(target, "scripts", script)), await readFile(join(repoRoot, "tools", script)));
    }
    const project = join(temporary, `project-${adapter.id}`);
    await mkdir(join(project, "src"), { recursive: true });
    await mkdir(join(project, "test"));
    await mkdir(join(project, "task"));
    await writeFile(join(project, "src", "receipt.mjs"), "export function receipt(note) { return `Note: ${note}`; }\n");
    await writeFile(join(project, "test", "public-output.mjs"),
      "import assert from 'node:assert/strict'; import {receipt} from '../src/receipt.mjs'; assert.equal(receipt('  hello  '), 'Note: hello'); assert.equal(receipt('   '), '');\n");
    const plan = {
      version: 1, taskId: "public-receipt", mode: "narrow", predicate: "The public receipt trims notes and omits blank notes",
      sourceRoots: ["src"], immutablePaths: ["test/public-output.mjs"], candidates: { count: 0 },
      units: [{ id: "receipt", ownedPaths: ["src"], delegated: false }],
      checks: [{ id: "combined", argv: ["node", "test/public-output.mjs"], cwd: ".", timeoutMs: 10000, outputLimitBytes: 65536, required: true }],
      requiredCombinedCheck: "combined", narrow: { reason: "One bounded local public-output repair", omittedFullRequirements: ["design"] },
    };
    await writeFile(join(project, "task", "plan.json"), JSON.stringify(plan));
    const cli = join(target, "scripts", "delivery-evidence.mjs");
    const call = (action, args) => execute(process.execPath, [cli, action, "--root", project, ...args], { cwd: temporary });
    const frozen = JSON.parse((await call("freeze", ["--plan", "task/plan.json", "--out", "task/lock.json"])).stdout);
    async function evidence() {
      const files = [{ path: "src/receipt.mjs", sha256: sha(await readFile(join(project, "src", "receipt.mjs"))) }];
      await writeFile(join(project, "task", "evidence.json"), JSON.stringify({
        version: 1, taskId: plan.taskId, lockSha256: frozen.lockSha256, finalSource: files,
        artifacts: [], units: [{ id: "receipt", outputDigest: sha(JSON.stringify(files)) }], reviews: [],
      }));
    }
    await evidence();
    const args = ["--lock", "task/lock.json", "--expected-lock-sha256", frozen.lockSha256, "--evidence", "task/evidence.json"];
    const inspected = JSON.parse((await call("inspect", args)).stdout);
    assert.equal(inspected.acceptance, "not-assessed", adapter.id);
    const failed = await call("verify", [...args, "--run-check", "combined"]).catch(error => error);
    assert.equal(failed.code, 1, adapter.id);
    assert.equal(JSON.parse(failed.stdout).acceptance, "rejected");
    await writeFile(join(project, "src", "receipt.mjs"), "export function receipt(note) { const normalized = note.trim(); return normalized ? `Note: ${normalized}` : ''; }\n");
    await evidence();
    const passed = JSON.parse((await call("verify", [...args, "--run-check", "combined"])).stdout);
    assert.equal(passed.acceptance, "accepted", adapter.id);
    assert.equal(passed.mode, "narrow");
    assert.equal(passed.behavior.observations.length, 1);
    assert.equal(passed.external.status, "unassessed");
    await rm(join(target, "scripts", "delivery-image-diff.mjs"));
    const missing = await call("inspect", args).catch(error => error);
    assert.equal(missing.code, 1, adapter.id);
    assert.match(missing.stderr, /ERR_MODULE_NOT_FOUND/);
  }
});
