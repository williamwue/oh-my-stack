# Pause request

Pause the in-flight label work safely now. Load `poteto-mode` and
`pause-safely`. The first atomic unit, preserving display-label spacing, is
implemented but uncommitted. The `labelKey` unit is deliberately pending.

Do not implement `labelKey`, change tests, push, open a pull request, or start
new work. Verify the completed focused behavior, commit the existing source
change with subject `wip: preserve label display spacing` and a body naming the
still-failing labelKey test, then write `checkpoint.json` outside `project/`:

```json
{
  "schemaVersion": 1,
  "kind": "oh-my-stack-resume",
  "objective": "Preserve display labels and add stable label keys.",
  "repository": {
    "branch": "feature/labels",
    "base": "<main SHA>",
    "head": "<new WIP SHA>",
    "clean": true
  },
  "completed": [
    {
      "id": "display-preservation",
      "evidence": "display preserves operator-authored spacing"
    }
  ],
  "pending": [
    {
      "id": "label-key",
      "nextAction": "Implement labelKey without changing displayLabel or tests."
    }
  ],
  "verification": {
    "passing": ["display preserves operator-authored spacing"],
    "failing": ["labelKey creates lowercase hyphenated keys"]
  },
  "keyFiles": ["lib/labels.mjs", "test/labels.test.mjs"],
  "gotchas": ["Display labels preserve surrounding spaces."],
  "firstAction": "Run node resume-check.mjs . before editing."
}
```

Run `(cd .. && node verify-pause.mjs .)` and stop. Report this as paused, not
complete.
