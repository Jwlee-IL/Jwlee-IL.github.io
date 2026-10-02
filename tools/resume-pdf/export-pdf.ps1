# _data/resume.yml -> resume.docx (임시) -> 저장소 루트의 resume.pdf
# 필요: Node.js, Microsoft Word. 처음 한 번은 이 폴더에서 `npm install` 을 실행한다.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Resolve-Path (Join-Path $here '..\..')
$docx = Join-Path $env:TEMP 'jwlee-resume.docx'

node (Join-Path $here 'build.js') $docx
if ($LASTEXITCODE -ne 0) { throw 'docx 생성 실패' }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open($docx, $false, $true)
  $pages = $doc.ComputeStatistics(2)
  # [string] 필수: Windows PowerShell 5.1에서 Join-Path 결과를 그대로 넘기면 Word가 숨은 창에서 멈춘다
  $doc.SaveAs2([string](Join-Path $root 'resume.pdf'), 17)
  $doc.Close($false)
} finally {
  $word.Quit()
}
Remove-Item $docx
Write-Host "resume.pdf 생성 완료 ($pages 쪽)"
