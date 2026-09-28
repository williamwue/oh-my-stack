import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { DurableRunState } from "../../tools/durable-run-state.mjs";

const [, , action, root, generationArg] = process.argv;
const storePath = join(root, "runs", "run-1.json");
const generation = Number(generationArg ?? 2);

async function run() {
  if (action === "write-completed") {
    const run = await DurableRunState.create({ storePath, storeRoot: root, runId: "run-1", generation: 2 });
    await run.append({ eventId: "evt-start", generation: 2, revision: 1, type: "start", payload: { work: "pilot" } });
    await run.append({ eventId: "evt-checkpoint", generation: 2, revision: 2, type: "checkpoint", payload: { step: "prepared" } });
    return (await run.append({ eventId: "evt-complete", generation: 2, revision: 3, type: "completed", payload: { result: "ok" } })).state;
  }
  if (action === "write-waiting") {
    const run = await DurableRunState.create({ storePath, storeRoot: root, runId: "run-1", generation: 2 });
    await run.append({ eventId: "evt-start", generation: 2, revision: 1, type: "start", payload: { work: "pilot" } });
    return (await run.append({ eventId: "evt-wait", generation: 2, revision: 2, type: "checkpoint", payload: { status: "waiting", reason: "resume" } })).state;
  }
  if (action === "recover") return (await DurableRunState.load({ storePath, storeRoot: root, runId: "run-1", generation })).state;
  if (action === "continue") {
    const run = await DurableRunState.load({ storePath, storeRoot: root, runId: "run-1", generation });
    return (await run.append({ eventId: "evt-continue", generation, revision: 3, type: "continuation", payload: { resumed: true } })).state;
  }
  if (action === "duplicate") {
    const run = await DurableRunState.create({ storePath, storeRoot: root, runId: "run-1", generation: 2 });
    const event = { eventId: "evt-start", generation: 2, revision: 1, type: "start", payload: { work: "pilot" } };
    await run.append(event);
    return await run.append(event);
  }
  if (action === "conflict") {
    const run = await DurableRunState.load({ storePath, storeRoot: root, runId: "run-1", generation: 2 });
    try {
      await run.append({ eventId: "evt-start", generation: 2, revision: 1, type: "start", payload: { work: "changed" } });
    } catch (error) {
      return { code: error.code };
    }
  }
  if (action === "stale-generation") {
    const run = await DurableRunState.load({ storePath, storeRoot: root, runId: "run-1", generation: 2 });
    try {
      await run.append({ eventId: "evt-stale", generation: 1, revision: 3, type: "continuation", payload: {} });
    } catch (error) {
      return { code: error.code };
    }
  }
  if (action === "load-malformed") {
    const malformedPath = join(root, "malformed.json");
    try {
      await DurableRunState.load({ storePath: malformedPath, storeRoot: root, runId: "run-1", generation: 2 });
    } catch (error) {
      return { code: error.code };
    }
  }
  if (action === "path-outside") {
    const run = await DurableRunState.load({ storePath, storeRoot: root, runId: "run-1", generation: 2 });
    try {
      await run.append({ eventId: "evt-path", generation: 2, revision: 3, type: "continuation", payload: { artifactPath: "../outside.json" } });
    } catch (error) {
      return { code: error.code };
    }
  }
  throw new Error(`unknown worker action: ${action}`);
}

run().then((result) => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}).catch((error) => {
  process.stderr.write(`${error.name}: ${error.message}\n`);
  process.exitCode = 1;
});

