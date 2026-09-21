# Writer-isolation probe

Use the `check-writer-isolation` Skill. Run the procedure once with exactly one
read-only observer and exactly one isolated writer. Modify no file except the
named writer fixture. Return every requested state and path.
