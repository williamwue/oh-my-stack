param($Item, [string] $StateRoot, [string] $Root, [switch] $Update)
$revision = $Item.revision
if ($Update) {
    $line = Invoke-Native git @('ls-remote',$Item.source,"refs/heads/$($Item.branch)")
    $revision = ($line -split '\s+')[0]
}
if ($revision -notmatch '^[a-f0-9]{40}$') { throw '上游提交无效。' }
$mapping = Join-Path $Root 'integrations/pstack/t3/t3-tools.md'
$adapter = Join-Path $Root 'integrations/pstack/apply.ps1'
$hashInput = (Get-FileHash -LiteralPath $mapping -Algorithm SHA256).Hash + (Get-FileHash -LiteralPath $adapter -Algorithm SHA256).Hash
$sha=[Security.Cryptography.SHA256]::Create()
try{$hash=[BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($hashInput))).Replace('-','')}finally{$sha.Dispose()}
$packageKey = $revision.Substring(0,12) + '-' + $hash.Substring(0,12)
$destination = Join-Path $StateRoot "packages/pstack/$packageKey"
$marker = Join-Path $destination 'OMS-PACKAGE.json'
if (Test-Path -LiteralPath $marker) {
    $receipt = Read-Json $marker
    if ($receipt.source -ne $Item.source -or $receipt.revision -ne $revision -or $receipt.adaptation -ne $hash) { throw '本地包记录不匹配。' }
    if((Invoke-Native git @('-C',$destination,'rev-parse','HEAD')) -ne $revision){throw '本地包 HEAD 与锁定上游提交不一致。'}
    $allowed=@('OMS-PACKAGE.json','plugins/pstack/skills/poteto-mode/SKILL.md','plugins/pstack/skills/poteto-mode/references/codex-tools.md','plugins/pstack/skills/poteto-mode/references/t3-tools.md')
    $status=Invoke-Native git @('-C',$destination,'status','--porcelain','--untracked-files=all')
    foreach($line in @($status -split "`n"|Where-Object {$_})){if($line.Substring(3) -notin $allowed){throw '本地包含有非适配修改，拒绝复用。'}}
    & $adapter -SourceRoot $destination -Mapping $mapping -Check
    return $destination
}
if (Test-Path -LiteralPath $destination) { throw '存在未完成的包目录；保留该目录，请检查后重新准备。' }
$staging = Join-Path (Split-Path -Parent $destination) ('.stage-' + [guid]::NewGuid().ToString('N').Substring(0,8))
[IO.Directory]::CreateDirectory($staging) | Out-Null
Invoke-Native git @('init','--quiet',$staging) | Out-Null
Invoke-Native git @('-C',$staging,'config','core.autocrlf','false') | Out-Null
Invoke-Native git @('-C',$staging,'config','core.longpaths','true') | Out-Null
Invoke-Native git @('-C',$staging,'remote','add','origin',$Item.source) | Out-Null
Invoke-Native git @('-C',$staging,'fetch','--depth','1','origin',$revision) | Out-Null
Invoke-Native git @('-C',$staging,'checkout','--quiet','--detach','FETCH_HEAD') | Out-Null
if((Invoke-Native git @('-C',$staging,'rev-parse','HEAD')) -ne $revision -or (Invoke-Native git @('-C',$staging,'status','--porcelain'))){throw '上游检出不完整，未注册到宿主。'}
& $adapter -SourceRoot $staging -Mapping $mapping
Write-Json (Join-Path $staging 'OMS-PACKAGE.json') @{ source=$Item.source; revision=$revision; adaptation=$hash }
[IO.Directory]::Move($staging,$destination)
$destination
