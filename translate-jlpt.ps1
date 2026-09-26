$path = 'data\jlpt-vocab.js'
$text = [System.IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
$data = ($text.Substring($text.IndexOf('=') + 1).TrimEnd(';') | ConvertFrom-Json)
$cachePath = 'data\jlpt-vocab-th-cache.json'
$cache = @{}
if (Test-Path $cachePath) {
  (Get-Content $cachePath -Raw -Encoding UTF8 | ConvertFrom-Json).psobject.Properties |
    ForEach-Object { $cache[$_.Name] = $_.Value }
}
$meanings = @($data.PSObject.Properties | ForEach-Object { $_.Value } | ForEach-Object { $_.meaning } | Sort-Object -Unique)
$missing = @($meanings | Where-Object { -not $cache.ContainsKey($_) })
Write-Output "total=$($meanings.Count) cached=$($cache.Count) remaining=$($missing.Count)"
$client = New-Object System.Net.Http.HttpClient
for ($start = 0; $start -lt $missing.Count; $start += 20) {
  $end = [Math]::Min($start + 19, $missing.Count - 1)
  $batch = @($missing[$start..$end])
  $tasks = @{}
  foreach ($meaning in $batch) {
    $url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=' + [Uri]::EscapeDataString($meaning)
    $tasks[$meaning] = $client.GetStringAsync($url)
  }
  foreach ($meaning in $batch) {
    try {
      $raw = $tasks[$meaning].GetAwaiter().GetResult() | ConvertFrom-Json
      $cache[$meaning] = (($raw[0] | ForEach-Object { $_[0] }) -join '')
    } catch {
      $cache[$meaning] = $meaning
    }
  }
  if ((($start + $batch.Count) % 100) -eq 0) {
    $cache | ConvertTo-Json -Compress | Set-Content $cachePath -Encoding UTF8
    Write-Output "translated=$($start + $batch.Count)"
  }
}
$cache | ConvertTo-Json -Compress | Set-Content $cachePath -Encoding UTF8
foreach ($level in $data.PSObject.Properties) {
  foreach ($item in $level.Value) {
    $item.meaning = $cache[$item.meaning]
  }
}
$encoded = $data | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText($path, 'window.jlptVocabulary = ' + $encoded + ';', [Text.Encoding]::UTF8)
Write-Output 'complete'
