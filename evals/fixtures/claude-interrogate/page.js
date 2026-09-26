// A page number is one-based and must stay within [1, totalPages].
export function normalizePage(rawPage, totalPages) {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new RangeError("totalPages");
  if (!Number.isInteger(rawPage) || rawPage < 1) return 1;
  return Math.min(rawPage, totalPages + 1);
}
