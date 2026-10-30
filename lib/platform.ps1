function Get-OmsPlatform {
    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) { return 'windows' }
    if ($IsMacOS) { return 'macos' }
    throw 'OMS 仅支持 Windows 和 macOS；不会自动安装 WSL 或其他兼容层。'
}
function Get-DefaultStateRoot([string] $Platform = (Get-OmsPlatform)) {
    switch ($Platform) {
        'windows' {
            if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA 未设置，请显式指定 -StateRoot。' }
            return Join-Path $env:LOCALAPPDATA 'oh-my-stack'
        }
        'macos' { return Join-Path $HOME 'Library/Application Support/oh-my-stack' }
        default { throw "不支持的平台：$Platform" }
    }
}
function Get-MacApplicationRoots {
    @('/Applications', (Join-Path $HOME 'Applications'))
}
function Test-MacApplication($Target, [string[]] $ApplicationRoots = (Get-MacApplicationRoots)) {
    foreach ($root in $ApplicationRoots) {
        if (-not (Test-Path -LiteralPath $root -PathType Container)) { continue }
        foreach ($pattern in $Target.macApplications) {
            if (Get-ChildItem -LiteralPath $root -Directory -Filter $pattern -ErrorAction SilentlyContinue) { return $true }
        }
    }
    return $false
}

function Resolve-OmsDirectory([string] $Path) {
    $fullPath = [IO.Path]::GetFullPath($Path)
    if ((Get-OmsPlatform) -eq 'macos' -and (Test-Path -LiteralPath $fullPath -PathType Container)) {
        # macOS aliases /var and /tmp through /private; native hosts report physical paths.
        Push-Location -LiteralPath $fullPath
        try { return Invoke-Native '/bin/pwd' @('-P') } finally { Pop-Location }
    }
    $fullPath
}
