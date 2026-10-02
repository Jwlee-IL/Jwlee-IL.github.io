# portfolio-print.html(인쇄 전용 페이지)을 A4 PDF로 뽑는다.
# 필요: Jekyll, Microsoft Edge. 기본 출력은 저장소 루트의 portfolio.pdf (사이트 메뉴의 '포트폴리오 PDF').
param([string]$Out = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')) 'portfolio.pdf'))
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$build = Join-Path $env:TEMP 'jwlee-site-build'

Push-Location $root
try { jekyll build -q -d $build } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw 'jekyll build 실패' }

$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge를 찾지 못했습니다' }

$page = 'file:///' + (Join-Path $build 'portfolio-print.html').Replace([char]92, [char]47)
$p = Start-Process $edge -PassThru -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--virtual-time-budget=12000', '--no-pdf-header-footer', "--print-to-pdf=$Out", $page)
if (-not $p.WaitForExit(90000)) { $p.Kill(); throw 'Edge 인쇄가 90초 안에 끝나지 않았습니다' }
Write-Host "포트폴리오 PDF 생성: $Out"
