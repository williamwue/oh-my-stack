export function parseWindow(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(parsed, 100);
}
