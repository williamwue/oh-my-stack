param([string] $SourceRoot, [string] $Mapping, [switch] $Check)
$changes = @(
    @{ path='plugins/pstack/skills/poteto-mode/SKILL.md'; anchor="# Poteto mode`n"; text="`nWhen T3 Code tools are available, read [the T3 mapping](references/t3-tools.md) before dispatching children or resuming delegated work.`n" },
    @{ path='plugins/pstack/skills/poteto-mode/references/codex-tools.md'; anchor="# Codex tool mapping for pstack`n"; text="`nWhen T3 Code tools are available, read [the T3 mapping](t3-tools.md) before dispatching children. It takes precedence for T3 tool selection; workflow and model policy remain upstream-owned.`n" }
)
foreach ($change in $changes) {
    $path = Join-Path $SourceRoot $change.path
    $text = (Invoke-Native git @('-C',$SourceRoot,'show',"HEAD:$($change.path)")).Replace("`r`n","`n")
    if (-not $text.Contains($change.anchor)) { throw "上游适配入口已变化：$($change.path)" }
    $expected = $text.Replace($change.anchor,$change.anchor+$change.text)
    if($Check){
        if([IO.File]::ReadAllText($path).Replace("`r`n","`n").TrimEnd("`n") -ne $expected.TrimEnd("`n")){throw '本地适配文件已被修改。'}
    }else{[IO.File]::WriteAllText($path,$expected+"`n",[Text.UTF8Encoding]::new($false))}
}
$destination=Join-Path $SourceRoot 'plugins/pstack/skills/poteto-mode/references/t3-tools.md'
if($Check){
    if((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $Mapping -Algorithm SHA256).Hash){throw '本地 T3 映射已被修改。'}
}else{Copy-Item -LiteralPath $Mapping -Destination $destination}
