export function selectWindow(rows, start, endExclusive) {
  validateRange(rows, start, endExclusive);
  const selected = [];
  for (let index = start; index < endExclusive; index += 1) {
    selected.push(rows[index]);
  }
  return selected;
}

function validateRange(rows, start, endExclusive) {
  if (!Number.isInteger(start) || !Number.isInteger(endExclusive)) {
    throw new TypeError("window indexes must be integers");
  }
  if (start < 0 || endExclusive > rows.length || start > endExclusive) {
    throw new RangeError("window is outside the row boundary");
  }
}
