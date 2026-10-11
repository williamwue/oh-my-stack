---
name: oms-enhanced-delivery
description: Apply the optional OMS frozen delivery, artifact attribution, and independent acceptance contract when explicitly selected.
---

# OMS Enhanced Delivery

Use this entry only when the user selects enhanced delivery or the repository requires it. It adds an evidence contract to the selected upstream workflow. State that selection before applying its extra gates.

1. Read [the frozen evidence contract](references/poteto-mode/delivery-evidence.md). Define the checkable predicate, immutable source, owned units, and combined check. Freeze the plan before implementation.
2. Read [the handoff contract](references/poteto-mode/subagent-handoff.md) before delegated work. Preserve assignment, source revision, role ownership, and fresh-session attribution.
3. Read [optional enhanced workflow stages](references/workflow-overrides.md) for the selected workflow. Follow the upstream workflow and preserve its candidates and independent review. Apply the selected extra artifact and attribution checks to the exact delivered revision.
4. Run the packaged evidence tools against that revision. Report missing provenance or checks as unknown. Require the selected evidence contract before claiming enhanced delivery complete.

Supporting resources retain the previous OMS instructions for optional stronger delivery. They do not change default upstream workflow phases. Current authorization and host publication, credential, billable-operation, and user-scope gates still apply.
