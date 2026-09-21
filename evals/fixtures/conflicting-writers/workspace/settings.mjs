export const ingestion = Object.freeze({
  maxBatch: 10,
});

// Keep ingestion and retry ownership as separate reviewable regions.
// The shared file is intentional: concurrent whole-file writes can race.

export const retry = Object.freeze({
  delayMs: 100,
});
