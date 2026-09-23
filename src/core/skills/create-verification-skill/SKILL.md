---
name: create-verification-skill
description: Create a project-local Skill that launches and drives the real user surface, captures evidence, and cleans up safely.
---

# Create verification Skill

Create a reusable project-local verification driver for the product. Follow
[authoring-a-skill](../authoring-a-skill/SKILL.md) for Skill structure, then
verify the generated instructions by actually running them. A written but
unexecuted driver remains a draft.

Inspect the repository first: identify the primary user surface, documented
launch command, readiness signal, auth/test data, existing browser/CLI/API or
simulator harness, observable results, and whether concurrent instances can
use distinct ports and data. Ask only for genuinely missing product choices.
If the checkout cannot run, diagnose the precise blocker before writing a
fictional recipe. Do not repurpose or terminate an existing user instance.

Use the runtime's discoverable project Skill location. The generated `SKILL.md`
must name the app and surface in its frontmatter and give exact launch,
readiness, doctor, drive, evidence, and cleanup instructions. Document any
helper invocation in the body. Prefer stable selectors or commands from the
actual repo; avoid invented placeholders. The doctor must establish that this
instance and build are the ones to drive. Capture the action and result plus
meaningful side effects, not only a final screenshot. A dry-run is evidence
only for what it actually avoids.

Create a feature index and a small initial map of real user-facing features.
For each, state the user entry point, drive steps, observable passing end
state, and prerequisites or gotchas. Cover the primary surface; name others
outside the initial map. Keep proof artifacts outside cleanup targets. Clean
up only processes and scratch state created by this run, using recorded IDs.

Run the generated Skill cold once: launch, doctor, drive one mapped feature,
capture evidence, clean up, then confirm the evidence remains. On failure,
clean up the failed attempt and repair the recipe; report blocked if no safe
end-to-end run is possible. Return the Skill path, feature map, exact run and
evidence, plus unverified surfaces. Suggest
[maintain-verification-skill](../maintain-verification-skill/SKILL.md) for later
upkeep. Do not publish a pull request without an explicit request.
