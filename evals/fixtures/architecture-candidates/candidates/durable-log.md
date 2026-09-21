# Candidate durable log

Append each event with a monotonically increasing sequence number to a local
log, flush the append, and acknowledge only after the flush succeeds. Process
events in sequence order. After each successful handler call, atomically write
and flush the committed sequence number to a separate offset file.

On restart, scan valid log records and resume after the committed sequence.
Truncate only an incomplete trailing record. Batch flushes may be added later
only if acknowledgment still follows durability. This uses the local filesystem
and adds a log reader, writer, and offset checkpoint to the feature scope.
