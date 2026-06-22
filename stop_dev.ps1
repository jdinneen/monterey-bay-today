$Ports = @(5173, 8787)
foreach ($Port in $Ports) {
  Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Stopped Monterey Bay Today dev servers on ports 5173 and 8787."

