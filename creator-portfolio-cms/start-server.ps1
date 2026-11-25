<#
.SYNOPSIS
  Zero-dependency local web server & CMS file persistence API for StoryFrame Portfolio + CMS.
  Requires only built-in Windows PowerShell (.NET HttpListener) - no Node.js or Python needed.
#>
param(
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataFile = Join-Path $RootDir "data\cms-content.json"
$UploadsDir = Join-Path $RootDir "uploads"

if (-not (Test-Path $UploadsDir)) {
  New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
}

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".yml"  = "text/yaml; charset=utf-8"
  ".yaml" = "text/yaml; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".gif"  = "image/gif"
  ".ico"  = "image/x-icon"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
  ".mov"  = "video/quicktime"
}

$Listener = New-Object System.Net.HttpListener
$Prefix = "http://localhost:$Port/"
$Listener.Prefixes.Add($Prefix)

try {
  $Listener.Start()
} catch {
  Write-Host "Could not bind to $Prefix : $_" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor DarkYellow
Write-Host "  Portfolio + CMS Server running at:" -ForegroundColor White
Write-Host "  Portfolio : http://localhost:$Port/" -ForegroundColor Green
Write-Host "  CMS Portal: http://localhost:$Port/admin.html" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host "====================================================" -ForegroundColor DarkYellow
Write-Host ""

function Send-JsonResponse($Response, [int]$StatusCode, [string]$JsonBody) {
  $Bytes = [System.Text.Encoding]::UTF8.GetBytes($JsonBody)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.Headers.Add("Cache-Control", "no-store")
  $Response.ContentLength64 = $Bytes.Length
  $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  $Response.Close()
}

function Read-RequestBody($Request) {
  $Reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
  $Text = $Reader.ReadToEnd()
  $Reader.Close()
  return $Text
}

try {
  while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response
    $Method = $Request.HttpMethod
    $Path = $Request.Url.AbsolutePath

    try {
      # API: Health check
      if ($Path -eq "/api/health" -and $Method -eq "GET") {
        Send-JsonResponse $Response 200 '{"ok":true,"mode":"server"}'
        continue
      }

      # API: Get CMS content
      if ($Path -eq "/api/content" -and $Method -eq "GET") {
        if (Test-Path $DataFile) {
          $Raw = [System.IO.File]::ReadAllText($DataFile, [System.Text.Encoding]::UTF8)
          Send-JsonResponse $Response 200 $Raw
        } else {
          Send-JsonResponse $Response 404 '{"error":"cms-content.json not found"}'
        }
        continue
      }

      # API: Save full CMS content
      if ($Path -eq "/api/content" -and $Method -eq "POST") {
        $Body = Read-RequestBody $Request
        # Validate JSON
        $null = $Body | ConvertFrom-Json
        [System.IO.File]::WriteAllText($DataFile, $Body, [System.Text.Encoding]::UTF8)
        Send-JsonResponse $Response 200 '{"ok":true}'
        continue
      }

      # API: Submit inquiry or course registration (appends to inquiries array)
      if ($Path -eq "/api/inquiries" -and $Method -eq "POST") {
        $Body = Read-RequestBody $Request
        $NewItem = $Body | ConvertFrom-Json
        $Current = [System.IO.File]::ReadAllText($DataFile, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
        if (-not $Current.inquiries) {
          $Current | Add-Member -NotePropertyName "inquiries" -NotePropertyValue @() -Force
        }
        $List = New-Object System.Collections.ArrayList
        foreach ($item in $Current.inquiries) { [void]$List.Add($item) }
        [void]$List.Insert(0, $NewItem)
        $Current.inquiries = $List.ToArray()
        $UpdatedJson = $Current | ConvertTo-Json -Depth 15
        [System.IO.File]::WriteAllText($DataFile, $UpdatedJson, [System.Text.Encoding]::UTF8)
        Send-JsonResponse $Response 200 '{"ok":true}'
        continue
      }

      # API: Upload raw binary (images & large .mp4/.webm videos) into /uploads
      if ($Path -eq "/api/upload-raw" -and $Method -eq "POST") {
        $RawName = $Request.Headers["X-File-Name"]
        if (-not $RawName) { $RawName = "upload.bin" }
        $DecodedName = [System.Uri]::UnescapeDataString($RawName)
        $FileName = ($DecodedName -replace '[^a-zA-Z0-9._-]', '_')
        $SafeName = "{0}_{1}" -f ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()), $FileName
        $TargetPath = Join-Path $UploadsDir $SafeName
        $OutStream = [System.IO.File]::Create($TargetPath)
        $Request.InputStream.CopyTo($OutStream)
        $OutStream.Close()
        $Result = @{ ok = $true; url = "uploads/$SafeName" } | ConvertTo-Json
        Send-JsonResponse $Response 200 $Result
        continue
      }

      # API: Upload base64 image/video from CMS into /uploads
      if ($Path -eq "/api/upload" -and $Method -eq "POST") {
        $Body = Read-RequestBody $Request | ConvertFrom-Json
        $FileName = ($Body.fileName -replace '[^a-zA-Z0-9._-]', '_')
        $SafeName = "{0}_{1}" -f ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()), $FileName
        $Base64 = $Body.dataUrl -replace '^data:(image|video)\/[a-zA-Z0-9+.-]+;base64,', ''
        $Bytes = [Convert]::FromBase64String($Base64)
        $TargetPath = Join-Path $UploadsDir $SafeName
        [System.IO.File]::WriteAllBytes($TargetPath, $Bytes)
        $Result = @{ ok = $true; url = "uploads/$SafeName" } | ConvertTo-Json
        Send-JsonResponse $Response 200 $Result
        continue
      }

      # Static file serving
      if ($Path -eq "/") { $Path = "/index.html" }
      if ($Path -eq "/admin" -or $Path -eq "/admin/") { $Path = "/admin/index.html" }
      $RelativePath = $Path.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
      $FullPath = [System.IO.Path]::GetFullPath((Join-Path $RootDir $RelativePath))

      # Prevent path traversal outside RootDir
      if (-not $FullPath.StartsWith($RootDir, [System.StringComparison]::OrdinalIgnoreCase)) {
        $Response.StatusCode = 403
        $Response.Close()
        continue
      }

      if (Test-Path $FullPath -PathType Leaf) {
        $Ext = [System.IO.Path]::GetExtension($FullPath).ToLowerInvariant()
        $ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { "application/octet-stream" }
        $FileInfo = New-Object System.IO.FileInfo($FullPath)
        $TotalLen = $FileInfo.Length
        $Response.Headers.Add("Accept-Ranges", "bytes")
        $RangeHeader = $Request.Headers["Range"]

        if ($RangeHeader -and $RangeHeader -match '^bytes=(\d*)-(\d*)$') {
          $StartByte = if ($Matches[1]) { [long]$Matches[1] } else { 0 }
          $DefaultMaxChunk = 2097152 # 2 MB per open-ended range response so large MP4s never block the server loop
          $EndByte = if ($Matches[2]) {
            [long]$Matches[2]
          } else {
            [long][Math]::Min($StartByte + $DefaultMaxChunk - 1, $TotalLen - 1)
          }
          if ($EndByte -ge $TotalLen) { $EndByte = $TotalLen - 1 }
          $ChunkLen = ($EndByte - $StartByte) + 1

          $Response.StatusCode = 206
          $Response.ContentType = $ContentType
          $Response.Headers.Add("Content-Range", "bytes $StartByte-$EndByte/$TotalLen")
          $Response.ContentLength64 = $ChunkLen

          $Fs = [System.IO.File]::OpenRead($FullPath)
          try {
            $Fs.Seek($StartByte, [System.IO.SeekOrigin]::Begin) | Out-Null
            $Buffer = New-Object byte[] 65536
            $Remaining = $ChunkLen
            while ($Remaining -gt 0) {
              $ToRead = [int][Math]::Min($Buffer.Length, $Remaining)
              $Read = $Fs.Read($Buffer, 0, $ToRead)
              if ($Read -le 0) { break }
              $Response.OutputStream.Write($Buffer, 0, $Read)
              $Remaining -= $Read
            }
          } finally {
            $Fs.Close()
          }
          $Response.Close()
        } else {
          $FileBytes = [System.IO.File]::ReadAllBytes($FullPath)
          $Response.StatusCode = 200
          $Response.ContentType = $ContentType
          $Response.ContentLength64 = $FileBytes.Length
          $Response.OutputStream.Write($FileBytes, 0, $FileBytes.Length)
          $Response.Close()
        }
      } else {
        $Response.StatusCode = 404
        $Bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        $Response.Close()
      }
    } catch {
      try {
        $ErrJson = (@{ error = $_.Exception.Message } | ConvertTo-Json)
        Send-JsonResponse $Response 500 $ErrJson
      } catch {}
    }
  }
} finally {
  $Listener.Stop()
  $Listener.Close()
}
