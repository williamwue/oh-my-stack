function Get-Environments([string] $Root) {
    @(Get-ChildItem -LiteralPath (Join-Path $Root 'catalog/environments') -Filter '*.json' | ForEach-Object { Read-Json $_.FullName })
}
function Resolve-Backends($Target, [string] $StateRoot, [string] $Component) {
    if ($Target.kind -eq 'native') { return $Target.command }
    foreach ($backend in $Target.backends) {
        $record = Get-Record (Record-Path $StateRoot $Component $backend)
        if (($record -and $Target.id -in @($record.environments)) -or (Get-Command $backend -ErrorAction SilentlyContinue)) { $backend }
    }
}
function Test-Environment($Target) {
    if ($Target.kind -eq 'native') { return [bool](Get-Command $Target.command -ErrorAction SilentlyContinue) }
    foreach ($command in $Target.commands) { if (Get-Command $command -ErrorAction SilentlyContinue) { return $true } }
    foreach ($process in @(Get-Process -ErrorAction SilentlyContinue)) {
        foreach ($pattern in $Target.processes) { if ($process.ProcessName -like $pattern) { return $true } }
    }
    return $false
}
function Select-Options([string] $Title, [object[]] $Options, [string[]] $Defaults) {
    $selected = @($Defaults)
    for (;;) {
        Write-Host "`n$Title"
        for ($i=0; $i -lt $Options.Count; $i++) {
            $mark = $(if ($Options[$i].id -in $selected) { 'x' } else { ' ' })
            Write-Host "[$mark] $($i+1). $($Options[$i].name)"
        }
        $answer = Read-Host '输入编号切换选中项（逗号分隔），回车继续，q 取消'
        if ($answer -eq 'q') { throw '已取消。' }
        if (-not $answer.Trim()) { return $selected }
        foreach ($number in $answer.Split(',')) {
            $index = 0
            if (-not [int]::TryParse($number.Trim(), [ref]$index) -or $index -lt 1 -or $index -gt $Options.Count) { Write-Host '编号无效。'; continue }
            $id = $Options[$index-1].id
            if ($id -in $selected) { $selected = @($selected | Where-Object { $_ -ne $id }) }
            else { $selected += $id }
        }
    }
}
function Get-StatusRow($Item, $Target, [string] $StateRoot) {
    if ($Item.kind -eq 'book') {
        $record = Get-Record (Record-Path $StateRoot $Item.id 'local')
        return [pscustomobject]@{ Component=$Item.id; Environment='local'; Runtime='local'; Status=$(if (Test-Path -LiteralPath (Join-Path $StateRoot 'books/pstack-book/reading.md')) {'installed'} else {'not-installed'}); Managed=[bool]$record; Version=$null }
    }
    $backends=@(Resolve-Backends $Target $StateRoot $Item.id)
    if(-not $backends.Count){$backends=@('missing')}
    foreach($runtime in $backends){
    $record = $(if ($runtime) { Get-Record (Record-Path $StateRoot $Item.id $runtime) })
    if (-not $runtime -or -not (Get-Command $runtime -ErrorAction SilentlyContinue)) {
        [pscustomobject]@{ Component=$Item.id; Environment=$Target.id; Runtime=$runtime; Status='host-missing'; Managed=[bool]$record; Version=$null }
        continue
    }
    $plugin = Get-Plugin $runtime $Item.selector
    $status = 'not-installed'
    if ($plugin) {
        if ($plugin.enabled -eq $false) { $status='disabled' }
        elseif ($Target.kind -eq 't3') { $status='restart-required' }
        else { $status='enabled' }
    }
    if ($record -and $Target.id -notin @($record.environments)) { $status='not-configured' }
    if (-not $record -and $Target.kind -eq 't3' -and $plugin) { $status='unmanaged-unverified' }
    if($record -and $plugin){try{Assert-Source $plugin $runtime $Item.marketplace $record.source}catch{$status='source-conflict'}}
    [pscustomobject]@{ Component=$Item.id; Environment=$Target.id; Runtime=$runtime; Status=$status; Managed=[bool]$record; Version=$plugin.version }
    }
}
