param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "import")
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

function Write-CsvFile {
  param(
    [string]$Path,
    [object[]]$Rows,
    [string[]]$Headers
  )

  if ($Rows.Count -gt 0) {
    $csvLines = $Rows | Select-Object $Headers | ConvertTo-Csv -NoTypeInformation
  } else {
    $csvLines = ,('"'+($Headers -join '","')+'"')
  }
  [System.IO.File]::WriteAllLines($Path, $csvLines, [System.Text.UTF8Encoding]::new($false))
}

$vocabularyText = [System.IO.File]::ReadAllText((Join-Path $projectRoot "data\jlpt-vocab.js"))
$vocabularyMatch = [regex]::Match($vocabularyText, '(?s)^\s*window\.jlptVocabulary\s*=\s*(\{.*\})\s*;\s*$')
if (-not $vocabularyMatch.Success) {
  throw "Could not parse data\jlpt-vocab.js as a JLPT vocabulary object."
}
$vocabulary = $vocabularyMatch.Groups[1].Value | ConvertFrom-Json
$seenVocabulary = @{}
$vocabularyRows = foreach ($level in @("N5", "N4", "N3", "N2", "N1")) {
  foreach ($entry in $vocabulary.$level) {
    $key = "$level`0$($entry.word)`0$($entry.reading)"
    if ($seenVocabulary.ContainsKey($key)) {
      continue
    }
    $seenVocabulary[$key] = $true
    [pscustomobject]@{
      level = $level
      word = $entry.word
      reading = $entry.reading
      meaning = $entry.meaning
    }
  }
}
Write-CsvFile (Join-Path $OutputDirectory "jlpt_vocabulary.csv") $vocabularyRows @("level", "word", "reading", "meaning")

$kanjiText = [System.IO.File]::ReadAllText((Join-Path $projectRoot "data\kanji-readings.json"))
$kanjiSource = $kanjiText | ConvertFrom-Json
$kanjiRows = foreach ($entry in $kanjiSource.PSObject.Properties) {
  $levelNumber = $entry.Value.jlpt_new
  if ($levelNumber -notin 1, 2, 3, 4, 5) {
    continue
  }
  $on = @($entry.Value.readings_on | ForEach-Object { '"' + $_.Replace('\', '\\').Replace('"', '\"') + '"' }) -join ","
  $kun = @($entry.Value.readings_kun | ForEach-Object { '"' + $_.Replace('\', '\\').Replace('"', '\"') + '"' }) -join ","
  [pscustomobject]@{
    level = "N$levelNumber"
    character = $entry.Name
    readings_on = "{$on}"
    readings_kun = "{$kun}"
    meaning = (@($entry.Value.meanings) -join "; ")
  }
}
Write-CsvFile (Join-Path $OutputDirectory "jlpt_kanji.csv") $kanjiRows @("level", "character", "readings_on", "readings_kun", "meaning")
Write-CsvFile (Join-Path $OutputDirectory "jlpt_grammar_template.csv") @() @("level", "pattern", "reading", "meaning", "explanation", "example_jp", "example_th", "sort_order")

Write-Output "CSV files written to $OutputDirectory"
