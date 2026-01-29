# MCP POC 2: SauceDemo Login via JSON-RPC
# Sends commands to MCP server stdin and reads responses

$ErrorActionPreference = "Stop"

Write-Host "==> Starting MCP Server for POC 2: SauceDemo Login" -ForegroundColor Cyan

# Start MCP server process
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c npm run -s mcp"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$process.Start() | Out-Null

$stdin = $process.StandardInput
$stdout = $process.StandardOutput

# Helper function to send JSON-RPC and read response
function Send-JsonRpc {
    param(
        [int]$Id,
        [string]$Method,
        [hashtable]$Params = @{}
    )
    
    $request = @{
        jsonrpc = "2.0"
        id = $Id
        method = $Method
        params = $Params
    } | ConvertTo-Json -Compress
    
    Write-Host "[$Id] => $Method" -ForegroundColor Yellow
    $stdin.WriteLine($request)
    
    # Read response
    $response = $stdout.ReadLine()
    if ($response) {
        $json = $response | ConvertFrom-Json
        if ($json.error) {
            Write-Host "[$Id] ERROR: $($json.error.message)" -ForegroundColor Red
        } else {
            Write-Host "[$Id] OK" -ForegroundColor Green
        }
    }
}

try {
    # 1. Initialize
    Send-JsonRpc -Id 1 -Method "initialize" -Params @{
        protocolVersion = "2024-11-05"
        capabilities = @{}
        clientInfo = @{
            name = "mcp-poc2-saucedemo"
            version = "1.0.0"
        }
    }
    
    # 2. Launch browser (headed mode to see the action)
    Send-JsonRpc -Id 2 -Method "tools/call" -Params @{
        name = "browser_launch"
        arguments = @{
            headless = $false
        }
    }
    
    # 3. Navigate to SauceDemo
    Send-JsonRpc -Id 3 -Method "tools/call" -Params @{
        name = "browser_navigate"
        arguments = @{
            url = "https://www.saucedemo.com/"
        }
    }
    
    # 4. Type username
    Send-JsonRpc -Id 4 -Method "tools/call" -Params @{
        name = "browser_type"
        arguments = @{
            selector = "#user-name"
            text = "standard_user"
            clear = $true
        }
    }
    
    # 5. Type password
    Send-JsonRpc -Id 5 -Method "tools/call" -Params @{
        name = "browser_type"
        arguments = @{
            selector = "#password"
            text = "secret_sauce"
            clear = $true
        }
    }
    
    # 6. Click login button
    Send-JsonRpc -Id 6 -Method "tools/call" -Params @{
        name = "browser_click"
        arguments = @{
            selector = "#login-button"
        }
    }
    
    # 7. Find inventory list (validation)
    Send-JsonRpc -Id 7 -Method "tools/call" -Params @{
        name = "browser_find"
        arguments = @{
            selector = ".inventory_list"
        }
    }
    
    # 8. Take screenshot
    Send-JsonRpc -Id 8 -Method "tools/call" -Params @{
        name = "browser_screenshot"
        arguments = @{
            filename = "poc2-mcp-saucedemo.png"
        }
    }
    
    # 9. Quit browser
    Send-JsonRpc -Id 9 -Method "tools/call" -Params @{
        name = "browser_quit"
        arguments = @{}
    }
    
    Write-Host ""
    Write-Host "==> POC 2 Complete!" -ForegroundColor Green
    Write-Host "==> Screenshot saved to: screenshots/poc2-mcp-saucedemo.png" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
} finally {
    # Cleanup
    $stdin.Close()
    if (-not $process.HasExited) {
        $process.Kill()
    }
    $process.Dispose()
}
