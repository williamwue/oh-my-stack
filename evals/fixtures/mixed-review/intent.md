# Window selection contract

`selectWindow(rows, start, endExclusive)` returns the rows at indexes from
`start` up to, but not including, `endExclusive`.

The public boundary rejects non-integer indexes, negative `start`, an end past
the array length, and reversed ranges. Callers do not bypass that boundary.

The proposed implementation must preserve the baseline behavior. A review
finding is actionable only when a caller allowed by this contract can reach it.
