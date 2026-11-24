# خادم محلي بسيط لتشغيل التطبيق على http://localhost:8080
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "التطبيق يعمل على: http://localhost:8080" -ForegroundColor Green
Write-Host "أوقف الخادم بضغط Ctrl+C" -ForegroundColor DarkGray

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
        $path = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))
        if (-not $path.StartsWith($root)) {
            $context.Response.StatusCode = 403
            $context.Response.Close()
            continue
        }
        if (-not [System.IO.File]::Exists($path)) {
            $context.Response.StatusCode = 404
            $context.Response.Close()
            continue
        }
        $bytes = [System.IO.File]::ReadAllBytes($path)
        switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
            '.html' { $context.Response.ContentType = 'text/html; charset=utf-8' }
            '.css'  { $context.Response.ContentType = 'text/css; charset=utf-8' }
            '.js'   { $context.Response.ContentType = 'application/javascript; charset=utf-8' }
            '.json' { $context.Response.ContentType = 'application/manifest+json; charset=utf-8' }
            '.png'  { $context.Response.ContentType = 'image/png' }
            '.svg'  { $context.Response.ContentType = 'image/svg+xml' }
            default { $context.Response.ContentType = 'application/octet-stream' }
        }
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.Close()
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}
