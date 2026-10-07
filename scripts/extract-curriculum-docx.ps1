param(
  [string]$SourceDirectory = "..",
  [string]$OutputDirectory = "data"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$subjectDefinitions = @(
  @{ File = '1. ภาษาไทย.docx'; Id = 'thai'; Name = 'ภาษาไทย'; Prefix = 'ท' },
  @{ File = '2. คณิตศาสตร์.docx'; Id = 'math'; Name = 'คณิตศาสตร์'; Prefix = 'ค' },
  @{ File = '3. วิทยาศาสตร์และเทคโนโลยี.docx'; Id = 'science'; Name = 'วิทยาศาสตร์และเทคโนโลยี'; Prefix = 'ว' },
  @{ File = '4. สังคมศึกษา ศาสนา และวัฒนธรรม.docx'; Id = 'social'; Name = 'สังคมศึกษา ศาสนา และวัฒนธรรม'; Prefix = 'ส' },
  @{ File = '5. สุขพลศึกษาและพลศึกษา.docx'; Id = 'health'; Name = 'สุขศึกษาและพลศึกษา'; Prefix = 'พ' },
  @{ File = '6. การงานอาชีพ.docx'; Id = 'career'; Name = 'การงานอาชีพ'; Prefix = 'ง' },
  @{ File = '7. ศิลปะ.docx'; Id = 'arts'; Name = 'ศิลปะ'; Prefix = 'ศ' },
  @{ File = '8. ต่างประเทศ.docx'; Id = 'foreign'; Name = 'ภาษาต่างประเทศ'; Prefix = 'ต' }
)

$gradeOrder = @('ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6')
$digitMap = @{ '๐'='0'; '๑'='1'; '๒'='2'; '๓'='3'; '๔'='4'; '๕'='5'; '๖'='6'; '๗'='7'; '๘'='8'; '๙'='9' }

function Convert-ThaiDigits([string]$Value) {
  if ($null -eq $Value) { return '' }
  foreach ($key in $digitMap.Keys) { $Value = $Value.Replace($key, $digitMap[$key]) }
  return $Value
}

function Clean-Text([string]$Value) {
  $Value = Convert-ThaiDigits $Value
  $Value = $Value -replace '[\u00A0\u200B\u200C\u200D\uFEFF]', ' '
  $Value = $Value -replace '\s+', ' '
  $Value = $Value -replace '^[-–—|\s]+', ''
  $Value = $Value -replace '[-–—|\s]+$', ''
  return $Value.Trim()
}

function Read-DocumentBody([string]$Path) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $zip.GetEntry('word/document.xml')
    $reader = [System.IO.StreamReader]::new($entry.Open())
    try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
  } finally { $zip.Dispose() }

  $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $items = [System.Collections.Generic.List[object]]::new()
  foreach ($node in $xml.SelectNodes('//w:body/*', $ns)) {
    if ($node.LocalName -eq 'p') {
      $text = Clean-Text ((@($node.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join ''))
      if ($text) { $items.Add([pscustomobject]@{ Kind='paragraph'; Text=$text; Cells=@() }) }
    } elseif ($node.LocalName -eq 'tbl') {
      foreach ($row in $node.SelectNodes('./w:tr', $ns)) {
        $cells = @()
        foreach ($cell in $row.SelectNodes('./w:tc', $ns)) {
          $paragraphs = @()
          foreach ($paragraph in $cell.SelectNodes('.//w:p', $ns)) {
            $paragraphText = Clean-Text ((@($paragraph.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join ''))
            if ($paragraphText) { $paragraphs += $paragraphText }
          }
          $cells += ($paragraphs -join "`n")
        }
        if (($cells -join '').Trim()) { $items.Add([pscustomobject]@{ Kind='row'; Text=($cells -join ' | '); Cells=$cells }) }
      }
    }
  }
  return $items
}

function Get-GradesFromCode([string]$Level, [string]$Number) {
  $numberValue = ((Clean-Text $Number) -replace '[–—]', '-') -replace '\s', ''
  if ($numberValue -match '^4-6$') { return @('ม.4','ม.5','ม.6') }
  return @("$Level.$numberValue")
}

$standardsByKey = @{}
$indicatorsByKey = @{}
$subjectSummaries = @()
$indicatorCollisions = [System.Collections.Generic.List[object]]::new()

foreach ($subject in $subjectDefinitions) {
  $sourcePath = Join-Path $SourceDirectory $subject.File
  if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Missing source document: $sourcePath" }
  $items = Read-DocumentBody (Resolve-Path -LiteralPath $sourcePath).Path
  $currentGrade = ''
  $currentStrand = ''
  $currentStandardCode = ''
  $subjectIndicatorKeys = [System.Collections.Generic.HashSet[string]]::new()
  $subjectStandardKeys = [System.Collections.Generic.HashSet[string]]::new()

  foreach ($item in $items) {
    $contextText = Clean-Text $item.Text
    if ($contextText -match 'ชั้น\s*มัธยมศึกษาปีที่\s*4\s*[-–—]\s*6') { $currentGrade = 'ม.4-6' }
    elseif ($contextText -match 'ชั้น\s*ประถมศึกษาปีที่\s*([1-6])') { $currentGrade = "ป.$($Matches[1])" }
    elseif ($contextText -match 'ชั้น\s*มัธยมศึกษาปีที่\s*([1-6])') { $currentGrade = "ม.$($Matches[1])" }
    if ($contextText -match '^(สาระที่\s*[0-9]+\s*.+)$') { $currentStrand = Clean-Text $Matches[1] }

    $textsToScan = if ($item.Kind -eq 'row') { @($item.Cells) } else { @($item.Text) }
    foreach ($scanTextRaw in $textsToScan) {
      $scanText = Clean-Text $scanTextRaw
      if (-not $scanText) { continue }

      $standardPattern = 'มาตรฐาน\s*([ก-๙])\s*\.?\s*([0-9]+)\s*\.\s*([0-9]+)\s*\.?\s*(.*?)(?=มาตรฐาน\s*[ก-๙]\s*\.?\s*[0-9]+\s*\.|$)'
      foreach ($match in [regex]::Matches($scanText, $standardPattern)) {
        $prefix = $match.Groups[1].Value
        if ($prefix -ne $subject.Prefix) { continue }
        $code = "$prefix $($match.Groups[2].Value).$($match.Groups[3].Value)"
        $currentStandardCode = $code
        $key = "$($subject.Id):$code"
        $description = Clean-Text $match.Groups[4].Value
        $description = $description -replace '^[:\-\s]+', ''
        if (-not $standardsByKey.ContainsKey($key)) {
          $standardsByKey[$key] = [ordered]@{
            id = "$($subject.Id)-$($match.Groups[2].Value).$($match.Groups[3].Value)"
            code = $code
            subject_id = $subject.Id
            subject = $subject.Name
            strand = $currentStrand
            text = $description
            grades = [System.Collections.Generic.HashSet[string]]::new()
            verification_status = 'verified_from_supplied_docx'
            source = [ordered]@{ document = $subject.File }
          }
        } elseif ($description.Length -gt ([string]$standardsByKey[$key].text).Length) {
          $standardsByKey[$key].text = $description
        }
        if ($currentGrade) {
          if ($currentGrade -eq 'ม.4-6') { @('ม.4','ม.5','ม.6') | ForEach-Object { [void]$standardsByKey[$key].grades.Add($_) } }
          else { [void]$standardsByKey[$key].grades.Add($currentGrade) }
        }
        [void]$subjectStandardKeys.Add($key)
      }

      $scanText = $scanText -replace '(ป|ม)\.\s*/\s*([0-9])([0-9])', '$1.$2/$3'
      $indicatorPattern = '(?:([ก-๙])\s*\.?\s*([0-9]+)\s*\.\s*([0-9]+)\s*\.?\s*)?(ป|ม)\s*\.?\s*([0-9]+(?:\s*[-–—]\s*[0-9]+)?)\s*/\s*([0-9]+)'
      $indicatorMatches = [regex]::Matches($scanText, $indicatorPattern)
      for ($index = 0; $index -lt $indicatorMatches.Count; $index++) {
        $indicatorMatch = $indicatorMatches[$index]
        $prefix = $indicatorMatch.Groups[1].Value
        if ($prefix -and $prefix -ne $subject.Prefix) { continue }
        $standardCode = if ($prefix) { "$prefix $($indicatorMatch.Groups[2].Value).$($indicatorMatch.Groups[3].Value)" } else { $currentStandardCode }
        if (-not $standardCode) { continue }
        $start = $indicatorMatch.Index + $indicatorMatch.Length
        $end = if ($index + 1 -lt $indicatorMatches.Count) { $indicatorMatches[$index + 1].Index } else { $scanText.Length }
        $description = Clean-Text $scanText.Substring($start, $end - $start)
        $description = $description -replace '^[:\-\s]+', ''
        $description = $description -replace '(รวม\s*[0-9]+\s*ตัวชี้วัด.*)$', ''
        $gradeLevel = $indicatorMatch.Groups[4].Value
        $gradeNumber = (($indicatorMatch.Groups[5].Value -replace '[–—]', '-') -replace '\s', '')
        if ($currentGrade -eq 'ม.4-6') { $gradeLevel = 'ม'; $gradeNumber = '4-6' }
        elseif ($subject.Id -ne 'career' -and $currentGrade -match '^(ป|ม)\.([1-6])$') { $gradeLevel = $Matches[1]; $gradeNumber = $Matches[2] }
        $indicatorNumber = $indicatorMatch.Groups[6].Value
        $sourceCode = "$standardCode $gradeLevel.$gradeNumber/$indicatorNumber"
        $standardKey = "$($subject.Id):$standardCode"
        $standardNumbers = [regex]::Match($standardCode, '([0-9]+)\.([0-9]+)')
        $standardId = "$($subject.Id)-$($standardNumbers.Groups[1].Value).$($standardNumbers.Groups[2].Value)"
        $indicatorType = 'unspecified'
        if ($item.Kind -eq 'row') {
          $cellIndex = [array]::IndexOf([object[]]$item.Cells, $scanTextRaw)
          if ($cellIndex -eq 1) { $indicatorType = 'ระหว่างทาง' }
          elseif ($cellIndex -ge 2) { $indicatorType = 'ปลายทาง' }
        }
        foreach ($grade in (Get-GradesFromCode $gradeLevel $gradeNumber)) {
          $baseKey = "$($subject.Id):$($sourceCode):$grade"
          $key = $baseKey
          $idSuffix = ''
          if ($indicatorsByKey.ContainsKey($key)) {
            $existingComparable = ([string]$indicatorsByKey[$key].text) -replace '\s+', ''
            $incomingComparable = $description -replace '\s+', ''
            if ($incomingComparable -and $incomingComparable -ne $existingComparable) {
              $indicatorCollisions.Add([pscustomobject]@{ Subject=$subject.Id; Grade=$grade; Code=$sourceCode; Existing=$indicatorsByKey[$key].text; Incoming=$description })
              $alternate = 2
              while ($indicatorsByKey.ContainsKey("$($baseKey):alt$alternate")) { $alternate++ }
              $key = "$($baseKey):alt$alternate"
              $idSuffix = "-alt$alternate"
            }
          }
          if (-not $indicatorsByKey.ContainsKey($key)) {
            $gradeSlug = $grade.Replace('.','').Replace('-','')
            $indicatorsByKey[$key] = [ordered]@{
              id = "$($subject.Id)-$($standardNumbers.Groups[1].Value).$($standardNumbers.Groups[2].Value)-$gradeSlug-$indicatorNumber$idSuffix"
              code = $sourceCode
              standard_id = $standardId
              subject_id = $subject.Id
              subject = $subject.Name
              grade = $grade
              source_grade = "$gradeLevel.$gradeNumber"
              type = $indicatorType
              text = $description
              strand = $currentStrand
              verification_status = 'verified_from_supplied_docx'
              source = [ordered]@{ document = $subject.File }
            }
          } elseif ($description.Length -gt ([string]$indicatorsByKey[$key].text).Length) { $indicatorsByKey[$key].text = $description }
          [void]$subjectIndicatorKeys.Add($key)
          if (-not $standardsByKey.ContainsKey($standardKey)) {
            $standardsByKey[$standardKey] = [ordered]@{
              id = $standardId; code = $standardCode; subject_id = $subject.Id; subject = $subject.Name
              strand = $currentStrand; text = ''; grades = [System.Collections.Generic.HashSet[string]]::new()
              verification_status = 'verified_from_supplied_docx'; source = [ordered]@{ document = $subject.File }
            }
          }
          [void]$standardsByKey[$standardKey].grades.Add($grade)
          [void]$subjectStandardKeys.Add($standardKey)
        }
      }
    }
  }

  $gradeCounts = [ordered]@{}
  foreach ($grade in $gradeOrder) {
    $gradeCounts[$grade] = @($subjectIndicatorKeys | Where-Object { $indicatorsByKey[$_].grade -eq $grade }).Count
  }
  $subjectSummaries += [ordered]@{
    id = $subject.Id; name = $subject.Name; prefix = $subject.Prefix; source_document = $subject.File
    standards = $subjectStandardKeys.Count; indicators_by_grade = $gradeCounts
  }
}

$standards = @($standardsByKey.Values | ForEach-Object {
  $_.grades = @($_.grades | Sort-Object { [array]::IndexOf($gradeOrder, $_) })
  [pscustomobject]$_
} | Sort-Object subject_id, code)
$indicators = @($indicatorsByKey.Values | Sort-Object subject_id, @{Expression={ [array]::IndexOf($gradeOrder, $_.grade) }}, code)

$catalog = [ordered]@{
  metadata = [ordered]@{
    curriculum = 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551'
    source_type = 'supplied_docx'
    generated_at = (Get-Date).ToString('s')
    grade_policy = 'ตัวชี้วัด ม.4-6 ถูกทำซ้ำสำหรับตัวกรอง ม.4 ม.5 และ ม.6 โดยคงรหัสต้นฉบับ'
    total_subjects = $subjectDefinitions.Count
    total_standards = $standards.Count
    total_indicators = $indicators.Count
  }
  grades = $gradeOrder
  subjects = $subjectSummaries
  standards = $standards
  indicators = $indicators
}

$resolvedOutput = Join-Path (Get-Location) $OutputDirectory
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$jsonOptions = @{ Depth = 12 }
$catalog | ConvertTo-Json @jsonOptions | Set-Content -LiteralPath (Join-Path $resolvedOutput 'curriculum_catalog.json') -Encoding utf8
[ordered]@{ metadata = $catalog.metadata; grades = $gradeOrder; subjects = $subjectSummaries } | ConvertTo-Json @jsonOptions | Set-Content -LiteralPath (Join-Path $resolvedOutput 'curriculum_index.json') -Encoding utf8
[ordered]@{ metadata = $catalog.metadata; standards = $standards } | ConvertTo-Json @jsonOptions | Set-Content -LiteralPath (Join-Path $resolvedOutput 'standards.json') -Encoding utf8
[ordered]@{ metadata = $catalog.metadata; indicators = $indicators } | ConvertTo-Json @jsonOptions | Set-Content -LiteralPath (Join-Path $resolvedOutput 'indicators.json') -Encoding utf8

Write-Output "Extracted $($standards.Count) standards and $($indicators.Count) grade-filtered indicators."
foreach ($summary in $subjectSummaries) {
  $nonZeroGrades = @($summary.indicators_by_grade.GetEnumerator() | Where-Object Value -gt 0 | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ', '
  Write-Output "$($summary.name): $($summary.standards) standards; $nonZeroGrades"
}
if ($indicatorCollisions.Count) {
  Write-Output "Indicator code collisions with different text: $($indicatorCollisions.Count)"
  $indicatorCollisions | Where-Object Subject -eq 'social' | Select-Object -First 12 | ForEach-Object { Write-Output "$($_.Grade) $($_.Code) :: $($_.Existing) <> $($_.Incoming)" }
}










