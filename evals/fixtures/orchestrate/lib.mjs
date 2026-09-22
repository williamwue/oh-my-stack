import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value, options = {}) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, options);
}

export async function loadProgram(root) {
  return readJson(join(root, "program.json"));
}

export async function saveProgram(root, program) {
  await writeJson(join(root, "program.json"), program);
}

export function expectedOutput(unit, brief) {
  const receipt = (id) => brief.upstreamReceipts.find((item) => item.unit === id)?.headSha;
  if (unit.id === "pilot") return "pilot\n";
  if (unit.id === "alpha") return `alpha-from-${receipt("pilot")}\n`;
  if (unit.id === "beta") return `beta-from-${receipt("pilot")}\n`;
  if (unit.id === "join") return `join-from-${receipt("alpha")}+${receipt("beta")}\n`;
  throw new Error(`unknown unit ${unit.id}`);
}

export function publicStatus(program) {
  return {
    programId: program.programId,
    generation: program.generation,
    predicate: {
      target: program.predicate.target,
      integrated: program.units.filter((unit) => unit.state === "integrated").length,
    },
    maxInFlight: program.maxInFlight,
    inFlight: program.units.filter((unit) => unit.state === "running").map((unit) => unit.id),
    states: Object.fromEntries(program.units.map((unit) => [unit.id, unit.state])),
    frontier: program.units.find((unit) => unit.state !== "integrated")?.id ?? null,
    gates: program.gates,
  };
}
