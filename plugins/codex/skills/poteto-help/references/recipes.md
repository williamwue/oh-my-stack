# Prompts worth adapting

Use the host's actual Skill picker or invocation syntax. Substitute real paths,
evidence, and checks. Give one prompt that answers the user's current need.

- Investigate: "Trace why this symptom occurs. Cite the code and evidence.
  Keep the implementation unchanged."
- Bug: "Reproduce this failure first, fix its cause, and show the passing user
  flow and a check that detects the original failure."
- Feature: "Add this behavior while preserving this named existing output.
  Verify both on the surface a user runs."
- Design: "Compare viable interfaces from caller usage. Resolve empirical
  questions with a prototype, then let me review the design before implementation."
- Plan: "Write the dependent units, owned files, and checks for this change.
  The plan is the deliverable."
- Performance: "This operation takes this time on this workload. Trace it,
  vet the measurement, then fix the measured cause and report repeatable results."
- Repeated mistakes: "Find repeated mistakes in this repository and prevent
  them structurally. Prove each new constraint rejects a real past mistake."
- Resume: "Read this checkpoint, verify its Git anchors, and continue the
  authorized unfinished work without repeating completed units."
