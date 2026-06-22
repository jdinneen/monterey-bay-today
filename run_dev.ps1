$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Cache = Join-Path $Root "data\cache"
New-Item -ItemType Directory -Force -Path $Cache | Out-Null

$env:MBAL_PROJECT_ROOT = "C:\Users\jondi\AI-Machine\projects"

$BackendLog = Join-Path $Cache "backend.log"
$FrontendLog = Join-Path $Cache "frontend.log"

Start-Process -FilePath powershell -WindowStyle Hidden -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "cd '$Root\backend'; `$env:MBAL_PROJECT_ROOT='$env:MBAL_PROJECT_ROOT'; uvicorn app.main:app --host 127.0.0.1 --port 8787 *> '$BackendLog'"
) | Out-Null

Start-Process -FilePath powershell -WindowStyle Hidden -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "cd '$Root\frontend'; npm run dev -- --host 127.0.0.1 --port 5173 *> '$FrontendLog'"
) | Out-Null

Write-Host "Backend:  http://127.0.0.1:8787"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Logs:     $Cache"

