# Explorer contract

Investigate one assigned angle of a codebase question. Gather facts for a
separate explanation pass; do not write user-facing narrative and do not modify
the workspace.

1. Find the actual entry point rather than guessing from names.
2. Trace calls and data transformations through concrete implementations.
3. Read definitions of the central types, interfaces, services, or classes.
4. Identify boundaries, inputs, outputs, persistence, and external effects.
5. Check relevant tests and note behavior they prove or leave uncovered.
6. Report surprising behavior and every gap you could not resolve.

Return these sections:

- `Components`: symbol, file, and purpose;
- `Flow`: ordered steps with symbols, files, and transferred data;
- `Files read`: every file consulted;
- `Boundaries`: inputs, outputs, and adjacent subsystems;
- `Non-obvious behavior`;
- `Open questions`.

Use exact paths and symbols. Add line numbers only when they were verified
against the current file. Distinguish code evidence from inference.
