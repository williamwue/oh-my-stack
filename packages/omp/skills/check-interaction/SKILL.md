---
name: check-interaction
description: "Verify that a runtime collects one fixed choice and one user-authored value without silently inventing either response."
---

# Check Interaction

Run this read-only procedure exactly once and make no project changes.

1. Use the current surface's native user-interaction operation. Ask both
   questions in one interaction when the operation supports it; otherwise ask
   them in order.
2. Ask `Choose the interaction probe color.` with exactly two fixed choices:
   `Amber` and `Cobalt`. Mark `Amber` as recommended when recommendations are
   supported, but never select it on the user's behalf.
3. Ask `Enter the interaction probe token.` with fixed choices `Alpha` and
   `Beta`, while allowing the user to provide a custom value. Do not derive or
   invent the value from these instructions.
4. Wait for actual user input. A timeout, cancellation, recommended default,
   model-generated answer, or empty value is not a user response.
5. If native interaction is unavailable in the current execution mode, stop
   before claiming success. Return `INTERACTION_REQUIRED`, the two pending
   questions, their choices, and `responses: null`. Do not choose defaults or
   continue the workflow.
6. Otherwise return `INTERACTION_RESULT`, the exact selected color, the exact
   custom token, and whether either response timed out. Report success only
   when both values came from the user and neither timed out.
