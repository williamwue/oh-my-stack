$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('oms-tests-' + [guid]::NewGuid().ToString('N'))
$bin = Join-Path $testRoot 'bin'
$state = Join-Path $testRoot 'state'
$database = Join-Path $testRoot 'host.json'
[IO.Directory]::CreateDirectory($bin) | Out-Null
$originalPath = $env:PATH
$originalDb = $env:OMS_TEST_DB
$originalFail = $env:OMS_TEST_FAIL
$env:PATH = "$bin;$env:PATH"
$env:OMS_TEST_DB = $database
$env:OMS_TEST_FAIL = ''
$passed = 0

function Assert($Condition, [string] $Message) {
    if (-not $Condition) { throw "ASSERT: $Message" }
    $script:passed++
}
function ReadDb { Get-Content -LiteralPath $database -Raw -Encoding UTF8 | ConvertFrom-Json }
function SaveDb($Value) { [IO.File]::WriteAllText($database, ($Value | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false)) }
function Run([string[]] $Arguments, [int] $Expected = 0) {
    $ErrorActionPreference = 'Continue'
    $output = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'oms.ps1') @Arguments -StateRoot $state 2>&1)
    $code = $LASTEXITCODE
    if ($code -ne $Expected) { throw "Expected exit $Expected, got $code : $output" }
    return ($output -join "`n")
}

$mock = @'
$ErrorActionPreference = 'Stop'
$db = Get-Content -LiteralPath $env:OMS_TEST_DB -Raw -Encoding UTF8 | ConvertFrom-Json
$isClaude = $MyInvocation.MyCommand.Name -like 'claude*'
$operation = $args[1]
if ($operation -eq 'marketplace') { $operation = $args[2] }
if ($env:OMS_TEST_FAIL -eq $operation) { exit 7 }
if ($args[1] -eq 'marketplace' -and $args[2] -eq 'list') {
    $markets = @($db.markets | ForEach-Object { [pscustomobject]@{ name = $_.name; source = 'git'; url = $_.source } })
    ConvertTo-Json -InputObject $markets -Depth 10
    exit 0
}
if ($args[1] -eq 'list') {
    if ($isClaude) { ConvertTo-Json -InputObject @($db.installed) -Depth 10 }
    else { ConvertTo-Json -InputObject @{ installed = @($db.installed) } -Depth 10 }
    exit 0
}
$db.calls = @($db.calls) + ($args -join ' ')
if ($args[1] -eq 'marketplace' -and $args[2] -eq 'add') {
    $source = $args[3]
    $name = $(if ($source -like '*mattpocock*') { 'mattpocock' } else { 'pstack-claude' })
    $db.markets = @($db.markets | Where-Object name -ne $name) + [pscustomobject]@{ name = $name; source = $source }
} elseif ($args[1] -eq 'marketplace' -and $args[2] -in @('upgrade', 'update')) {
    foreach ($plugin in $db.installed) { $plugin.version = '1.2.4' }
} elseif ($args[1] -in @('add', 'install')) {
    $selector = $args[2]
    if (-not @($db.installed | Where-Object pluginId -eq $selector).Count) {
        $market = $db.markets | Where-Object name -eq $selector.Split('@')[1]
        $entry = [pscustomobject]@{ pluginId = $selector; id = $selector; scope = 'user'; version = '1.2.3'; enabled = $true }
        if (-not $isClaude) { $entry | Add-Member -NotePropertyName marketplaceSource -NotePropertyValue @{ source = $market.source } }
        $db.installed = @($db.installed) + $entry
    }
} elseif ($args[1] -in @('remove', 'uninstall')) {
    $db.installed = @($db.installed | Where-Object pluginId -ne $args[2])
}
[IO.File]::WriteAllText($env:OMS_TEST_DB, ($db | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
'ok'
exit 0
'@
foreach ($name in @('codex', 'claude')) { [IO.File]::WriteAllText((Join-Path $bin "$name.ps1"), $mock, [Text.UTF8Encoding]::new($true)) }
SaveDb @{ installed = @(); markets = @(); calls = @() }

try {
    $catalog = (Run -Arguments @('list', '-Json') | ConvertFrom-Json)
    Assert ($catalog.Count -eq 3) 'three independent catalog components'
    Run -Arguments @('install', 'pstack', '-Runtime', 'codex', '-T3') | Out-Null
    $recordPath = Join-Path $state 'installations/pstack-codex.json'
    $record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
    Assert ($record.source -eq 'https://github.com/williamwue/pstack-claude-t3.git') 'T3 uses separate source'
    Run -Arguments @('install', 'pstack', '-Runtime', 'codex', '-T3') | Out-Null
    Assert (@((ReadDb).calls | Where-Object { $_ -eq 'plugin add pstack@pstack-claude' }).Count -eq 1) 'repeat install does not reinstall'
    $status = (Run -Arguments @('status', 'pstack', '-Runtime', 'codex', '-Json') | ConvertFrom-Json)
    Assert ($status[0].Managed -and $status[0].Enabled -and $status[0].Version -eq '1.2.3') 'status queries host'
    $before = Get-Content -LiteralPath $recordPath -Raw
    $guidance = Run -Arguments @('configure', 'pstack')
    Assert ($guidance -like '*setup-pstack*') 'configuration delegates to upstream'
    Assert ((Get-Content -LiteralPath $recordPath -Raw) -eq $before) 'configure does not mutate installed state'
    Run -Arguments @('install', 'aihero', '-Runtime', 'codex') | Out-Null
    Assert (@((ReadDb).installed).Count -eq 2) 'AIHero has separate identity'
    Run -Arguments @('update', 'pstack', '-Runtime', 'codex') | Out-Null
    Assert ((Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json).version -eq '1.2.4') 'update records observed host version'
    Run -Arguments @('update', '-Runtime', 'codex') | Out-Null
    Assert (@((ReadDb).calls | Where-Object { $_ -eq 'plugin marketplace upgrade mattpocock' }).Count -eq 1) 'default update selects owned components'
    $before = Get-Content -LiteralPath $recordPath -Raw
    $env:OMS_TEST_FAIL = 'upgrade'
    Run -Arguments @('update', 'pstack', '-Runtime', 'codex') 1 | Out-Null
    Assert ((Get-Content -LiteralPath $recordPath -Raw) -eq $before) 'failed command retains state'
    $env:OMS_TEST_FAIL = ''
    Run -Arguments @('uninstall', 'aihero', '-Runtime', 'codex') | Out-Null
    Assert (@((ReadDb).installed).Count -eq 1) 'uninstall affects selected component only'
    Run -Arguments @('uninstall', 'pstack', '-Runtime', 'codex') | Out-Null
    Assert (-not (Test-Path -LiteralPath $recordPath)) 'successful uninstall removes ownership record'
    $db = ReadDb
    $db.installed = @([pscustomobject]@{ pluginId = 'pstack@pstack-claude'; id = 'pstack@pstack-claude'; scope = 'user'; version = 'existing'; enabled = $true; marketplaceSource = @{ source = 'https://github.com/michael-denyer/pstack-claude.git' } })
    SaveDb $db
    Run -Arguments @('install', 'pstack', '-Runtime', 'codex') | Out-Null
    Assert (-not (Test-Path -LiteralPath $recordPath)) 'existing plugin is not adopted'
    Run -Arguments @('uninstall', 'pstack', '-Runtime', 'codex') 1 | Out-Null
    Assert (@((ReadDb).installed).Count -eq 1) 'unmanaged plugin preserved'
    Run -Arguments @('install', 'pstack', '-Runtime', 'codex', '-T3') 1 | Out-Null
    Assert ((ReadDb).installed[0].version -eq 'existing') 'source conflict cannot silently switch installation'
    SaveDb @{ installed = @(); markets = @(); calls = @() }
    $env:OMS_TEST_FAIL = 'add'
    Run -Arguments @('install', 'aihero', '-Runtime', 'codex') 1 | Out-Null
    Assert (-not (Test-Path -LiteralPath (Join-Path $state 'installations/aihero-codex.json'))) 'failed installation has no success record'
    $env:OMS_TEST_FAIL = ''
    Run -Arguments @('install', 'aihero', '-Runtime', 'claude') | Out-Null
    Run -Arguments @('uninstall', 'aihero', '-Runtime', 'claude') | Out-Null
    Assert (@((ReadDb).calls | Where-Object { $_ -like '*uninstall*--keep-data*' }).Count -eq 1) 'Claude uninstall preserves data'
    $db = ReadDb
    $db.installed = @([pscustomobject]@{ id = 'pstack@pstack-claude'; pluginId = 'pstack@pstack-claude'; scope = 'user'; version = 'existing'; enabled = $true })
    $db.markets = @([pscustomobject]@{ name = 'pstack-claude'; source = 'https://github.com/michael-denyer/pstack-claude.git' })
    SaveDb $db
    Run -Arguments @('install', 'pstack', '-Runtime', 'claude', '-T3') 1 | Out-Null
    Assert ((ReadDb).installed[0].version -eq 'existing') 'native-shaped Claude source conflict is rejected'
    Run -Arguments @('install', 'pstack-book') | Out-Null
    $book = Join-Path $state 'books/pstack-book/reading.md'
    Assert ((Get-Content -LiteralPath $book -Raw -Encoding UTF8) -like '*AUTHORIZATION*') 'book retains authorization link'
    [IO.File]::WriteAllText((Join-Path $state 'books/pstack-book/notes.txt'), 'my notes')
    Run -Arguments @('update', 'pstack-book') | Out-Null
    Run -Arguments @('uninstall', 'pstack-book') | Out-Null
    Assert (Test-Path -LiteralPath (Join-Path $state 'books/pstack-book/notes.txt')) 'book uninstall preserves unknown files'
    Assert (-not (Test-Path -LiteralPath $book)) 'book entry removed'
    [IO.File]::WriteAllText($book, 'existing personal reading entry')
    Run -Arguments @('install', 'pstack-book') 1 | Out-Null
    Assert ((Get-Content -LiteralPath $book -Raw) -eq 'existing personal reading entry') 'unmanaged book entry is not overwritten or adopted'
    Assert (-not (Test-Path -LiteralPath (Join-Path $state 'installations/pstack-book-local.json'))) 'collision does not create ownership'
    Run -Arguments @('install', '../escape') 1 | Out-Null
    Write-Output "PASS: $passed assertions; native CLI lifecycle simulated in $testRoot"
} finally {
    $env:PATH = $originalPath
    $env:OMS_TEST_DB = $originalDb
    $env:OMS_TEST_FAIL = $originalFail
}
