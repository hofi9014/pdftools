# Opens documents in the installed Microsoft Office through COM, without windows or dialogs, and
# reports what it found. Driven by e2e/helpers/msoffice.mts; one JSON job file in, one JSON out.
#
# Job: { "app": "word" | "excel" | "powerpoint", "items": [ { "in": "...", "pdf": "..." | null } ] }
# Out: [ { "in": "...", "ok": true, "error": null, "pages": n, "sheets": [...], "slides": n } ]
#
# Every file is opened read-only with repair turned off: a document Office would have to repair
# makes Open throw, which is exactly what the tests want to see.
param([Parameter(Mandatory = $true)][string]$JobFile, [Parameter(Mandatory = $true)][string]$OutFile)

$ErrorActionPreference = 'Stop'
$job = Get-Content -LiteralPath $JobFile -Raw -Encoding UTF8 | ConvertFrom-Json
$results = @()

function Release($o) { if ($null -ne $o) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($o) } }

if ($job.app -eq 'word') {
  $app = New-Object -ComObject Word.Application
  $app.Visible = $false
  $app.DisplayAlerts = 0          # wdAlertsNone
  try {
    foreach ($it in $job.items) {
      $r = [ordered]@{ in = $it.in; ok = $false; error = $null; pages = $null }
      $doc = $null
      try {
        # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles, PasswordDocument,
        #      PasswordTemplate, Revert, WritePasswordDocument, WritePasswordTemplate, Format,
        #      Encoding, Visible, OpenAndRepair, DocumentDirection, NoEncodingDialog)
        $doc = $app.Documents.Open($it.in, $false, $true, $false, '', '', $false, '', '', 0, [Type]::Missing, $false, $false, 0, $true)
        $r.pages = $doc.ComputeStatistics(2)   # wdStatisticPages
        if ($it.pdf) { $doc.ExportAsFixedFormat($it.pdf, 17) }  # wdExportFormatPDF
        $r.ok = $true
      } catch { $r.error = $_.Exception.Message }
      finally { if ($doc) { $doc.Close(0); Release $doc } }
      $results += [pscustomobject]$r
    }
  } finally { $app.Quit(); Release $app }
}
elseif ($job.app -eq 'excel') {
  $app = New-Object -ComObject Excel.Application
  $app.Visible = $false
  $app.DisplayAlerts = $false
  try {
    foreach ($it in $job.items) {
      $r = [ordered]@{ in = $it.in; ok = $false; error = $null; sheets = @() }
      $wb = $null
      try {
        # Open(FileName, UpdateLinks, ReadOnly, Format, Password, WriteResPassword,
        #      IgnoreReadOnlyRecommended, Origin, Delimiter, Editable, Notify, Converter,
        #      AddToMru, Local). CorruptLoad is left out: Excel 16 rejects every call that passes
        #      it (even with a valid workbook). The default load does not repair silently either:
        #      with alerts off, a workbook Excel would have to repair (overlapping merges, no
        #      sheets) fails to open — measured.
        $m = [System.Reflection.Missing]::Value
        $wb = $app.Workbooks.Open($it.in, 0, $true, $m, $m, $m, $true, $m, $m, $false, $false, $m, $false, $false)
        foreach ($ws in $wb.Worksheets) {
          $used = $ws.UsedRange
          $rows = $used.Rows.Count; $cols = $used.Columns.Count
          $r0 = $used.Row; $c0 = $used.Column
          $cells = @()
          for ($i = 0; $i -lt $rows; $i++) {
            for ($j = 0; $j -lt $cols; $j++) {
              $c = $ws.Cells.Item($r0 + $i, $c0 + $j)
              $v = $c.Value2
              if ($null -ne $v -and "$v" -ne '') {
                $cells += [pscustomobject]@{ r = $r0 + $i; c = $c0 + $j; text = $c.Text; number = ($v -is [double]); value = "$v"; merged = [bool]$c.MergeCells }
              }
              Release $c
            }
          }
          $merges = 0
          $r.sheets += [pscustomobject]@{ name = $ws.Name; rows = $r0 + $rows - 1; cols = $c0 + $cols - 1; cells = $cells }
          Release $used; Release $ws
        }
        if ($it.pdf) { $wb.ExportAsFixedFormat(0, $it.pdf) }   # xlTypePDF
        $r.ok = $true
      } catch { $r.error = $_.Exception.Message }
      finally { if ($wb) { $wb.Close($false); Release $wb } }
      $results += [pscustomobject]$r
    }
  } finally { $app.Quit(); Release $app }
}
elseif ($job.app -eq 'powerpoint') {
  $app = New-Object -ComObject PowerPoint.Application
  $app.DisplayAlerts = 1          # ppAlertsNone
  try {
    foreach ($it in $job.items) {
      $r = [ordered]@{ in = $it.in; ok = $false; error = $null; slides = $null }
      $pres = $null
      try {
        # Open(FileName, ReadOnly, Untitled, WithWindow)
        $pres = $app.Presentations.Open($it.in, -1, 0, 0)
        $r.slides = $pres.Slides.Count
        if ($it.pdf) { $pres.SaveAs($it.pdf, 32) }   # ppSaveAsPDF
        $r.ok = $true
      } catch { $r.error = $_.Exception.Message }
      finally { if ($pres) { $pres.Close(); Release $pres } }
      $results += [pscustomobject]$r
    }
  } finally { $app.Quit(); Release $app }
}
else { throw "unknown app $($job.app)" }

ConvertTo-Json -InputObject @($results) -Depth 8 -Compress | Set-Content -LiteralPath $OutFile -Encoding UTF8
