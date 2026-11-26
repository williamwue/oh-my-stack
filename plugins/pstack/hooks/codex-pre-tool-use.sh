#!/bin/sh
set -eu

: "${CLAUDE_PLUGIN_ROOT:=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)}"
t3_sheet="${XDG_CONFIG_HOME:-$HOME/.config}/t3-pstack/models.md"
codex_sheet="${CODEX_HOME:-$HOME/.codex}/pstack-models.md"

# Only enforce when the user has a pstack model sheet (T3 or native Codex).
if [ ! -f "$t3_sheet" ] && [ ! -f "$codex_sheet" ]; then
  exit 0
fi

out=$(LC_ALL=C PSTACK_T3_SHEET="$t3_sheet" awk \
  -f "${CLAUDE_PLUGIN_ROOT}/hooks/json.awk" \
  -f "${CLAUDE_PLUGIN_ROOT}/hooks/codex-pre-tool-use.awk") || out=
[ -z "$out" ] || printf '%s\n' "$out"
exit 0
