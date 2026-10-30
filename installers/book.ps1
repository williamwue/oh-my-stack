param([string] $Action, $Item, [string] $Runtime, [string] $StateRoot, [switch] $T3, [switch] $DownloadBooks)
$path = Get-OmsRecordPath $StateRoot $Item.id 'local'
$directory = Join-Path $StateRoot 'books/pstack-book'
$record = Get-OmsRecord $path
$allowed = @('reading.md') + @($Item.assets.name)
if ($record -and ($record.component -ne $Item.id -or $record.runtime -ne 'local' -or @($record.files | Where-Object { $_ -notin $allowed }).Count)) {
    throw '书籍记录与组件不匹配或包含未知文件。'
}
if ($Action -eq 'uninstall') {
    if (-not $record) { throw '没有 OMS 书籍安装记录，拒绝删除。' }
    foreach ($file in @($record.files)) {
        if ($file -ne 'reading.md' -and $file -notin @($Item.assets.name)) { throw '书籍记录包含未知文件。' }
        $target = Join-Path $directory $file
        if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
    }
    Remove-Item -LiteralPath $path
    Write-Output '已移除 OMS 管理的书籍入口及下载文件，其他文件保留。'
    return
}
if ($Action -eq 'update' -and -not $record) { throw '书籍尚未由 OMS 安装，请先 install。' }
if ($Action -eq 'update' -and @($record.files).Count -gt 1) { $DownloadBooks = $true }
$requested = @('reading.md')
if ($DownloadBooks) { $requested += @($Item.assets.name) }
foreach ($file in $requested) {
    if ((Test-Path -LiteralPath (Join-Path $directory $file)) -and (-not $record -or $file -notin @($record.files))) {
        throw "文件已存在但不归 OMS 管理，保留原文件：$file"
    }
}
[IO.Directory]::CreateDirectory($directory) | Out-Null
$reading = "# pstack 书籍`n`n[中文及英文阅读入口]($($Item.readingUrl))`n`n[日文原版]($($Item.source))`n`n[PDF / EPUB 发布页]($($Item.releaseUrl))`n`n[授权与来源]($($Item.authorizationUrl))`n`n书籍与翻译按其独立授权提供，不套用 OMS 的 MIT 许可证。`n"
[IO.File]::WriteAllText((Join-Path $directory 'reading.md'), $reading, [Text.UTF8Encoding]::new($false))
$files = @('reading.md')
if ($record) { $files += @($record.files | Where-Object { $_ -ne 'reading.md' }) }
if ($DownloadBooks) {
    foreach ($asset in $Item.assets) {
        $target = Join-Path $directory $asset.name
        if ((Test-Path -LiteralPath $target) -and (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower() -eq $asset.sha256) { continue }
        $partial = "$target.partial"
        Invoke-WebRequest -UseBasicParsing -Uri "$($Item.assetBaseUrl)/$($asset.name)" -OutFile $partial
        if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLower() -ne $asset.sha256) { throw "书籍校验失败：$($asset.name)" }
        Move-Item -LiteralPath $partial -Destination $target -Force
    }
    $files = @('reading.md') + @($Item.assets.name)
}
Write-OmsJson $path ([pscustomobject]@{ schemaVersion = 1; component = $Item.id; runtime = 'local'; source = $Item.releaseUrl; files = $files; installedAt = [DateTime]::UtcNow.ToString('o') })
Write-Output "书籍已就绪：$(Join-Path $directory 'reading.md')"
