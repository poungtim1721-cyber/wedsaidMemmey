$path = 'data\jlpt-vocab.js'
$text = [System.IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) {
  $text = $text.Substring(1)
}
$data = ($text.Substring($text.IndexOf('=') + 1).TrimEnd(';') | ConvertFrom-Json)
$cachePath = 'data\jlpt-vocab-th-cache.json'
$cache = @{}
if (Test-Path $cachePath) {
  (Get-Content $cachePath -Raw -Encoding UTF8 | ConvertFrom-Json).psobject.Properties |
    ForEach-Object { $cache[$_.Name] = $_.Value }
}
$items = @($data.PSObject.Properties | ForEach-Object { $_.Value } | ForEach-Object { $_ })
foreach ($item in $items) {
  if ($item.meaningTh -and -not $cache.ContainsKey($item.meaning)) {
    $cache[$item.meaning] = $item.meaningTh
  }
}
$meanings = @($items | ForEach-Object { $_.meaning } | Sort-Object -Unique)
$missing = @($meanings | Where-Object { -not $cache.ContainsKey($_) })
Write-Output "total=$($meanings.Count) cached=$($cache.Count) remaining=$($missing.Count)"
Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(30)
$failures = @()
$batchSize = 40
for ($start = 0; $start -lt $missing.Count; $start += $batchSize) {
  $end = [Math]::Min($start + $batchSize - 1, $missing.Count - 1)
  $batch = @($missing[$start..$end])
  $url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=' +
    [Uri]::EscapeDataString(($batch -join "`n"))
  $attempt = 0
  $translatedBatch = $false
  while (-not $translatedBatch -and $attempt -lt 5) {
    $attempt++
    try {
      $responseMessage = $client.GetAsync($url).GetAwaiter().GetResult()
      if (-not $responseMessage.IsSuccessStatusCode) {
        throw "Translation service returned HTTP $([int]$responseMessage.StatusCode)."
      }
      $response = $responseMessage.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
      $translatedText = (($response[0] | ForEach-Object { $_[0] }) -join '')
      $translations = @($translatedText -split "`n")
      if ($translations.Count -ne $batch.Count) {
        throw "Expected $($batch.Count) translated phrases but received $($translations.Count)."
      }
      for ($index = 0; $index -lt $batch.Count; $index++) {
        $translated = $translations[$index].Trim()
        if ([string]::IsNullOrWhiteSpace($translated)) {
          throw "The translation service returned an empty result for '$($batch[$index])'."
        }
        $cache[$batch[$index]] = $translated
      }
      $translatedBatch = $true
    } catch {
      if ($attempt -eq 5) {
        $failures += "Batch $($start + 1)-$($start + $batch.Count): $($_.Exception.Message)"
      } else {
        Start-Sleep -Seconds ([Math]::Min(300, 30 * [Math]::Pow(2, $attempt - 1)))
      }
    }
  }
  $cacheJson = $cache | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($cachePath, $cacheJson, [Text.Encoding]::UTF8)
  if ($failures.Count -gt 0) {
    throw "Translation failed for $($failures.Count) meaning(s). The cache was saved to $cachePath. First error: $($failures[0])"
  }
  Write-Output "translated=$([Math]::Min($start + $batch.Count, $missing.Count))"
  Start-Sleep -Milliseconds 350
}
foreach ($item in $items) {
  $item | Add-Member -MemberType NoteProperty -Name meaningTh -Value $cache[$item.meaning] -Force
}
$encoded = $data | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($path, 'window.jlptVocabulary = ' + $encoded + ';', [System.Text.UTF8Encoding]::new($false))
if (Test-Path $cachePath) {
  Remove-Item -LiteralPath $cachePath
}
Write-Output 'complete'
