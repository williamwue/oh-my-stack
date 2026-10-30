param([string] $Action, $Item, [string] $Runtime, [string] $StateRoot, [switch] $T3, [switch] $DownloadBooks)
$path = Get-OmsRecordPath $StateRoot $Item.id $Runtime
$record = Get-OmsRecord $path
$source = $(if ($T3 -and $Item.id -eq 'pstack') { $Item.t3Source } else { $Item.source })
$plugin = Find-OmsPlugin $Runtime $Item.selector

if ($Action -eq 'install') {
    if ($plugin) {
        if ($record -and $record.source -ne $source) { throw '请求的来源与已管理来源不同，请先卸载该组件再切换。' }
        Assert-OmsPluginSource $plugin $source $Runtime $Item.marketplace
        Write-Output "$($Item.id): 已安装；$(if ($record) { '由 OMS 管理' } else { '未接管，保留现有安装' })。"
        return
    }
    Write-Output "安装 $($Item.id) -> $Runtime；来源：$source"
    $marketplaceArguments = @('plugin', 'marketplace', 'add', $source)
    if ($Runtime -eq 'claude') { $marketplaceArguments += @('--scope', 'user') }
    Invoke-OmsCli $Runtime $marketplaceArguments | Out-Host
    $arguments = @('plugin', $(if ($Runtime -eq 'codex') { 'add' } else { 'install' }), $Item.selector)
    if ($Runtime -eq 'claude') { $arguments += @('--scope', 'user') }
    Invoke-OmsCli $Runtime $arguments | Out-Host
    $plugin = Find-OmsPlugin $Runtime $Item.selector
    if (-not $plugin) { throw '原生安装命令已结束，但宿主未报告该插件已安装。' }
    Assert-OmsPluginSource $plugin $source $Runtime $Item.marketplace
    $record = [pscustomobject]@{ schemaVersion = 1; component = $Item.id; runtime = $Runtime; selector = $Item.selector; source = $source; version = $plugin.version; installedAt = [DateTime]::UtcNow.ToString('o') }
    Write-OmsJson $path $record
    Write-Output "$($Item.id): 安装并验证完成。重启宿主后启用；模型配置请运行 configure。"
    return
}

if (-not $record) { throw "$($Item.id): 没有 OMS 管理记录，拒绝更新或卸载现有插件。" }
if ($record.component -ne $Item.id -or $record.runtime -ne $Runtime -or $record.selector -ne $Item.selector) { throw '安装记录与组件不匹配。' }
if ($plugin) { Assert-OmsPluginSource $plugin $record.source $Runtime $Item.marketplace }
if ($Action -eq 'update') {
    if (-not $plugin) { throw '宿主中未找到插件，请重新 install。' }
    if ($Runtime -eq 'codex') {
        Invoke-OmsCli $Runtime @('plugin', 'marketplace', 'upgrade', $Item.marketplace) | Out-Host
        Invoke-OmsCli $Runtime @('plugin', 'add', $Item.selector) | Out-Host
    } else {
        Invoke-OmsCli $Runtime @('plugin', 'marketplace', 'update', $Item.marketplace) | Out-Host
        Invoke-OmsCli $Runtime @('plugin', 'update', $Item.selector, '--scope', 'user') | Out-Host
    }
    $plugin = Find-OmsPlugin $Runtime $Item.selector
    if (-not $plugin) { throw '更新后未找到插件，保留原管理记录。' }
    $record.version = $plugin.version
    Write-OmsJson $path $record
    Write-Output "$($Item.id): 已更新，重启宿主后加载。"
} elseif ($Action -eq 'uninstall') {
    if ($plugin) {
        $arguments = @('plugin', $(if ($Runtime -eq 'codex') { 'remove' } else { 'uninstall' }), $Item.selector)
        if ($Runtime -eq 'claude') { $arguments += @('--scope', 'user', '--keep-data') }
        Invoke-OmsCli $Runtime $arguments | Out-Host
        if (Find-OmsPlugin $Runtime $Item.selector) { throw '宿主仍报告插件已安装，保留管理记录。' }
    }
    Remove-Item -LiteralPath $path
    Write-Output "$($Item.id): 已卸载；市场注册及个人模型文件保持原状。"
}
