# Decides one Codex PreToolUse call for pstack. Run after json.awk with the
# hook payload on stdin. Denies native `spawn_agent` calls that omit `model`
# when a pstack model sheet exists, preventing silent inheritance of a heavier
# parent model (such as gpt-6.2-astra). Fails open on everything else.
BEGIN {
  if (!jparse()) exit 0
  if ("/tool_name" in JT) { tool = jget("/tool_name"); P = "/tool_input" }
  else { tool = jget("/toolName"); P = "/toolArgs" }
  if (JBAD || tool !~ /(^|[:._\/])spawn_agent$/) exit 0
  if (JT[P] != "object") exit 0
  model = jget(P "/model")
  if (model != "") exit 0
  reason = "pstack model guard: spawn_agent omitted `model` and would inherit the parent model. Pass an explicit `model` and `reasoning_effort` from your model sheet (for example `gpt-6.2-sol`), or use T3 `delegate_task` with `target` from " ENVIRON["PSTACK_T3_SHEET"] "."
  print "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"" esc(reason) "\"}}"
  exit 0
}
