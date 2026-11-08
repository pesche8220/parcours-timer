# Erzeugt die App-Icons (PNG) aus dem Markenzeichen: Stoppuhr-Segment auf Signal-Orange.
# Start: powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$orange = [System.Drawing.ColorTranslator]::FromHtml('#FF5A1F')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#17100B')

function New-Icon([int]$size, [string]$file, [bool]$fullBleed, [double]$glyphScale) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $brush = New-Object System.Drawing.SolidBrush $orange
  if ($fullBleed) {
    $g.FillRectangle($brush, 0, 0, $size, $size)
  } else {
    $r = $size * 9 / 32; $d = $r * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
  }
  # Glyphe im 32er-Raster, um die Mitte skaliert
  $u = $size / 32 * $glyphScale
  $ox = $size / 2 - 16 * $u; $oy = $size / 2 - 16 * $u
  $pen = New-Object System.Drawing.Pen $ink, (3.2 * $u)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $cx = $ox + 16 * $u; $cy = $oy + 16 * $u; $rad = 9 * $u
  $g.DrawArc($pen, [single]($cx - $rad), [single]($cy - $rad), [single](2 * $rad), [single](2 * $rad), -90, 270)
  $g.DrawLine($pen, [single]$cx, [single]$cy, [single]($ox + 19.4 * $u), [single]($oy + 12.6 * $u))
  $inkBrush = New-Object System.Drawing.SolidBrush $ink
  $dot = 2.2 * $u
  $g.FillEllipse($inkBrush, [single]($cx - $dot), [single]($cy - $dot), [single](2 * $dot), [single](2 * $dot))
  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  "{0,-28} {1}px" -f $file, $size
}

New-Icon 192 'icon-192.png' $false 1.0
New-Icon 512 'icon-512.png' $false 1.0
New-Icon 512 'icon-maskable-512.png' $true 0.78
New-Icon 180 'apple-touch-icon.png' $true 0.82
New-Icon 32 'favicon-32.png' $false 1.0
