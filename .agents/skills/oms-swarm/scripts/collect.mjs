import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// The host supplies the immutable final messages in dispatch order for one slice.
// A null message represents a terminal dropout. A running task has no receipt.
export function nextAction({ required, attempts }) {
  if (!required || typeof required !== "object" || Array.isArray(required)) {
    throw new Error("Provide the evidence requirements from the original brief");
  }
  for (const [key, value] of Object.entries(required)) {
    if (!["sha", "method"].includes(key) || typeof value !== "string" || !value.trim()) {
      throw new Error("Expected a nonempty sha or method requirement");
    }
  }
  if (!Array.isArray(attempts) || attempts.length < 1 || attempts.length > 2) {
    throw new Error("Expected one or two terminal receipts for the same slice");
  }
  const seen = new Set();
  for (const [index, receipt] of attempts.entries()) {
    if (!receipt?.id || typeof receipt.id !== "string" || seen.has(receipt.id)) {
      throw new Error("Each attempt needs a distinct host task ID");
    }
    seen.add(receipt.id);
    const { text } = receipt;
    if (text !== null && typeof text !== "string") throw new Error("Expected terminal text or null");
    let report;
    if (text !== null) {
      try { report = JSON.parse(text); } catch { /* An unreadable report lacks evidence. */ }
    }
    const missing = Object.keys(required).filter((key) => report?.[key] !== required[key]);
    let action;
    if (text === null || report?.status === "BLOCKED") action = "gap";
    else if (!["PASS", "ISSUES"].includes(report?.status) || missing.length) {
      action = index === 0 ? "retry" : "gap";
    } else {
      action = report.status;
    }
    if (index === attempts.length - 1) return { action, attempt: index + 1, missing };
    if (action !== "retry") throw new Error("Second receipt supplied after a terminal decision");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const input = JSON.parse(readFileSync(process.argv[2] ?? 0, "utf8").replace(/^\uFEFF/, ""));
    console.log(JSON.stringify(nextAction(input)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
