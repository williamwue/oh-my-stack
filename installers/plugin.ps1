param([string] $Action, $Item, [string] $Runtime, [string[]] $Targets, [string] $StateRoot, [string] $Root)
if (-not $Runtime -or -not (Get-Command $Runtime -ErrorAction SilentlyContinue)) { throw '所选环境缺少可用宿主。T3 可使用已有 Codex 或 Claude Code 运行时。' }
$recordPath = Record-Path $StateRoot $Item.id $Runtime
$record = Get-Record $recordPath
if ($record -and ($record.schemaVersion -ne 2 -or -not $record.environments -or $record.component -ne $Item.id -or $record.runtime -ne $Runtime -or $record.selector -ne $Item.selector)) { throw '管理记录不匹配或来自旧版 OMS，未自动接管。' }
$hostConfigRoot = Get-HostConfigRoot $Runtime
if ($record -and -not (Test-HostConfigRoot $record $hostConfigRoot)) { throw '宿主配置目录与管理记录不一致；请使用对应的 CODEX_HOME / CLAUDE_CONFIG_DIR 或独立 -StateRoot，未修改安装。' }
$plugin = Get-Plugin $Runtime $Item.selector
$hadPlugin = [bool]$plugin
if ($Action -eq 'uninstall') {
    if (-not $record) { throw '此安装不归 OMS 管理，拒绝卸载。' }
    $remaining = @($record.environments | Where-Object { $_ -notin $Targets })
    if ($remaining.Count) {
        $record.environments = $remaining
        Write-Json $recordPath $record
        Write-Output '已移除所选环境的管理关联；其他环境仍使用此安装，保留共享插件。'
        return
    }
    if ($plugin) {
        Assert-Source $plugin $Runtime $Item.marketplace $record.source
        $arguments = @('plugin',$(if ($Runtime -eq 'codex') {'remove'} else {'uninstall'}),$Item.selector)
        if ($Runtime -eq 'claude') { $arguments += @('--scope','user','--keep-data') }
        Invoke-Native $Runtime $arguments | Out-Host
        if (Get-Plugin $Runtime $Item.selector) { throw '宿主仍报告已安装，保留记录。' }
    }
    Remove-Item -LiteralPath $recordPath
    return
}
if ($plugin -and -not $record) { throw '发现既有同名插件，未自动接管。请先确认并通过宿主原生命令移除冲突安装。' }
if ($record -and $plugin) { Assert-Source $plugin $Runtime $Item.marketplace $record.source }
if ($Action -eq 'update' -and -not $record) { throw '此安装不归 OMS 管理。' }
$allTargets = @($Targets)
if ($record) { $allTargets = @(@($record.environments) + $Targets | Select-Object -Unique) }
if ($Action -eq 'install' -and $plugin -and $record) {
    $record.environments = $allTargets
    Write-Json $recordPath $record
    Write-Output '复用现有受管理安装。'
    return
}
$source = $Item.source
if ($Action -eq 'install' -and $record) { $source = $record.source }
elseif ($Item.id -eq 'pstack') {
    $source = & (Join-Path $Root 'installers/pstack.ps1') -Item $Item -StateRoot $StateRoot -Root $Root -Update:($Action -eq 'update')
}
$oldSource = $(if ($record) {$record.source})
$switching=$oldSource -and $oldSource -ne $source
$removedOld=$false;$registeredNew=$false
if($switching){
    $other=@(Get-Plugins $Runtime|Where-Object{($_.id -like "*@$($Item.marketplace)" -or $_.pluginId -like "*@$($Item.marketplace)") -and $_.id -ne $Item.selector -and $_.pluginId -ne $Item.selector})
    if($other.Count){throw '市场仍有其他插件，拒绝自动切换来源。'}
}
try {
    if($switching){
        Remove-NativePlugin $Runtime $Item.selector
        Remove-NativeMarket $Runtime $Item.marketplace
        $removedOld=$true
    }
    $arguments = @('plugin','marketplace','add',$source)
    if ($Runtime -eq 'claude') { $arguments += @('--scope','user') }
    Invoke-Native $Runtime $arguments | Out-Host
    $registeredNew=$true
    if ($Action -eq 'update' -and $Item.id -ne 'pstack') {
        Invoke-Native $Runtime @('plugin','marketplace',$(if ($Runtime -eq 'codex') {'upgrade'} else {'update'}),$Item.marketplace) | Out-Host
    }
    $arguments = @('plugin',$(if ($Runtime -eq 'codex') {'add'} elseif ($Action -eq 'update' -and -not $switching) {'update'} else {'install'}),$Item.selector)
    if ($Runtime -eq 'claude') { $arguments += @('--scope','user') }
    Invoke-Native $Runtime $arguments | Out-Host
    $plugin = Get-Plugin $Runtime $Item.selector
    if (-not $plugin) { throw '宿主未报告安装成功。' }
    Assert-Source $plugin $Runtime $Item.marketplace $source
    Write-Json $recordPath @{ schemaVersion=2; component=$Item.id; runtime=$Runtime; selector=$Item.selector; source=$source; environments=$allTargets; version=$plugin.version; hostConfigRoot=$hostConfigRoot }
} catch {
    $failure = $_
    if (-not $hadPlugin) {
        try {
            $created = Get-Plugin $Runtime $Item.selector
            if ($created) {
                Assert-Source $created $Runtime $Item.marketplace $source
                $removeArgs = @('plugin',$(if($Runtime -eq 'codex'){'remove'}else{'uninstall'}),$Item.selector)
                if($Runtime -eq 'claude'){$removeArgs+=@('--scope','user','--keep-data')}
                Invoke-Native $Runtime $removeArgs | Out-Host
            }
        } catch { Write-Warning '初次安装未完成；请检查宿主中是否残留了本次插件。' }
    }
    if ($oldSource -and $oldSource -ne $source) {
        $rollbackArgs = @('plugin','marketplace','add',$oldSource)
        if ($Runtime -eq 'claude') { $rollbackArgs += @('--scope','user') }
        try {
            if($removedOld -and $registeredNew){
                $newPlugin=Get-Plugin $Runtime $Item.selector
                if($newPlugin){Assert-Source $newPlugin $Runtime $Item.marketplace $source;Remove-NativePlugin $Runtime $Item.selector}
                Remove-NativeMarket $Runtime $Item.marketplace
            }
            Invoke-Native $Runtime $rollbackArgs | Out-Host
            $restoreArgs = @('plugin',$(if ($Runtime -eq 'codex') {'add'} else {'install'}),$Item.selector)
            if ($Runtime -eq 'claude') { $restoreArgs += @('--scope','user') }
            Invoke-Native $Runtime $restoreArgs | Out-Host
        } catch { Write-Warning '自动恢复旧安装未成功；旧包和管理记录仍保留，请检查宿主状态。' }
    }
    throw $failure
}
