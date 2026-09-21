# Event batch constraints

- Input batches may contain up to 10,000 event IDs.
- Output must retain the first-seen order of each unique ID.
- Event IDs are opaque strings.
- The production implementation does not exist yet.
