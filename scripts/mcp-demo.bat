@echo off
REM MCP Demo Script - Batch
REM Demonstrates MCP server capabilities by sending JSON-RPC requests

echo Starting MCP Demo...
echo.

echo Note: This demo shows the MCP protocol flow.
echo For a working interactive demo, run: npm run test:mcp
echo.

echo JSON-RPC Sequence:
echo.

echo 1. Initialize
echo    {"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
echo.

echo 2. List tools
echo    {"jsonrpc":"2.0","id":2,"method":"tools/list"}
echo.

echo 3. Launch browser (headless)
echo    {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_launch","arguments":{"headless":true}}}
echo.

echo 4. Navigate to example.com
echo    {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://example.com"}}}
echo.

echo 5. Find element (a)
echo    {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"browser_find","arguments":{"selector":"a","timeoutMs":5000}}}
echo.

echo 6. Screenshot (demo.png)
echo    {"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"browser_screenshot","arguments":{"filename":"demo.png","fullPage":false}}}
echo.

echo 7. Quit browser
echo    {"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"browser_quit","arguments":{}}}
echo.

echo.
echo === To test this sequence live, run: npm run test:mcp ===
echo.
