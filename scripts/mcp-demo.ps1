# MCP Demo Script - PowerShell
# Demonstrates MCP server capabilities by sending a sequence of JSON-RPC requests

Write-Host "Starting MCP Demo..." -ForegroundColor Green
Write-Host ""

# Start MCP server process
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "npm"
$psi.Arguments = "run -s mcp"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$mcpProcess = New-Object System.Diagnostics.Process
$mcpProcess.StartInfo = $psi
$mcpProcess.Start() | Out-Null

Write-Host "MCP Server started (PID: $($mcpProcess.Id))" -ForegroundColor Cyan

# Wait for server to be ready
Start-Sleep -Seconds 2

$stdin = $mcpProcess.StandardInput
$stdout = $mcpProcess.StandardOutput

function Send-Request {
    param([string]$json, [string]$desc)
    Write-Host ""
    Write-Host "[$desc]" -ForegroundColor Yellow
    Write-Host "Request: $json" -ForegroundColor Gray
    $stdin.WriteLine($json)
    $stdin.Flush()
    Start-Sleep -Milliseconds 800
    if (!$stdout.EndOfStream) {
        $response = $stdout.ReadLine()
        Write-Host "Response: $response" -ForegroundColor Green
    }
}

# Sequence of requests

Send-Request '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' "1. Initialize"
Start-Sleep -Milliseconds 500

Send-Request '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' "2. List tools"
Start-Sleep -Milliseconds 500

Send-Request '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_launch","arguments":{"headless":true}}}' "3. Launch browser"
Start-Sleep -Seconds 2

Send-Request '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://example.com"}}}' "4. Navigate"
Start-Sleep -Seconds 2

Send-Request '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"browser_find","arguments":{"selector":"a","timeoutMs":5000}}}' "5. Find element"
Start-Sleep -Milliseconds 500

Send-Request '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"browser_screenshot","arguments":{"filename":"demo.png","fullPage":false}}}' "6. Screenshot"
Start-Sleep -Seconds 1

Send-Request '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"browser_quit","arguments":{}}}' "7. Quit browser"
Start-Sleep -Seconds 1

# Cleanup
Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Cyan

$stdin.Close()

if (!$mcpProcess.HasExited) {
    $mcpProcess.Kill()
}

$mcpProcess.Dispose()

Write-Host ""
Write-Host "Demo completed!" -ForegroundColor Green
Write-Host "Check screenshots/demo.png for the captured screenshot." -ForegroundColor Gray
