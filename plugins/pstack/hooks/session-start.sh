#!/bin/sh
set -eu

# Each runtime's hooks file passes its own name. MiniMax Code runs Claude
# Code's hooks file, so it is known by the MINIMAX_PLUGIN_ROOT it sets.
runtime="${1:-}"
if [ "$runtime" = claude ] && [ -n "${MINIMAX_PLUGIN_ROOT:-}" ]; then
  runtime=minimax
fi

# Literal plugin paths, so a static reader of the hooks files can follow them.
case "$runtime" in
  agy)
    # Antigravity starts hooks in the plugin root.
    sheet="$HOME/.gemini/config/pstack-models.md"
    reader=./skills/setup-pstack/scripts/read-sheet.sh
    ;;
  claude)
    sheet="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/pstack-models.md"
    # A sheet committed with the project replaces the user's in that project.
    # Claude Code may start in a subdirectory, so look at the repository root.
    if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
      root=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --show-toplevel 2>/dev/null) || root=$CLAUDE_PROJECT_DIR
      [ ! -f "$root/.claude/pstack-models.md" ] || sheet="$root/.claude/pstack-models.md"
    fi
    reader="${CLAUDE_PLUGIN_ROOT}/skills/setup-pstack/scripts/read-sheet.sh"
    ;;
  minimax)
    # MiniMax Code withholds MINIMAX_DATA_DIR from hooks and its bash tool.
    sheet="$HOME/.minimax/pstack-models.md"
    reader="${MINIMAX_PLUGIN_ROOT}/skills/setup-pstack/scripts/read-sheet.sh"
    ;;
  codex)
    sheet="${CODEX_HOME:-$HOME/.codex}/pstack-models.md"
    # Codex expands ${CLAUDE_PLUGIN_ROOT} in the command string but may not
    # set it in the hook's environment, so fall back to this script's own
    # location. The root then serves the reader and the mandate below.
    : "${CLAUDE_PLUGIN_ROOT:=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)}"
    reader="${CLAUDE_PLUGIN_ROOT}/skills/setup-pstack/scripts/read-sheet.sh"
    ;;
  kiro)
    sheet="${XDG_CONFIG_HOME:-$HOME/.config}/t3-pstack/models.md"
    reader="$2/skills/setup-pstack/scripts/read-sheet.sh"
    ;;
  copilot)
    sheet="${COPILOT_HOME:-$HOME/.copilot}/pstack-models.md"
    reader="${COPILOT_PLUGIN_ROOT}/skills/setup-pstack/scripts/read-sheet.sh"
    ;;
  muse)
    # On Windows the manifest's PowerShell hook owns Muse. `uname -s` names a
    # Windows sh, busybox-w32's as Windows_NT, and OS covers one without uname.
    case "$(uname -s 2>/dev/null || true)" in
      MINGW*|MSYS*|CYGWIN*|Windows_NT) exit 0 ;;
    esac
    [ "${OS:-}" != Windows_NT ] || exit 0
    sheet="${XDG_CONFIG_HOME:-$HOME/.config}/muse/pstack-models.md"
    reader="${MUSE_PLUGIN_ROOT}/skills/setup-pstack/scripts/read-sheet.sh"
    ;;
  *)
    echo "session-start.sh: unknown runtime '${1:-}' (expected agy, claude, codex, copilot, kiro, or muse)" >&2
    exit 2
    ;;
esac

# A sheet that cannot be decoded counts as missing, so injection stays on.
found=0
if [ -f "$sheet" ] && [ -r "$sheet" ] && normalized=$(sh "$reader" "$sheet"); then
  found=1
else
  normalized=
fi
# PSTACK_SESSION_HOOK=off reaches sessions whose home starts empty, such as
# Claude Code cloud sessions, where no user sheet survives.
if [ "${PSTACK_SESSION_HOOK:-}" = off ] || printf '%s\n' "$normalized" | grep -qx 'session hook: off'; then
  [ "$runtime" != agy ] || printf '{}\n'
  exit 0
fi

t3_sheet="${XDG_CONFIG_HOME:-$HOME/.config}/t3-pstack/models.md"

print_t3_models() {
  [ -f "$t3_sheet" ] && [ -r "$t3_sheet" ] || return 0
  t3_norm=$(sh "$reader" "$t3_sheet" 2>/dev/null) || return 0
  if printf '%s\n' "$t3_norm" | grep -qx 'session hook: off'; then
    return 0
  fi
  t3_roles=$(printf '%s\n' "$t3_norm" | grep -E '^[a-z][a-z ,-]*: ' | grep -v '^session hook: ' || true)
  [ -n "$t3_roles" ] || return 0
  printf '\n<T3_PSTACK_MODELS path="%s">\n' "$t3_sheet"
  printf '%s\n' "When T3 Code orchestration tools (\`delegate_task\`) are available, follow T3's orchestration rules using these role targets (read \`references/t3-tools.md\` in full, never truncate skills or references with \`head\`/\`tail\`). For native \`spawn_agent\`/\`Agent\`, always pass an explicit \`model\` and reasoning effort; never omit \`model\` and silently inherit a heavier parent model:"
  printf '%s\n' "$t3_roles"
  printf '%s\n' "</T3_PSTACK_MODELS>"
}

if [ "$runtime" = agy ]; then
  { cat ./hooks/session-start-agy.md; print_t3_models; } | LC_ALL=C awk -f ./hooks/json.awk -f ./hooks/agy-context.awk
  exit 0
fi

# GitHub Copilot parses stdout as one JSON object. Its sheet sits outside
# Copilot's path sandbox, so the hook checks the sheet and adds its role lines
# to the mandate, and the agent never reads the file. The hooks directory goes
# through the environment, since awk expands backslash escapes in a -v value.
if [ "$runtime" = copilot ]; then
  printf '%s\n' "$normalized" | PSTACK_HOOKS="${COPILOT_PLUGIN_ROOT}/hooks" LC_ALL=C awk -v found="$found" \
    -f "${COPILOT_PLUGIN_ROOT}/hooks/json.awk" \
    -f "${COPILOT_PLUGIN_ROOT}/skills/setup-pstack/scripts/sheet.awk" \
    -f "${COPILOT_PLUGIN_ROOT}/hooks/copilot-context.awk"
  exit 0
fi

# Muse reads stdout as plain additional context. Its sheet has no include
# mechanism, so the hook adds the sheet's known role lines to the Muse
# mandate itself, rebuilt from their checked values.
if [ "$runtime" = muse ]; then
  printf '%s\n' "$normalized" | PSTACK_HOOKS="${MUSE_PLUGIN_ROOT}/hooks" LC_ALL=C awk -v found="$found" \
    -f "${MUSE_PLUGIN_ROOT}/skills/setup-pstack/scripts/sheet.awk" \
    -f "${MUSE_PLUGIN_ROOT}/hooks/muse-context.awk"
  exit 0
fi

if [ "$runtime" = minimax ]; then
  cat "${MINIMAX_PLUGIN_ROOT}/hooks/session-start-minimax.md"
  exit 0
fi

if [ "$runtime" = kiro ]; then
  cat "$2/hooks/session-start-context.md"
    printf '\n%s%s%s\n' \
      "On Kiro, pstack's skills have bare names. \`pstack:<name>\` is the \`<name>\` skill, and \`/pstack:<name>\` is \`/<name>\`. \`<plugin root>\` is \`" \
      "$2" \
      "\`. Kiro reaches each skill through a link, so a skill's path does not lead there. T3's tools come from the \`t3-code\` MCP server, and Kiro can defer MCP tools. Load \`delegate_task\` and each other T3 tool with the tool-loading tool before its first call."
  exit 0
fi

cat "${CLAUDE_PLUGIN_ROOT}/hooks/session-start-context.md"
print_t3_models
