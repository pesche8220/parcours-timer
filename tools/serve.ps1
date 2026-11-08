# Kleiner statischer Webserver fuer lokale Tests (kein Node/Python noetig).
# Start: powershell -ExecutionPolicy Bypass -File tools/serve.ps1 [-Port 8080]
param([int]$Port = 8080)

$root = Split-Path -Parent $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Parcours Timer: http://localhost:$Port/  (Ordner: $root)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.webmanifest' = 'application/manifest+json'
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'
  '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request; $res = $ctx.Response
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path.EndsWith('/')) { $path += 'index.html' }
    $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
    $full = [System.IO.Path]::GetFullPath($file)
    if (-not $full.StartsWith($root) -or -not (Test-Path $full -PathType Leaf)) {
      $res.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('404')
    } else {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($full)
    }
    $res.Headers.Add('Cache-Control', 'no-store')
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.OutputStream.Close()
    Write-Host ("{0} {1} {2}" -f $req.HttpMethod, $res.StatusCode, $path)
  } catch {
    Write-Host "Fehler: $($_.Exception.Message)"
    try { $ctx.Response.Abort() } catch {}
  }
}
