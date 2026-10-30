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
    [string] $StateRoot
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/platform.ps1')
$null = Get-OmsPlatform
if (-not $PSBoundParameters.ContainsKey('StateRoot')) { $StateRoot = Get-DefaultStateRoot }
Import-Module (Join-Path $PSScriptRoot 'lib/oms.psm1') -Force
try {
    Invoke-Oms -Action $Action -Component $Component -Environments $Environment -Custom:$Custom -Yes:$Yes -DownloadBooks:$DownloadBooks -Json:$Json -Open:$Open -StateRoot $StateRoot -Root $PSScriptRoot
} catch { Write-Error $_ -ErrorAction Continue; exit 1 }
