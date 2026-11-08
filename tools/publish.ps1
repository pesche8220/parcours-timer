# Veröffentlicht den aktuellen Commit auf GitHub; GitHub Pages aktualisiert sich danach automatisch (1–2 min).
# Start: powershell -ExecutionPolicy Bypass -File tools/publish.ps1
# Nutzt die Anmeldung der GitHub-CLI (gh auth login). Das Token wird weder angezeigt noch gespeichert.
$git = "$env:LOCALAPPDATA\Programs\MinGit\cmd\git.exe"
$gh = "$env:LOCALAPPDATA\Programs\GitHubCLI\bin\gh.exe"
Set-Location (Split-Path -Parent $PSScriptRoot)
$tok = (& $gh auth token).Trim()
if (-not $tok) { Write-Host 'Nicht bei GitHub angemeldet: gh auth login ausführen.'; exit 1 }
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$tok"))
& $git -c credential.helper= -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $b64" push origin main
if ($LASTEXITCODE -eq 0) { Write-Host 'Veröffentlicht: https://pesche8220.github.io/parcours-timer/' }
