$ErrorActionPreference='Stop'
$root=Join-Path ([IO.Path]::GetTempPath()) ('oms test-'+[guid]::NewGuid().ToString('N').Substring(0,8))
$app=Join-Path $root 'app';$bin=Join-Path $root 'bin';$state=Join-Path $root 'state';$gitSource=Join-Path $root 'source'
foreach($dir in @($app,$bin,$gitSource)){[IO.Directory]::CreateDirectory($dir)|Out-Null}
$repository=Split-Path -Parent $PSScriptRoot
foreach($entry in @('oms.ps1','lib','catalog','installers','integrations')){Copy-Item -LiteralPath (Join-Path $repository $entry) -Destination $app -Recurse}
$dbPath=Join-Path $root 'host.json'
$oldPath=$env:PATH;$oldDb=$env:OMS_TEST_DB;$oldFail=$env:OMS_TEST_FAIL
$oldBookFail=$env:OMS_TEST_BOOK_FAIL
$oldCodexHome=$env:CODEX_HOME;$oldClaudeConfig=$env:CLAUDE_CONFIG_DIR
$env:CODEX_HOME=Join-Path $root 'codex home';$env:CLAUDE_CONFIG_DIR=Join-Path $root 'claude home'
foreach($dir in @($env:CODEX_HOME,$env:CLAUDE_CONFIG_DIR)){[IO.Directory]::CreateDirectory($dir)|Out-Null}
$env:PATH="$bin$([IO.Path]::PathSeparator)$env:PATH";$env:OMS_TEST_DB=$dbPath;$env:OMS_TEST_FAIL=''
$powerShell=(Get-Process -Id $PID).Path
$script:passed=0
function Assert($Value,[string]$Message){if(-not $Value){throw "ASSERT: $Message"};$script:passed++}
function Write-Utf8([string]$Path,[string]$Text){[IO.Directory]::CreateDirectory((Split-Path -Parent $Path))|Out-Null;[IO.File]::WriteAllText($Path,$Text,[Text.UTF8Encoding]::new($false))}
function PhysicalPath([string]$Path){ & (Get-Module oms) {param($Directory) Resolve-OmsDirectory $Directory} $Path }
function ReadDb{Get-Content -LiteralPath $dbPath -Raw -Encoding UTF8|ConvertFrom-Json}
function SaveDb($Value){Write-Utf8 $dbPath ($Value|ConvertTo-Json -Depth 12)}
function Run([string[]]$Arguments,[int]$Expected=0){
    $ErrorActionPreference='Continue'
    $out=@(& $powerShell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $app 'oms.ps1') @Arguments -StateRoot $state -Yes 2>&1)
    if($LASTEXITCODE -ne $Expected){throw "exit $LASTEXITCODE != $Expected : $out"}
    $out -join "`n"
}
function Test-Git([string[]]$Arguments){$out=@(& git @Arguments)-join "`n";if($LASTEXITCODE){throw "Git failed: $Arguments"};$out}

$mock=@'
$ErrorActionPreference='Stop'
$runtime=([IO.Path]::GetFileNameWithoutExtension($MyInvocation.MyCommand.Name))
$db=Get-Content -LiteralPath $env:OMS_TEST_DB -Raw -Encoding UTF8|ConvertFrom-Json
$operation=$args[1];if($operation -eq 'marketplace'){$operation=$args[2]}
if($env:OMS_TEST_FAIL -eq $operation){exit 7}
if($args[1] -eq 'list'){
    $entries=@($db.installed|Where-Object runtime -eq $runtime)
    if($runtime -eq 'codex'){ConvertTo-Json -InputObject @{installed=$entries} -Depth 12}else{ConvertTo-Json -InputObject $entries -Depth 12};exit 0
}
if($args[1] -eq 'marketplace' -and $args[2] -eq 'list'){
    $markets=@($db.markets|Where-Object runtime -eq $runtime|ForEach-Object{[pscustomobject]@{name=$_.name;source=$(if($_.source -like 'https://*'){'git'}else{'directory'});url=$_.source;path=$_.source}})
    ConvertTo-Json -InputObject $markets -Depth 12;exit 0
}
$db.calls=@($db.calls)+"$runtime $($args -join ' ')"
if($args[1] -eq 'marketplace' -and $args[2] -eq 'add'){
    $name=$(if($args[3] -like '*mattpocock*'){'mattpocock'}else{'pstack-claude'})
    $existing=@($db.markets|Where-Object{$_.runtime -eq $runtime -and $_.name -eq $name})
    if($existing.Count -and $existing[0].source -ne $args[3]){exit 8}
    $db.markets=@($db.markets|Where-Object{ -not($_.runtime -eq $runtime -and $_.name -eq $name)})+[pscustomobject]@{runtime=$runtime;name=$name;source=$args[3]}
}elseif($args[1] -eq 'marketplace' -and $args[2] -eq 'remove'){
    $marketName=$args[3]
    $db.markets=@($db.markets|Where-Object{ -not($_.runtime -eq $runtime -and $_.name -eq $marketName)})
}elseif($args[1] -in @('add','install','update')){
    if($db.failNextInstall){
        $db.failNextInstall=$false
        [IO.File]::WriteAllText($env:OMS_TEST_DB,($db|ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false));exit 9
    }
    $selector=$args[2];$market=$db.markets|Where-Object{ $_.runtime -eq $runtime -and $_.name -eq $selector.Split('@')[1] }
    $db.installed=@($db.installed|Where-Object{ -not($_.runtime -eq $runtime -and $_.id -eq $selector)})
    $entry=[pscustomobject]@{runtime=$runtime;id=$selector;pluginId=$selector;version='1.2.3';scope='user';enabled=$true}
    if($runtime -eq 'codex'){$entry|Add-Member -NotePropertyName marketplaceSource -NotePropertyValue @{source=$market.source}}
    $db.installed+=@($entry)
}elseif($args[1] -in @('remove','uninstall')){
    $selector=$args[2];$db.installed=@($db.installed|Where-Object{ -not($_.runtime -eq $runtime -and $_.id -eq $selector)})
}
[IO.File]::WriteAllText($env:OMS_TEST_DB,($db|ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false));'ok';exit 0
'@
foreach($runtime in @('codex','claude')){
    $mockPath=Join-Path $bin "$runtime.ps1"
    [IO.File]::WriteAllText($mockPath,$mock,[Text.UTF8Encoding]::new($true))
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        # Use real subprocesses on Unix, including arguments with spaces and UTF-8.
        $shellPowerShell="'" + $powerShell.Replace("'", "'\''") + "'"
        $shellMock="'" + $mockPath.Replace("'", "'\''") + "'"
        $shim=Join-Path $bin $runtime
        Write-Utf8 $shim ("#!/bin/sh`nexec $shellPowerShell -NoProfile -File $shellMock " + '"$@"' + "`n")
        & chmod +x $shim
        if($LASTEXITCODE){throw 'Could not make mock CLI executable'}
    }
}
SaveDb @{installed=@();markets=@();calls=@()}
Test-Git -Arguments @('init','--quiet','--initial-branch=main',$gitSource)|Out-Null
Test-Git -Arguments @('-C',$gitSource,'config','core.autocrlf','false')|Out-Null
Write-Utf8 (Join-Path $gitSource 'plugins/pstack/skills/poteto-mode/SKILL.md') "# Poteto mode`n`nOriginal body — 原文`n"
$codexPath=Join-Path $gitSource 'plugins/pstack/skills/poteto-mode/references/codex-tools.md'
Write-Utf8 $codexPath "# Codex tool mapping for pstack`n`nOriginal tools`n"
Write-Utf8 (Join-Path $gitSource 'plugins/pstack/models.json') '{"upstream":"untouched"}'
Test-Git -Arguments @('-C',$gitSource,'add','.')|Out-Null
Test-Git -Arguments @('-C',$gitSource,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','fixture')|Out-Null
$revision=Test-Git -Arguments @('-C',$gitSource,'rev-parse','HEAD')
$catalogPath=Join-Path $app 'catalog/tools/pstack.json'
$catalog=Get-Content -LiteralPath $catalogPath -Raw -Encoding UTF8|ConvertFrom-Json
$catalog.source=$gitSource;$catalog.revision=$revision
Write-Utf8 $catalogPath ($catalog|ConvertTo-Json -Depth 12)
$recordPath=Join-Path $state 'installations/pstack-codex.json'
try{
    Import-Module (Join-Path $app 'lib/oms.psm1') -Force
    $platformChecks=& (Get-Module oms) {
        param($FixtureRoot,$AppPath)
        $platform=Get-OmsPlatform
        $defaultRoot=Get-DefaultStateRoot
        $macRoot=Get-DefaultStateRoot -Platform macos
        $oldLocalAppData=$env:LOCALAPPDATA
        try {
            $env:LOCALAPPDATA=Join-Path $FixtureRoot 'Local App Data'
            $windowsRoot=Get-DefaultStateRoot -Platform windows
            $env:LOCALAPPDATA=''
            $missingLocalAppDataRejected=$false
            try { Get-DefaultStateRoot -Platform windows | Out-Null } catch { $missingLocalAppDataRejected=$true }
        } finally { $env:LOCALAPPDATA=$oldLocalAppData }
        $unsupportedRejected=$false
        try { Get-DefaultStateRoot -Platform linux | Out-Null } catch { $unsupportedRejected=$true }
        $target=Read-Json (Join-Path $AppPath 'catalog/environments/t3.json')
        $appRoot=Join-Path $FixtureRoot 'Applications'
        [IO.Directory]::CreateDirectory($appRoot)|Out-Null
        $missingApp= -not (Test-MacApplication $target @($appRoot))
        $detected=@(foreach($name in @('T3 Code.app','T3 Code (Nightly).app','T3 Code (Customized).app')){
            $bundle=Join-Path $appRoot $name
            [IO.Directory]::CreateDirectory($bundle)|Out-Null
            Test-MacApplication $target @($appRoot)
            Remove-Item -LiteralPath $bundle -Recurse
        })
        [IO.Directory]::CreateDirectory((Join-Path $appRoot 'Unrelated.app'))|Out-Null
        $unrelatedRejected= -not (Test-MacApplication $target @($appRoot))
        $codexRoot=Get-HostConfigRoot codex
        $claudeRoot=Get-HostConfigRoot claude
        $oldCodex=$env:CODEX_HOME;$oldClaude=$env:CLAUDE_CONFIG_DIR
        try {
            $env:CODEX_HOME='';$env:CLAUDE_CONFIG_DIR=''
            $defaultCodex=Get-HostConfigRoot codex
            $defaultClaude=Get-HostConfigRoot claude
            $env:CODEX_HOME='relative-home'
            $relativeRejected=$false
            try { Get-HostConfigRoot codex | Out-Null } catch { $relativeRejected=$true }
        } finally { $env:CODEX_HOME=$oldCodex;$env:CLAUDE_CONFIG_DIR=$oldClaude }
        [pscustomobject]@{
            Platform=$platform;DefaultRoot=$defaultRoot;MacRoot=$macRoot;WindowsRoot=$windowsRoot
            MissingLocalAppDataRejected=$missingLocalAppDataRejected;UnsupportedRejected=$unsupportedRejected
            MissingApp=$missingApp;Detected=$detected;UnrelatedRejected=$unrelatedRejected
            CodexRoot=$codexRoot;ClaudeRoot=$claudeRoot;DefaultCodex=$defaultCodex;DefaultClaude=$defaultClaude
            RelativeRejected=$relativeRejected
        }
    } $root $app
    $expectedPlatform=$(if([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT){'windows'}else{'macos'})
    Assert ($platformChecks.Platform -eq $expectedPlatform) 'native platform detected'
    Assert ($platformChecks.MacRoot -eq (Join-Path $HOME 'Library/Application Support/oh-my-stack')) 'macOS state uses Application Support'
    Assert ($platformChecks.WindowsRoot -eq (Join-Path $root 'Local App Data/oh-my-stack')) 'Windows LOCALAPPDATA path preserved'
    Assert ($platformChecks.DefaultRoot -eq $(if($expectedPlatform -eq 'windows'){Join-Path $env:LOCALAPPDATA 'oh-my-stack'}else{$platformChecks.MacRoot})) 'default state path follows current platform'
    Assert ($platformChecks.MissingLocalAppDataRejected -and $platformChecks.UnsupportedRejected) 'invalid platform and missing Windows data root fail closed'
    Assert ($platformChecks.MissingApp -and $platformChecks.UnrelatedRejected) 'unrelated or missing applications do not imply T3 exists'
    Assert (@($platformChecks.Detected | Where-Object {$_ -eq $true}).Count -eq 3) 'T3 stable, Nightly and Customized bundles detected without CLI'
    Assert ($platformChecks.CodexRoot -eq (PhysicalPath $env:CODEX_HOME) -and $platformChecks.ClaudeRoot -eq (PhysicalPath $env:CLAUDE_CONFIG_DIR)) 'explicit native host config roots honored'
    Assert ($platformChecks.DefaultCodex -eq (PhysicalPath (Join-Path $HOME '.codex')) -and $platformChecks.DefaultClaude -eq (PhysicalPath (Join-Path $HOME '.claude'))) 'default native host config roots resolved'
    Assert ($platformChecks.RelativeRejected) 'ambiguous relative native config path rejected'
    if($expectedPlatform -eq 'macos'){
        $aliasChecks=& (Get-Module oms) {
            param($FixtureRoot)
            $physical=Resolve-OmsDirectory $FixtureRoot
            $alias=Join-Path $FixtureRoot 'directory alias'
            New-Item -ItemType SymbolicLink -Path $alias -Target $physical | Out-Null
            $plugin=[pscustomobject]@{marketplaceSource=@{source=$physical}}
            Assert-Source $plugin codex pstack-claude $alias
            $same=Test-HostConfigRoot ([pscustomobject]@{hostConfigRoot=$alias}) $physical
            $conflict=$false
            $different=Join-Path $FixtureRoot 'different'
            [IO.Directory]::CreateDirectory($different)|Out-Null
            try { Assert-Source $plugin codex pstack-claude $different } catch { $conflict=$true }
            [pscustomobject]@{Same=$same;Conflict=$conflict}
        } $root
        Assert ($aliasChecks.Same) 'macOS symbolic directory aliases share host config identity'
        Assert ($aliasChecks.Conflict) 'different physical source remains a conflict on macOS'
    }
    $selected=& (Get-Module oms) {
        $script:answers=[Collections.Queue]::new()
        $script:answers.Enqueue('1,3');$script:answers.Enqueue('')
        function script:Read-Host([string]$Prompt){$script:answers.Dequeue()}
        Select-Options 'fixture choices' @(@{id='codex';name='Codex'},@{id='claude';name='Claude Code'},@{id='t3';name='T3 Code'}) @('codex','claude')
    }
    Assert (($selected -join ',') -eq 'claude,t3') 'checkbox-style target selection toggles peer options'
    & (Get-Module oms) {
        param($AppPath,$UiState)
        $script:answers=[Collections.Queue]::new()
        foreach($answer in @('c','','')){$script:answers.Enqueue($answer)}
        Invoke-Oms -Action install -Component pstack-book -StateRoot $UiState -Root $AppPath
    } $app (Join-Path $root 'ui-state') | Out-Null
    Assert (Test-Path -LiteralPath (Join-Path $root 'ui-state/books/pstack-book/reading.md')) 'plan custom-selection path completes without manual configuration'
    $list=Run -Arguments @('list','-Json')|ConvertFrom-Json
    Assert ($list.tools.Count -eq 3 -and $list.environments.Count -eq 3) 'independent tools and peer environments'
    Run -Arguments @('install','pstack','-Environment','codex,t3')|Out-Null
    $record=Get-Content -LiteralPath $recordPath -Raw|ConvertFrom-Json
    Assert ($record.environments.Count -eq 2) 'two target associations'
    Assert ($record.hostConfigRoot -eq (PhysicalPath $env:CODEX_HOME)) 'record binds installation to native config root'
    $correctHome=$env:CODEX_HOME
    try {
        $env:CODEX_HOME=Join-Path $root 'another codex home'
        $beforeCalls=@((ReadDb).calls).Count
        Run -Arguments @('install','pstack','-Environment','codex') -Expected 1|Out-Null
        Run -Arguments @('update','pstack','-Environment','codex') -Expected 1|Out-Null
        Run -Arguments @('uninstall','pstack','-Environment','codex') -Expected 1|Out-Null
        $conflict=Run -Arguments @('status','pstack','-Environment','codex','-Json')|ConvertFrom-Json
        Assert ($conflict[0].Status -eq 'host-config-conflict') 'status identifies changed host config root'
        Assert (@((ReadDb).calls).Count -eq $beforeCalls) 'changed config root cannot install, update or uninstall another host installation'
    } finally { $env:CODEX_HOME=$correctHome }
    $nativeStatus=Run -Arguments @('status','pstack','-Environment','codex','-Json')|ConvertFrom-Json
    Assert ($nativeStatus[0].ConfigRoot -eq (PhysicalPath $env:CODEX_HOME) -and $nativeStatus[0].Source -eq $record.source) 'status reports config root and managed source'

    Assert (@((ReadDb).installed).Count -eq 2) 'T3 covers both available backends without duplicate Codex registration'
    $mapping=Join-Path $record.source 'plugins/pstack/skills/poteto-mode/references/t3-tools.md'
    Assert (Test-Path -LiteralPath $mapping) 'T3 mapping included without a flag'
    Assert ((Get-Content -LiteralPath (Join-Path $record.source 'plugins/pstack/skills/poteto-mode/SKILL.md') -Raw -Encoding UTF8) -like '*Original body — 原文*') 'adaptation preserves non-ASCII upstream text'
    Assert ((Get-Content -LiteralPath (Join-Path $record.source 'plugins/pstack/models.json') -Raw) -eq '{"upstream":"untouched"}') 'upstream models unchanged'
    Run -Arguments @('install','pstack','-Environment','codex')|Out-Null
    Assert (@((ReadDb).calls|Where-Object{$_ -eq 'codex plugin add pstack@pstack-claude'}).Count -eq 1) 'repeat install is idempotent'
    Run -Arguments @('uninstall','pstack','-Environment','codex')|Out-Null
    Assert (@((ReadDb).installed).Count -eq 2) 'T3 dependencies retained when Codex target removed'
    $status=Run -Arguments @('status','pstack','-Environment','t3','-Json')|ConvertFrom-Json
    Assert ($status[0].Status -eq 'restart-required') 'T3 not falsely certified as live-session enabled'
    Run -Arguments @('install','pstack','-Environment','codex')|Out-Null
    $oldSource=(Get-Content -LiteralPath $recordPath -Raw|ConvertFrom-Json).source
    Write-Utf8 $codexPath "# Upstream changed the anchor`n"
    Test-Git -Arguments @('-C',$gitSource,'add','.')|Out-Null;Test-Git -Arguments @('-C',$gitSource,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','breaking anchor')|Out-Null
    Run -Arguments @('update','pstack','-Environment','codex') -Expected 1|Out-Null
    Assert ((Get-Content -LiteralPath $recordPath -Raw|ConvertFrom-Json).source -eq $oldSource) 'adaptation failure preserves old source'
    Write-Utf8 $codexPath "# Codex tool mapping for pstack`n`nNew upstream body`n"
    Test-Git -Arguments @('-C',$gitSource,'add','.')|Out-Null;Test-Git -Arguments @('-C',$gitSource,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','compatible update')|Out-Null
    $db=ReadDb;$db|Add-Member -NotePropertyName failNextInstall -NotePropertyValue $true;SaveDb $db
    Run -Arguments @('update','pstack','-Environment','codex') -Expected 1|Out-Null
    Assert ((Get-Content -LiteralPath $recordPath -Raw|ConvertFrom-Json).source -eq $oldSource) 'failed registration keeps old ownership record'
    $restored=@((ReadDb).installed|Where-Object runtime -eq 'codex')
    Assert ($restored.Count -eq 1 -and $restored[0].marketplaceSource.source -eq $oldSource) 'failed source switch restores old native installation'
    Run -Arguments @('update','pstack','-Environment','codex')|Out-Null
    $newSource=(Get-Content -LiteralPath $recordPath -Raw|ConvertFrom-Json).source
    Assert ($newSource -ne $oldSource -and (Test-Path -LiteralPath $oldSource)) 'update prepares new package and retains old package'
    $modelPath=Join-Path $newSource 'plugins/pstack/models.json'
    Write-Utf8 $modelPath '{"modified":true}'
    Run -Arguments @('update','pstack','-Environment','codex') -Expected 1|Out-Null
    Assert ((Get-Content -LiteralPath $recordPath -Raw|ConvertFrom-Json).source -eq $newSource) 'modified cache is rejected without changing registration record'
    Write-Utf8 $modelPath '{"upstream":"untouched"}'
    Run -Arguments @('install','pstack','-Environment','codex')|Out-Null
    Assert ((Get-Content -LiteralPath $recordPath -Raw|ConvertFrom-Json).source -eq $newSource) 'repeat install does not downgrade updated source'
    Run -Arguments @('uninstall','pstack','-Environment','t3')|Out-Null
    Assert (@((ReadDb).installed).Count -eq 1) 'Codex target retains shared plugin'
    Run -Arguments @('uninstall','pstack','-Environment','codex')|Out-Null
    Assert (-not(Test-Path -LiteralPath $recordPath)) 'last target uninstall removes ownership record'
    Run -Arguments @('install','aihero','-Environment','codex,claude,t3')|Out-Null
    Assert (@((ReadDb).installed).Count -eq 2) 'AIHero native installations shared across targets'
    $db=ReadDb;foreach($entry in $db.installed){if($entry.runtime -eq 'codex'){$entry.enabled=$false}};SaveDb $db
    $disabled=Run -Arguments @('install','aihero','-Environment','codex')
    Assert ($disabled -like '*disabled*') 'completion preserves actual disabled state'
    $db=ReadDb;foreach($entry in $db.installed){$entry.enabled=$true};SaveDb $db
    $env:OMS_TEST_FAIL='upgrade'
    Run -Arguments @('update','aihero','-Environment','codex') -Expected 1|Out-Null
    Assert (Test-Path -LiteralPath (Join-Path $state 'installations/aihero-codex.json')) 'failed native command preserves ownership'
    $env:OMS_TEST_FAIL=''
    Run -Arguments @('uninstall','aihero','-Environment','all')|Out-Null
    Assert (@((ReadDb).installed).Count -eq 0) 'all target uninstall removes both physical installs'
    $db=ReadDb
    $db.installed=@([pscustomobject]@{runtime='codex';id='pstack@pstack-claude';pluginId='pstack@pstack-claude';scope='user';version='existing';enabled=$true;marketplaceSource=@{source='https://github.com/michael-denyer/pstack-claude.git'}})
    SaveDb $db
    Run -Arguments @('install','pstack','-Environment','codex') -Expected 1|Out-Null
    Assert ((ReadDb).installed[0].version -eq 'existing') 'existing unmanaged plugin not adopted or replaced'
    SaveDb @{installed=@();markets=@();calls=@()}
    $claudeCatalogPath=Join-Path $app 'catalog/environments/claude.json'
    $claudeCatalog=Get-Content -LiteralPath $claudeCatalogPath -Raw -Encoding UTF8|ConvertFrom-Json
    $claudeCatalog.command='oms-test-missing-cli'
    Write-Utf8 $claudeCatalogPath ($claudeCatalog|ConvertTo-Json)
    $mixed=Run -Arguments @('install','aihero','-Environment','codex,claude') -Expected 1
    Assert (@((ReadDb).installed).Count -eq 1) 'missing selected host does not prevent independent supported install'
    Assert (($mixed -replace '\s','') -like '*缺少可用宿主*') 'mixed-success report includes concrete failure reason'
    Run -Arguments @('uninstall','aihero','-Environment','codex')|Out-Null
    Run -Arguments @('install','pstack-book')|Out-Null
    $book=Join-Path $state 'books/pstack-book/reading.md'
    Assert (Test-Path -LiteralPath $book) 'books independent of agent environment'
    Write-Utf8 (Join-Path $state 'books/pstack-book/notes.txt') 'personal'
    Run -Arguments @('uninstall','pstack-book')|Out-Null
    Assert (Test-Path -LiteralPath (Join-Path $state 'books/pstack-book/notes.txt')) 'personal notes preserved'
    Write-Utf8 $book 'existing'
    Run -Arguments @('install','pstack-book') -Expected 1|Out-Null
    Assert ((Get-Content -LiteralPath $book -Raw) -eq 'existing') 'unmanaged book collision refused'
    Run -Arguments @('install','../escape') -Expected 1|Out-Null
    Write-Utf8 (Join-Path $newSource 'plugins/pstack/models.json') '{"committedChange":true}'
    Test-Git -Arguments @('-C',$newSource,'add','plugins/pstack/models.json')|Out-Null
    Test-Git -Arguments @('-C',$newSource,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','changed cached HEAD')|Out-Null
    $headRejected=& (Get-Module oms) {
        param($AppPath,$StatePath)
        try{& (Join-Path $AppPath 'installers/pstack.ps1') -Item (Read-Json (Join-Path $AppPath 'catalog/tools/pstack.json')) -StateRoot $StatePath -Root $AppPath -Update;return $false}
        catch{return $_.Exception.Message -like '*HEAD*'}
    } $app $state
    Assert ($headRejected) 'changed-and-committed cache cannot pretend to be locked upstream'
    $downloadState=Join-Path $root 'download-state'
    $downloadResult=& (Get-Module oms) {
        param($AppPath,$StatePath)
        $env:OMS_TEST_BOOK_FAIL='1'
        function script:Invoke-WebRequest {
            param([switch]$UseBasicParsing,[string]$Uri,[string]$OutFile)
            if($env:OMS_TEST_BOOK_FAIL -eq '1' -and $Uri.EndsWith('/second.pdf')){throw 'simulated download failure'}
            [IO.File]::WriteAllText($OutFile,'fixture',[Text.UTF8Encoding]::new($false))
        }
        $sha=[Security.Cryptography.SHA256]::Create()
        try{$hash=[BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes('fixture'))).Replace('-','').ToLower()}finally{$sha.Dispose()}
        $item=[pscustomobject]@{id='pstack-book';readingUrl='https://example.invalid/read';source='https://example.invalid/source';releaseUrl='https://example.invalid/release';authorizationUrl='https://example.invalid/auth';assetBaseUrl='https://example.invalid/assets';assets=@(@{name='first.pdf';sha256=$hash},@{name='second.pdf';sha256=$hash})}
        try{& (Join-Path $AppPath 'installers/book.ps1') -Action install -Item $item -StateRoot $StatePath -DownloadBooks | Out-Null;throw 'expected download failure'}catch{if($_.Exception.Message -ne 'simulated download failure'){throw}}
        $record=Read-Json (Record-Path $StatePath 'pstack-book' 'local')
        $tracked=@($record.files).Count -eq 2 -and 'first.pdf' -in $record.files
        $partials=@(Get-ChildItem (Join-Path $StatePath 'books/pstack-book') -Filter '*.partial').Count
        $env:OMS_TEST_BOOK_FAIL=''
        & (Join-Path $AppPath 'installers/book.ps1') -Action install -Item $item -StateRoot $StatePath -DownloadBooks | Out-Null
        $finished=@((Read-Json (Record-Path $StatePath 'pstack-book' 'local')).files).Count -eq 3
        [pscustomobject]@{Tracked=$tracked;Partials=$partials;Retried=$finished}
    } $app $downloadState
    Assert ($downloadResult.Tracked) 'partial book download records successfully installed files'
    Assert ($downloadResult.Partials -eq 0) 'failed download cleans only its own temporary file'
    Assert ($downloadResult.Retried) 'partial book download can be retried without ownership conflict'
    Write-Output "PASS: $script:passed assertions; isolated fixture $root"
}finally{$env:PATH=$oldPath;$env:OMS_TEST_DB=$oldDb;$env:OMS_TEST_FAIL=$oldFail;$env:OMS_TEST_BOOK_FAIL=$oldBookFail;$env:CODEX_HOME=$oldCodexHome;$env:CLAUDE_CONFIG_DIR=$oldClaudeConfig}
