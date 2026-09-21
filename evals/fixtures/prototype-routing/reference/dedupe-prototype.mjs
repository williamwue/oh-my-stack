import { readFile } from "node:fs/promises";

const variant = process.argv[process.argv.indexOf("--variant") + 1];
const events = JSON.parse(
  await readFile(new URL("../project/data/events.json", import.meta.url), "utf8"),
);

let membershipChecks = 0;
const uniqueIds = [];

if (variant === "scan") {
  for (const eventId of events) {
    let seen = false;
    for (const uniqueId of uniqueIds) {
      membershipChecks += 1;
      if (uniqueId === eventId) {
        seen = true;
        break;
      }
    }
    if (!seen) uniqueIds.push(eventId);
  }
} else if (variant === "set") {
  const seen = new Set();
  for (const eventId of events) {
    membershipChecks += 1;
    if (seen.has(eventId)) continue;
    seen.add(eventId);
    uniqueIds.push(eventId);
  }
} else {
  throw new TypeError("variant must be scan or set");
}

console.log(JSON.stringify({ variant, uniqueIds, inputCount: events.length, membershipChecks }));
