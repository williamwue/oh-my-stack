# Ingestion architecture requirements

Choose one design for a single-process event ingester.

- Accept up to 100 events per second.
- Preserve accepted event order during replay.
- After acknowledging an event, recover it following an immediate process
  crash.
- Resume without replaying already committed events.
- Use the local filesystem only; no external service is allowed.
- Keep implementation scope small enough for one bounded feature change.

Crash recovery and no duplicate replay are required. Throughput and simplicity
cannot compensate for losing an acknowledged event.
