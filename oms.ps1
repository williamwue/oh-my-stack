[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('list', 'install', 'status', 'configure', 'update', 'uninstall')]
    [string] $Action = 'list',
    [Parameter(Position = 1)] [string[]] $Component,
    [ValidateSet('codex', 'claude')] [string] $Runtime,
    [switch] $T3,
    [switch] $DownloadBooks,
    [switch] $Open,
    [switch] $Json,
    [string] $StateRoot = "$env:LOCALAPPDATA/oh-my-stack"
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw '首版 OMS 仅支持 Windows PowerShell。' }
Import-Module (Join-Path $PSScriptRoot 'lib/oms.psm1') -Force
try {
    Invoke-Oms -Action $Action -Component $Component -Runtime $Runtime -T3:$T3 -DownloadBooks:$DownloadBooks -Open:$Open -Json:$Json -StateRoot $StateRoot -RepositoryRoot $PSScriptRoot
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
