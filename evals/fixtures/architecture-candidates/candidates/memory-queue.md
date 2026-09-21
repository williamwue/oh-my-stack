# Candidate memory queue

Store accepted events in an in-memory FIFO array. Return acknowledgment after
adding an event to the array. A background loop processes the first entry and
removes it after the handler succeeds.

This design is small and easily exceeds 100 events per second. It uses no
external service and preserves order while the process remains alive. A process
crash discards every acknowledged but unprocessed event, and the design has no
durable committed offset from which to resume.
