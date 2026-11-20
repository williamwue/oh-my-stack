import { nextAction } from "../.agents/skills/oms-swarm/scripts/collect.mjs";

// In-process hosts can dispatch through a callback. Chat hosts retain real task
// IDs and feed the same decision function after each completion notification.
export async function collectSlice(first, required, retry) {
  const attempts = [];
  let report = first;
  for (;;) {
    if (report && !["PASS", "ISSUES", "BLOCKED"].includes(report.status)) {
      throw new Error("Unknown worker status");
    }
    attempts.push({ id: String(attempts.length + 1), text: report ? JSON.stringify(report) : null });
    const { action, attempt } = nextAction({ required, attempts });
    if (action === "gap") return { status: action, attempt };
    if (action !== "retry") return { status: action, attempt, report };
    report = await retry();
  }
}
