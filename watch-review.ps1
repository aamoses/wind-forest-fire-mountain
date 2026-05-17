$reviewUrl = "https://www.coze.cn/s/oF4Fp5s_gnU/"
while ($true) {
  git pull --quiet 2>$null
  try {
    $content = (Invoke-WebRequest -Uri $reviewUrl -UseBasicParsing -TimeoutSec 10).Content
    $existing = if (Test-Path "REVIEW.md") { Get-Content "REVIEW.md" -Raw } else { "" }
    if ($content -and ($content -ne $existing)) {
      $content | Out-File "REVIEW.md" -Encoding utf8
      Write-Host "[$((Get-Date -Format 'HH:mm'))] review updated"
    }
  } catch {}
  Start-Sleep -Seconds 300
}