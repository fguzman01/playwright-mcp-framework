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

> **Status:** ✅ Implemented - 4 tools available (browser_launch, browser_navigate, browser_screenshot, browser_quit)

AI agents (like Claude) will be able to control browsers via the Model Context Protocol (MCP).

### Available Tools

| Tool | Status | Description |
|------|--------|-------------|
| `browser_launch` | ✅ | Launch a Playwright browser (visible by default) |
| `browser_navigate` | ✅ | Navigate to a URL |
| `browser_screenshot` | ✅ | Capture viewport or full page screenshot |
| `browser_quit` | ✅ | Close the browser session |
| `browser_find` | 🚧 | Find elements on the page (planned) |
| `browser_click` | 🚧 | Click on an element (planned) |
| `browser_type` | 🚧 | Type text into an input (planned) |

### Running the MCP Server

Start the JSON-RPC server on stdio:

```bash
npm run mcp
```

The server listens for JSON-RPC requests on stdin and responds on stdout. All logs go to stderr.

### Example Agent Flow

```json
// 1. Initialize
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}

// 2. List available tools
{"jsonrpc":"2.0","id":2,"method":"tools/list"}

// 3. Launch browser
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_launch","arguments":{"headless":false}}}

// 4. Navigate
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://example.com"}}}

// 5. Screenshot
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"browser_screenshot","arguments":{"filename":"test.png","fullPage":true}}}

// 6. Quit
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"browser_quit","arguments":{}}}
```

**Implementation Status:**
- Phase 1: Core components (BrowserManager, Logger, Config) - ✅ Complete
- Phase 2: MCP Server + 4 basic tools - ✅ Complete
- Phase 3: Additional tools (click, type, find) + Claude Desktop - 🚧 Planned

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
