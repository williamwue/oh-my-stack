$ErrorActionPreference = 'Stop'

function Read-OmsJson([string] $Path) {
    Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-OmsJson([string] $Path, $Value) {
    [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
    $temp = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
    $backup = "$temp.backup"
    [IO.File]::WriteAllText($temp, ($Value | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
    try {
        if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($temp, $Path, $backup) }
        else { [IO.File]::Move($temp, $Path) }
    } finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp }
        if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup }
    }
}

function Invoke-OmsCli([string] $Runtime, [string[]] $Arguments) {
    $command = Get-Command $Runtime -ErrorAction SilentlyContinue
    if (-not $command) { throw "未找到 $Runtime。请先安装对应宿主，再运行 OMS。" }
    $global:LASTEXITCODE = 0
    $output = @(& $command @Arguments)
    if ($LASTEXITCODE -ne 0) { throw "$Runtime $($Arguments -join ' ') 失败，退出码 $LASTEXITCODE；未记录成功状态。" }
    return ($output -join "`n")
}

function Get-OmsPlugins([string] $Runtime) {
    $text = Invoke-OmsCli $Runtime @('plugin', 'list', '--json')
    try { $result = $text | ConvertFrom-Json } catch { throw "$Runtime 返回的插件列表不是有效 JSON。" }
    if ($Runtime -eq 'codex') {
        if (-not $result.PSObject.Properties['installed']) { throw 'Codex 插件列表缺少 installed 字段。' }
        return @($result.installed)
    }
    if ($result.PSObject.Properties['installed']) { return @($result.installed | Where-Object { $_.scope -eq 'user' }) }
    return @($result | Where-Object { $_.scope -eq 'user' })
}

function Assert-OmsPluginSource($Plugin, [string] $Expected, [string] $Runtime, [string] $Marketplace) {
    $actual = $Plugin.marketplaceSource.source
    if ($Runtime -eq 'claude') {
        $markets = Invoke-OmsCli $Runtime @('plugin', 'marketplace', 'list', '--json') | ConvertFrom-Json
        $marketEntries = @($markets | Where-Object name -eq $Marketplace)
        if ($marketEntries.Count -ne 1) { throw '无法唯一确认 Claude 插件市场来源，保留现有安装。' }
        $market = $marketEntries[0]
        if ($market.source -eq 'github') { $actual = "https://github.com/$($market.repo)" }
        elseif ($market.source -eq 'git') { $actual = $market.url }
        elseif ($market.source.repo) { $actual = "https://github.com/$($market.source.repo)" }
        else { $actual = $market.source.url }
    }
    if (-not $actual) { throw '宿主未提供可验证的插件来源，保留现有安装。' }
    if (($actual.TrimEnd('/') -replace '\.git$', '') -ne ($Expected.TrimEnd('/') -replace '\.git$', '')) {
        throw '宿主报告的插件来源与 OMS 记录/请求不一致；保留现有安装。'
    }
}

function Find-OmsPlugin([string] $Runtime, [string] $Selector) {
    @(Get-OmsPlugins $Runtime) | Where-Object { $_.pluginId -eq $Selector -or $_.id -eq $Selector } | Select-Object -First 1
}

function Get-OmsRecordPath([string] $StateRoot, [string] $Id, [string] $Runtime) {
    Join-Path $StateRoot "installations/$Id-$Runtime.json"
}

function Get-OmsRecord([string] $Path) {
    if (Test-Path -LiteralPath $Path) { Read-OmsJson $Path }
}

function Get-OmsStatus($Item, [string] $Runtime, [string] $StateRoot) {
    if ($Item.kind -eq 'book') {
        $Runtime = 'local'
        $record = Get-OmsRecord (Get-OmsRecordPath $StateRoot $Item.id $Runtime)
        $present = Test-Path -LiteralPath (Join-Path $StateRoot 'books/pstack-book/reading.md')
        return [pscustomobject]@{ Component = $Item.id; Runtime = $Runtime; Status = $(if ($present) { 'installed' } else { 'not-installed' }); Managed = [bool]$record; Version = $null; Enabled = $present }
    }
    $record = Get-OmsRecord (Get-OmsRecordPath $StateRoot $Item.id $Runtime)
    if (-not (Get-Command $Runtime -ErrorAction SilentlyContinue)) {
        return [pscustomobject]@{ Component = $Item.id; Runtime = $Runtime; Status = 'host-missing'; Managed = [bool]$record; Version = $null; Enabled = $false }
    }
    $plugin = Find-OmsPlugin $Runtime $Item.selector
    [pscustomobject]@{ Component = $Item.id; Runtime = $Runtime; Status = $(if ($plugin) { 'installed' } else { 'not-installed' }); Managed = [bool]$record; Version = $plugin.version; Enabled = $(if ($plugin) { $plugin.enabled -ne $false } else { $false }) }
}

function Invoke-Oms {
    param([string] $Action, [string[]] $Component, [string] $Runtime, [switch] $T3, [switch] $DownloadBooks, [switch] $Open, [switch] $Json, [string] $StateRoot, [string] $RepositoryRoot)
    if (-not $StateRoot) { throw 'StateRoot 不能为空。' }
    $StateRoot = [IO.Path]::GetFullPath($StateRoot)
    $catalog = @(Get-ChildItem -LiteralPath (Join-Path $RepositoryRoot 'catalog') -Filter '*.json' | ForEach-Object { Read-OmsJson $_.FullName })
    if ($Action -eq 'list') {
        if ($Json) { ConvertTo-Json -InputObject $catalog -Depth 10 }
        else { $catalog | Select-Object id, name, description | Format-Table -Wrap }
        return
    }
    if (-not $Runtime) {
        if (Get-Command codex -ErrorAction SilentlyContinue) { $Runtime = 'codex' }
        elseif (Get-Command claude -ErrorAction SilentlyContinue) { $Runtime = 'claude' }
        else { $Runtime = 'codex' }
    }
    if (-not $Component) {
        if ($Action -eq 'status') { $Component = @('all') }
        elseif ($Action -eq 'install') {
            $catalog | Select-Object id, description | Format-Table -Wrap | Out-Host
            $answer = Read-Host '选择组件，以逗号分隔；回车安装全部'
            $Component = $(if ($answer.Trim()) { $answer.Split(',') | ForEach-Object { $_.Trim() } } else { @('all') })
        } elseif ($Action -eq 'update') {
            $Component = @($catalog | Where-Object {
                $recordRuntime = $(if ($_.kind -eq 'book') { 'local' } else { $Runtime })
                Test-Path -LiteralPath (Get-OmsRecordPath $StateRoot $_.id $recordRuntime)
            } | Select-Object -ExpandProperty id)
            if (-not $Component) { Write-Output '没有 OMS 管理的组件，无需更新。'; return }
        } else { throw '请指定组件：pstack、aihero 或 pstack-book。' }
    }
    if ($Component -contains 'all') { $Component = @($catalog.id) }
    foreach ($id in $Component) { if ($id -notin $catalog.id) { throw "未知组件：$id" } }
    if ($Action -eq 'status') {
        $rows = @($catalog | Where-Object id -in $Component | ForEach-Object { Get-OmsStatus $_ $Runtime $StateRoot })
        if ($Json) { ConvertTo-Json -InputObject $rows -Depth 6 }
        else { $rows | Format-Table -AutoSize }
        return
    }
    foreach ($id in $Component) {
        $item = $catalog | Where-Object id -eq $id
        if ($Action -eq 'configure') {
            Write-Output "$($item.name): $($item.configure)"
            if ($item.kind -eq 'book') { Write-Output $item.readingUrl }
            if ($Open) { Start-Process $(if ($item.kind -eq 'book') { $item.readingUrl } else { $item.docs }) }
            continue
        }
        $installer = $(if ($item.kind -eq 'plugin') { 'plugin.ps1' } else { 'book.ps1' })
        & (Join-Path $RepositoryRoot "installers/$installer") -Action $Action -Item $item -Runtime $Runtime -StateRoot $StateRoot -T3:$T3 -DownloadBooks:$DownloadBooks
    }
}

Export-ModuleMember -Function Invoke-Oms
