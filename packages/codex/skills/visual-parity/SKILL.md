---
name: visual-parity
description: "Migrate a UI against frozen visual baselines."
---

# Visual parity

Capture the baseline before migration. Freeze component states, viewport,
device scale, fonts, data, timing, and the image comparison method. Treat the
baseline as the current specification unless the user explicitly approves a
new appearance. Do not edit the baseline or loosen the harness to make a
failure pass.

Identify shared primitives and migrate them first when they affect multiple
components. Give each component an owner and distinct workspace if work is
parallel. Migrate one independently testable unit, render old and new on the
same controlled surface, and calculate the image difference. Investigate
nonzero differences with overlays and pixel locations; a compilation or
visual glance cannot establish parity.

Pixel-exact zero is the default when the request truly calls for exact parity.
If nondeterministic rendering makes zero impossible, surface the measured
variance and obtain an agreed tolerance before accepting it. Keep behavior
and accessibility checks alongside pixels when the migration touches them.

Return baseline location, configuration, per-component diff result, approved
exceptions, and remaining components. Pull requests or publication need
separate user intent.
