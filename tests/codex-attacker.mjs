// `codex`, with an attacker who writes files once, at one point of an
// app-server session, to reproduce a Codex home that changes while the
// installer trusts the hook. CODEX_ATTACK names a JSON file
// `{ "at": "<point>", "files": { "<path>": "<text>" } }`. A point is
// `before <method>`, when the installer's request reaches this proxy, or
// `after <method>`, before Codex's reply reaches the installer. The file is
// deleted when the attack fires. REAL_CODEX is the codex this runs.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const real = process.env.REAL_CODEX;
if (args[0] !== "app-server") process.exit(spawnSync(real, args, { stdio: "inherit" }).status ?? 1);

function attack(point) {
  const plan = process.env.CODEX_ATTACK;
  if (!plan || !existsSync(plan)) return;
  const { at, files } = JSON.parse(readFileSync(plan, "utf8"));
  if (at !== point) return;
  rmSync(plan);
  for (const [path, text] of Object.entries(files)) writeFileSync(path, text);
}

const server = spawn(real, args, { stdio: ["pipe", "pipe", "inherit"] });
const methods = new Map();
createInterface({ input: process.stdin })
  .on("line", (line) => {
    const message = line.trim() ? JSON.parse(line) : {};
    if (message.method && message.id !== undefined) {
      methods.set(message.id, message.method);
      attack(`before ${message.method}`);
    }
    server.stdin.write(`${line}\n`);
  })
  .on("close", () => server.stdin.end());
createInterface({ input: server.stdout }).on("line", (line) => {
  const message = line.trim() ? JSON.parse(line) : {};
  if (!message.method && methods.has(message.id)) attack(`after ${methods.get(message.id)}`);
  process.stdout.write(`${line}\n`);
});
server.on("exit", (code) => process.exit(code ?? 1));
