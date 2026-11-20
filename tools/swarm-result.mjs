// Adapters supply a terminal report or null for a worker that dropped out.
export async function collectSlice(first, required, retry) {
  let report = first;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (!report || report.status === "BLOCKED") return { status: "gap", attempt };
    if (!["PASS", "ISSUES"].includes(report.status)) throw new Error("Unknown worker status");
    if (required.sha === report.sha && required.method === report.method) {
      return { status: report.status, attempt, report };
    }
    if (attempt === 1) report = await retry();
  }
  return { status: "gap", attempt: 2 };
}
