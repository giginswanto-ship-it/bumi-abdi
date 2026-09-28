# PowerShell Lightweight Local Web Server for BUMI ABDI RESTO
$port = 8080
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
if (-not $ip) { $ip = "127.0.0.1" }

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  RUMAH MAKAN AYAM GORENG KAMPUNG BUMI ABDI" -ForegroundColor Yellow
Write-Host "  SISTEM KASIR POS & QR CODE SELF-ORDER MENU" -ForegroundColor White
Write-Host "  Tagline: Asli. Gurih. Berkah." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "[*] Sistem Kasir Utama : http://localhost:$port" -ForegroundColor Cyan
Write-Host "[*] Akses HP Customer  : http://${ip}:$port/order.html?table=Meja%2001" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green

Start-Process "http://localhost:$port"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$port/")
try {
    $listener.Start()
} catch {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host "Server sedang berjalan. Tekan Ctrl+C untuk keluar." -ForegroundColor Gray

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $localPath = $request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($localPath)) { $localPath = "index.html" }
    
    $filePath = Join-Path $root $localPath
    
    if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        
        switch ($ext) {
            ".html" { $response.ContentType = "text/html; charset=utf-8" }
            ".css"  { $response.ContentType = "text/css" }
            ".js"   { $response.ContentType = "application/javascript" }
            ".png"  { $response.ContentType = "image/png" }
            ".jpg"  { $response.ContentType = "image/jpeg" }
            ".json" { $response.ContentType = "application/json" }
            default { $response.ContentType = "application/octet-stream" }
        }
        
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
}
