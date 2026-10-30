[CmdletBinding()]
param(
    [Parameter(Position=0)] [ValidateSet('list','install','status','configure','update','uninstall')] [string] $Action = 'install',
    [Parameter(Position=1)] [string[]] $Component,
    [string[]] $Environment,
    [switch] $Custom,
    [switch] $Yes,
    [switch] $DownloadBooks,
    [switch] $Json,
    [switch] $Open,
    [string] $StateRoot = "$env:LOCALAPPDATA/oh-my-stack"
)
$ErrorActionPreference = 'Stop'
if ([System.Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw '首版 OMS 仅支持 Windows。' }
Import-Module (Join-Path $PSScriptRoot 'lib/oms.psm1') -Force
try {
    Invoke-Oms -Action $Action -Component $Component -Environments $Environment -Custom:$Custom -Yes:$Yes -DownloadBooks:$DownloadBooks -Json:$Json -Open:$Open -StateRoot $StateRoot -Root $PSScriptRoot
} catch { Write-Error $_ -ErrorAction Continue; exit 1 }
