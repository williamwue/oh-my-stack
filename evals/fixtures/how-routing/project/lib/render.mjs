export function renderReport(report) {
  return `${report.title}\n${report.lines.join("\n")}\n`;
}
