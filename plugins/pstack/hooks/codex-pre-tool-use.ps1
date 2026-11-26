$ErrorActionPreference = 'SilentlyContinue'
$t3Sheet = if ($env:XDG_CONFIG_HOME) { Join-Path $env:XDG_CONFIG_HOME 't3-pstack\models.md' } else { Join-Path $HOME '.config\t3-pstack\models.md' }
$codexSheet = if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'pstack-models.md' } else { Join-Path $HOME '.codex\pstack-models.md' }
if (-not (Test-Path -LiteralPath $t3Sheet) -and -not (Test-Path -LiteralPath $codexSheet)) { exit 0 }

$raw = [Console]::In.ReadToEnd()
if (-not $raw) { exit 0 }
try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }

$tool = if ($payload.tool_name) { $payload.tool_name } else { $payload.toolName }
if (-not ($tool -match '(^|[:._/])spawn_agent$')) { exit 0 }
$args = if ($payload.tool_input) { $payload.tool_input } else { $payload.toolArgs }
if ($args -and $args.model) { exit 0 }

$resp = @{
  hookSpecificOutput = @{
    hookEventName = 'PreToolUse'
    permissionDecision = 'deny'
    permissionDecisionReason = "pstack model guard: spawn_agent omitted ``model`` and would inherit the parent model. Pass an explicit ``model`` and ``reasoning_effort`` from your model sheet (for example ``gpt-6.2-sol``), or use T3 ``delegate_task`` with ``target`` from $t3Sheet."
  }
} | ConvertTo-Json -Compress -Depth 4
[Console]::Out.WriteLine($resp)
exit 0
