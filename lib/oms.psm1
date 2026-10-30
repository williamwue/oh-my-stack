$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
. (Join-Path $PSScriptRoot 'environments.ps1')

function Invoke-Oms {
    param([string] $Action,[string[]] $Component,[string[]] $Environments,[switch] $Custom,[switch] $Yes,[switch] $DownloadBooks,[switch] $Json,[switch] $Open,[string] $StateRoot,[string] $Root)
    if (-not $StateRoot) { throw 'StateRoot 不能为空。' }
    if($Yes -and $Custom){throw '-Yes 与 -Custom 不能同时使用；自动化请用 -Environment 指定环境。'}
    if($Json -and $Action -notin @('list','status')){throw '-Json 仅支持 list 和 status。'}
    $StateRoot=[IO.Path]::GetFullPath($StateRoot)
    $Component=@($Component | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
    $Environments=@($Environments | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
    $tools=@(Get-ChildItem -LiteralPath (Join-Path $Root 'catalog/tools') -Filter '*.json' | ForEach-Object { Read-Json $_.FullName })
    $targets=Get-Environments $Root
    if ($Action -eq 'list') {
        if ($Json) { @{ tools=$tools; environments=$targets } | ConvertTo-Json -Depth 10 }
        else { $tools | Select-Object id,name | Format-Table; $targets | Select-Object id,name | Format-Table }
        return
    }
    if (-not $Component) {
        if ($Action -eq 'install') {
            if ($Yes) { $Component=@($tools | Where-Object default -eq $true | Select-Object -ExpandProperty id) }
            else { $Component=Select-Options '选择工具' $tools @($tools | Where-Object default -eq $true | Select-Object -ExpandProperty id) }
        } else { $Component=@($tools.id) }
    }
    if ($Component -contains 'all') {$Component=@($tools.id)}
    foreach ($id in $Component) { if ($id -notin $tools.id) { throw "未知工具：$id" } }
    if (-not $Component.Count) { throw '未选择工具。' }
    if (-not $Environments) {
        $detected=@($targets | Where-Object {Test-Environment $_} | Select-Object -ExpandProperty id)
        if ($Custom) { $Environments=Select-Options '选择目标环境' $targets $(if($Action -eq 'install'){$detected}else{@($targets.id)}) }
        elseif ($Action -in @('status','uninstall','update')) { $Environments=@($targets.id) }
        else { $Environments=$detected }
    }
    if ($Environments -contains 'all') {$Environments=@($targets.id)}
    foreach ($id in $Environments) { if ($id -notin $targets.id) { throw "未知环境：$id" } }
    $chosen=@($tools | Where-Object id -in $Component)
    if ($Action -eq 'configure') {
        foreach ($item in $chosen) { Write-Output "$($item.name): $($item.configure)"; if($Open){ Start-Process $(if($item.kind -eq 'book'){$item.readingUrl}else{$item.docs}) } }
        return
    }
    if (@($chosen | Where-Object kind -eq 'plugin').Count -and -not $Environments.Count) { throw '未检测到支持的环境。请先安装宿主，或用 -Custom 选择；书籍可独立安装。' }
    if ($Action -eq 'status') {
        $rows=@(foreach($item in $chosen){if($item.kind -eq 'book'){Get-StatusRow $item $null $StateRoot}else{foreach($target in @($targets | Where-Object id -in $Environments)){Get-StatusRow $item $target $StateRoot}}})
        if($Json){ConvertTo-Json -InputObject $rows -Depth 8}else{$rows|Format-Table -AutoSize}
        return
    }
    $jobs=@()
    foreach($item in $chosen){
        if($item.kind -eq 'book'){
            if($Action -in @('update','uninstall') -and -not(Test-Path -LiteralPath (Record-Path $StateRoot $item.id 'local'))){continue}
            $jobs += [pscustomobject]@{item=$item;runtime='local';targets=@('local')};continue
        }
        $groups=@{}
        foreach($target in @($targets | Where-Object id -in $Environments)){
            $backends=@(Resolve-Backends $target $StateRoot $item.id)
            if(-not $backends.Count){$backends=@('missing')}
            foreach($runtime in $backends){
            if($Action -in @('update','uninstall')){
                $record=Get-Record (Record-Path $StateRoot $item.id $runtime)
                if(-not $record -or $target.id -notin @($record.environments)){continue}
            }
            if(-not $groups.ContainsKey($runtime)){$groups[$runtime]=@()}
            if($target.id -notin $groups[$runtime]){$groups[$runtime]+=$target.id}
            }
        }
        foreach($runtime in $groups.Keys){$jobs += [pscustomobject]@{item=$item;runtime=$runtime;targets=$groups[$runtime]}}
    }
    if(-not $jobs.Count){Write-Output '没有需要操作的 OMS 管理安装。';return}
    $jobs | Select-Object @{n='工具';e={$_.item.name}},@{n='环境';e={$_.targets -join ', '}},@{n='安装宿主';e={$_.runtime}} | Format-Table | Out-Host
    Write-Host 'pstack 默认包含 T3 适配。账号授权和个人模型偏好仍由用户配置。'
    if(-not $Yes){
        $answer=Read-Host '回车执行，c 自定义环境，其他输入取消'
        if($answer -eq 'c'){
            Invoke-Oms -Action $Action -Component $Component -Custom -Yes:$false -DownloadBooks:$DownloadBooks -StateRoot $StateRoot -Root $Root
            return
        }
        if($answer.Trim()){throw '已取消。'}
    }
    $results=@()
    foreach($job in $jobs){
        try{
            if($job.item.kind -eq 'book'){ & (Join-Path $Root 'installers/book.ps1') -Action $Action -Item $job.item -StateRoot $StateRoot -DownloadBooks:$DownloadBooks | Out-Host }
            else{ & (Join-Path $Root 'installers/plugin.ps1') -Action $Action -Item $job.item -Runtime $job.runtime -Targets $job.targets -StateRoot $StateRoot -Root $Root | Out-Host }
            $completion='installed'
            if($Action -eq 'uninstall'){$completion='removed'}
            elseif($job.item.kind -eq 'plugin'){
                $observed=Get-Plugin $job.runtime $job.item.selector
                if(-not $observed){throw '操作后宿主未报告插件，无法确认结果。'}
                $completion=$(if($observed.enabled -eq $false){'disabled'}else{'restart-required'})
            }
            $results += [pscustomobject]@{Component=$job.item.id;Environment=($job.targets -join ',');Runtime=$job.runtime;Status=$completion;Error=$null}
        }catch{$results += [pscustomobject]@{Component=$job.item.id;Environment=($job.targets -join ',');Runtime=$job.runtime;Status='failed';Error=$_.Exception.Message}}
    }
    $results|Format-Table Component,Environment,Runtime,Status,Error -Wrap
    if(@($results|Where-Object Status -eq 'failed').Count){throw '部分操作未完成，请查看上方原因；已成功的组件保留。'}
}
Export-ModuleMember -Function Invoke-Oms
