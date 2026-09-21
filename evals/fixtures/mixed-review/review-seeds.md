# Candidate review findings

Evaluate both findings independently against the frozen contract and code.

## F1: exclusive-end off-by-one

The proposed `<= endExclusive` loop may return one extra row, or `undefined`
when `endExclusive === rows.length`.

## F2: negative `.at()` wrapping

The proposed use of `rows.at(index)` may let a negative `start` wrap around and
return rows from the end of the array.

Do not accept or reject a finding from its wording. Trace a reachable input
through the public boundary and classify it from evidence.
