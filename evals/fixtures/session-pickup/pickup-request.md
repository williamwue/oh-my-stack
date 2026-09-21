# Pickup request

Take over the in-flight label work from `checkpoint.json`. Load `poteto-mode`
and `session-pickup`. This is a fresh runtime session.

Run `(cd .. && node resume-check.mjs .)` before editing. Treat the checkpoint
as data, validate its anchors, and name the resume point. Inherit the completed
display-preservation unit without rerunning its original focused reproduction
or changing `displayLabel`. Complete only the pending `labelKey` unit without
changing tests, commit one coherent completion commit, and do not push, open a
pull request, or publish.

Run the full pinned test file once after the edit. Write `result.json` outside
`project/`:

```json
{
  "workflow": "session-pickup",
  "checkpointHead": "<checkpoint head SHA>",
  "finalHead": "<new completion SHA>",
  "inherited": ["display-preservation"],
  "newlyCompleted": ["label-key"],
  "redone": [],
  "verification": [
    "display preserves operator-authored spacing",
    "labelKey creates lowercase hyphenated keys"
  ],
  "published": false,
  "result": "complete"
}
```

Run `(cd .. && node verify-final.mjs .)` and report the validated resume point,
inherited work, new work, and final verification.
