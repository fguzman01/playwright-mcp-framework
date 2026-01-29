# Playwright MCP Framework

A hybrid testing and browser automation framework that serves both humans and AI agents.

**For Humans:** Traditional Playwright tests with TypeScript  
**For Agents (MCP):** Browser control via Model Context Protocol (JSON-RPC)

Inspired by [Vibium](https://github.com/vibium/vibium), powered by Playwright.

---

## 🚀 Quick Start

### Installation

```bash
npm install
npx playwright install
```

---

## 👨 For Humans: Playwright Testing

Write and run browser tests with Playwright's powerful API.

### Running Tests

**Headless mode (CI/automated):**
```bash
npm test
```

**Headed mode (see browser):**
```bash
npm run test:headed
```

**UI mode (interactive debugging):**
```bash
npm run test:ui
```

### Writing Tests

Create tests in the `tests/` directory:

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('https://app.example.com');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await expect(page).toHaveURL(/dashboard/);
});
```

**Learn more:**
- [Playwright Documentation](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)

### Demo Scripts

Explore BrowserManager capabilities with demo scripts:

```bash
# Basic demo: launch, navigate, screenshot, click
npm run demo

# Error demo: automatic error screenshots
npm run demo:error

# Type error demo: error context preservation
npm run demo:type-error

# Cleanup demo: screenshot management
npm run demo:clean
```

---

## 🤖 For Agents: MCP Protocol

> **Status:** ✅ Implemented - 7 tools available

**What is MCP?**

The [Model Context Protocol (MCP)](https://spec.modelcontextprotocol.io/) is a JSON-RPC based protocol that allows AI agents (like Claude) to interact with external tools and services. This framework implements an MCP server that exposes browser automation capabilities via stdio transport.

**How it works:**
- Agent sends JSON-RPC requests via stdin (one JSON per line)
- Server executes browser operations using Playwright
- Server responds with JSON-RPC responses via stdout
- All logs go to stderr (never pollute stdout)

### Available Tools

**7 Tools Implemented:**

1. **`browser_launch`** - Start a new browser session (chromium). Options: headless mode, slowMo for debugging.
2. **`browser_navigate`** - Navigate to any URL. Waits for page load before returning.
3. **`browser_find`** - Search for elements by CSS selector. Returns tag name, text content, and bounding box coordinates.
4. **`browser_click`** - Click on an element using CSS selector. Includes automatic actionability checks.
5. **`browser_type`** - Type text into input fields. Supports clearing existing content and custom timeouts.
6. **`browser_screenshot`** - Capture screenshots to file or return as base64. Supports full-page capture.
7. **`browser_quit`** - Close the browser session and cleanup resources.

| Tool | Status | Parameters |
|------|--------|------------|
| `browser_launch` | ✅ | `headless?: boolean` |
| `browser_navigate` | ✅ | `url: string` |
| `browser_find` | ✅ | `selector: string, timeoutMs?: number` |
| `browser_click` | ✅ | `selector: string, timeoutMs?: number` |
| `browser_type` | ✅ | `selector: string, text: string, timeoutMs?: number, clear?: boolean` |
| `browser_screenshot` | ✅ | `filename?: string, fullPage?: boolean, returnBase64?: boolean` |
| `browser_quit` | ✅ | _(no parameters)_ |

### Running the MCP Server

Start the JSON-RPC server on stdio:

```bash
npm run mcp
```

**Important:** The server uses stdio transport:
- **stdin**: Receives JSON-RPC requests (one per line)
- **stdout**: Sends JSON-RPC responses (JSON only, one per line)
- **stderr**: Logs and debugging information

### Manual Testing

You can test the server manually by piping JSON requests to stdin. Here are some examples you can copy/paste:

**1. Initialize the server:**
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
```

**2. List available tools:**
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

**3. Launch browser (headless):**
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_launch","arguments":{"headless":true}}}
```

**4. Navigate to a URL:**
```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://example.com"}}}
```

**5. Find an element:**
```json
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"browser_find","arguments":{"selector":"h1","timeoutMs":5000}}}
```

**6. Click an element:**
```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"browser_click","arguments":{"selector":"a"}}}
```

**7. Type into an input:**
```json
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"browser_type","arguments":{"selector":"input[type='text']","text":"Hello World"}}}
```

**8. Take a screenshot:**
```json
{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"browser_screenshot","arguments":{"filename":"test.png","fullPage":true}}}
```

**9. Quit browser:**
```json
{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"browser_quit","arguments":{}}}
```

### Automated Testing

Run the smoke test suite to verify all tools work correctly:

```bash
npm run test:mcp
```

This executes an end-to-end test that:
1. Starts the MCP server as a subprocess
2. Initializes and lists tools
3. Executes a complete browser workflow (launch → navigate → find → screenshot → quit)
4. Validates all responses

**Implementation Status:**
- Phase 1: Core components (BrowserManager, Logger, Config) - ✅ Complete
- Phase 2: MCP Server + 7 tools - ✅ Complete
- Phase 3: Claude Desktop integration - 🚧 Planned

---

## 📚 Documentation

Detailed documentation available in `/docs`:

- **[Architecture](docs/architecture.md)** - Framework design, components, roadmap
- **[Actionability Rules](docs/actionability.md)** - Locator best practices, no sleeps policy
- **[Process Cleanup](docs/process-cleanup.md)** - Shutdown handling, signal management
- **[Screenshot Management](docs/screenshot-management.md)** - Managing test screenshots, cleanup strategies
- **[MCP Protocol](docs/mcp-protocol.md)** - JSON-RPC specification, transport layer
- **[MCP Tools](docs/mcp-tools.md)** - Tool definitions, schemas, examples

---

## 🏗️ Project Structure

```
playwright-mcp-framework/
├── tests/                    # Playwright tests (for humans)
├── src/
│   ├── core/                 # Browser management
│   ├── mcp/                  # MCP server (for agents)
│   │   └── tools/            # MCP tool implementations
│   └── utils/                # Shared utilities
├── docs/                     # Documentation
├── scripts/                  # Utility scripts
└── playwright.config.ts      # Playwright configuration
```

---

## 🔧 Configuration

### Environment Variables

Configure the framework behavior using environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `HEADLESS` | Run browser in headless mode | `false` | `HEADLESS=true` |
| `SLOWMO_MS` | Slow down browser operations (ms) | `0` | `SLOWMO_MS=500` |
| `DEFAULT_TIMEOUT_MS` | Default timeout for operations (ms) | `30000` | `DEFAULT_TIMEOUT_MS=60000` |
| `SCREENSHOT_DIR` | Directory for screenshots | `./screenshots` | `SCREENSHOT_DIR=./output` |
| `LOG_LEVEL` | Logging verbosity level | `info` | `LOG_LEVEL=debug` |

**Log Levels:**
- `debug` - Verbose logging (all operations)
- `info` - Normal logging (default)
- `warn` - Warnings only
- `error` - Errors only

**Usage Examples:**

```bash
# Run tests in headless mode with debug logging
HEADLESS=true LOG_LEVEL=debug npm test

# Slow down browser for debugging
SLOWMO_MS=1000 npm run demo

# Custom screenshot directory
SCREENSHOT_DIR=./test-output npm test

# Increase timeout for slow networks
DEFAULT_TIMEOUT_MS=60000 npm run demo
```

**Windows (PowerShell):**
```powershell
$env:HEADLESS="true"
$env:LOG_LEVEL="debug"
npm test
```

**Windows (CMD):**
```cmd
set HEADLESS=true
set LOG_LEVEL=debug
npm test
```

### Playwright Configuration

See [playwright.config.ts](playwright.config.ts) for test configuration.

Currently configured browsers:
- ✅ Chromium (Chrome/Edge)
- ⚪ Firefox (commented out)
- ⚪ WebKit (Safari, commented out)

---

## 🤝 Contributing

This is an experimental project exploring hybrid human-agent workflows with Playwright.

**Key principles:**
- Locator-only approach (no manual waits)
- TypeScript strict mode
- Graceful shutdown for all processes
- Same engine for humans & agents

---

## 📖 References

- [Vibium Framework](https://github.com/vibium/vibium) (Inspiration)
- [Playwright](https://playwright.dev)
- [Model Context Protocol](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
