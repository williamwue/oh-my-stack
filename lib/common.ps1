function Read-Json([string] $Path) { Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json }
function Write-Json([string] $Path, $Value) {
    [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
    $temp = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
    $backup = "$temp.backup"
    [IO.File]::WriteAllText($temp, ($Value | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
    try {
        if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($temp, $Path, $backup) }
        else { [IO.File]::Move($temp, $Path) }
    } finally {
        foreach ($file in @($temp,$backup)) { if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file } }
    }
}
function Invoke-Native([string] $Command, [string[]] $Arguments) {
    $native = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $native) { throw "缺少 $Command，请先安装对应宿主/依赖。" }
    $global:LASTEXITCODE = 0
    $encoding=[Console]::OutputEncoding
    try{
        [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
        $text = @(& $native @Arguments) -join "`n"
        if ($LASTEXITCODE -ne 0) { throw "$Command $($Arguments -join ' ') 失败（$LASTEXITCODE）。" }
    }finally{[Console]::OutputEncoding=$encoding}
    $text
}
function Get-Plugins([string] $Runtime) {
    $result = Invoke-Native $Runtime @('plugin','list','--json') | ConvertFrom-Json
    if ($Runtime -eq 'codex') {
        if (-not $result.PSObject.Properties['installed']) { throw 'Codex 列表缺少 installed。' }
        $plugins = @($result.installed)
    } else { $plugins = @($result | Where-Object scope -eq 'user') }
    $plugins
}
function Get-Plugin([string] $Runtime, [string] $Selector) { Get-Plugins $Runtime | Where-Object { $_.pluginId -eq $Selector -or $_.id -eq $Selector } | Select-Object -First 1 }
function Remove-NativePlugin([string] $Runtime,[string] $Selector){
    $arguments=@('plugin',$(if($Runtime -eq 'codex'){'remove'}else{'uninstall'}),$Selector)
    if($Runtime -eq 'claude'){$arguments+=@('--scope','user','--keep-data')}
    Invoke-Native $Runtime $arguments | Out-Host
}
function Remove-NativeMarket([string] $Runtime,[string] $Market){
    $arguments=@('plugin','marketplace','remove',$Market)
    if($Runtime -eq 'claude'){$arguments+=@('--scope','user')}
    Invoke-Native $Runtime $arguments | Out-Host
}
function Assert-Source($Plugin, [string] $Runtime, [string] $Marketplace, [string] $Expected) {
    $actual = $Plugin.marketplaceSource.source
    if (-not $actual) { $actual = $Plugin.marketplaceSource.path }
    if ($Runtime -eq 'claude') {
        $markets = Invoke-Native $Runtime @('plugin','marketplace','list','--json') | ConvertFrom-Json
        $entries = @($markets | Where-Object name -eq $Marketplace)
        if ($entries.Count -ne 1) { throw '无法唯一确认市场来源。' }
        $market = $entries[0]
        if ($market.source -eq 'github') { $actual = "https://github.com/$($market.repo)" }
        elseif ($market.source -eq 'git') { $actual = $market.url }
        elseif ($market.source -in @('directory','file')) { $actual = $market.path }
        elseif ($market.source.repo) { $actual = "https://github.com/$($market.source.repo)" }
        elseif ($market.source.url) { $actual = $market.source.url }
        else { $actual = $market.source.path }
    }
    if (-not $actual) { throw '宿主未提供可验证来源。' }
    $actual = $actual -replace '^\\\\\?\\',''
    $Expected = $Expected -replace '^\\\\\?\\',''
    if (($actual.TrimEnd('/','\') -replace '\.git$','') -ne ($Expected.TrimEnd('/','\') -replace '\.git$','')) { throw '插件来源冲突，保留现有安装。' }
}
function Record-Path([string] $StateRoot, [string] $Component, [string] $Runtime) { Join-Path $StateRoot "installations/$Component-$Runtime.json" }
function Get-Record([string] $Path) { if (Test-Path -LiteralPath $Path) { Read-Json $Path } }
