param(
  [Parameter(Mandatory = $true)]
  [string]$ImagePath
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$OutputEncoding = [Console]::OutputEncoding

function ConvertTo-JsonLine($payload) {
  $payload | ConvertTo-Json -Compress -Depth 5
}

try {
  if (-not (Test-Path -LiteralPath $ImagePath)) {
    ConvertTo-JsonLine @{ ok = $false; text = ""; error = "image not found" }
    exit 0
  }

  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  [void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
  [void][Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
  [void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  [void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]

  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq "AsTask" -and
      $_.IsGenericMethod -and
      $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1)

  function Await-WinRt($operation, [Type]$resultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($resultType)
    $task = $asTask.Invoke($null, @($operation))
    $task.Wait()
    return $task.Result
  }

  $file = Await-WinRt ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
  $stream = Await-WinRt ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-WinRt ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-WinRt ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

  $languages = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
  $candidateTags = @("zh-Hans-CN", "zh-CN", "en-US")
  $engine = $null

  foreach ($tag in $candidateTags) {
    try {
      $language = New-Object Windows.Globalization.Language $tag
      $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
      if ($engine) { break }
    } catch {}
  }

  if (-not $engine) {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  }

  if (-not $engine) {
    ConvertTo-JsonLine @{
      ok = $false
      text = ""
      error = "Windows OCR engine is unavailable. Please install Chinese Simplified OCR language support in Windows Settings."
    }
    exit 0
  }

  $result = Await-WinRt ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $lines = @()
  foreach ($line in $result.Lines) {
    if ($line.Text) { $lines += $line.Text }
  }

  ConvertTo-JsonLine @{
    ok = $true
    text = ($lines -join "`n")
    lineCount = $lines.Count
  }
} catch {
  ConvertTo-JsonLine @{
    ok = $false
    text = ""
    error = $_.Exception.Message
  }
}
