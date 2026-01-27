# MCP Tools Specification

Este documento define las 7 herramientas básicas del MCP server para control de navegador con Playwright.

## Tools Overview

| Tool | Purpose | Playwright API | Stateful |
|------|---------|----------------|----------|
| `browser_launch` | Lanza navegador | `chromium.launch()` | Yes |
| `browser_navigate` | Navega a URL | `page.goto()` | Yes |
| `browser_find` | Busca elementos | `page.locator()` | No |
| `browser_click` | Click en elemento | `locator.click()` | No |
| `browser_type` | Escribir texto | `locator.fill()` | No |
| `browser_screenshot` | Captura pantalla | `page.screenshot()` | No |
| `browser_quit` | Cierra navegador | `browser.close()` | Yes |

**Stateful:** Tools que modifican el estado de la sesión (navegador abierto/cerrado).

---

## 1. browser_launch

Lanza una instancia de navegador Playwright.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "browserType": {
      "type": "string",
      "enum": ["chromium", "firefox", "webkit"],
      "default": "chromium",
      "description": "Type of browser to launch"
    },
    "headless": {
      "type": "boolean",
      "default": true,
      "description": "Run browser in headless mode"
    },
    "viewport": {
      "type": "object",
      "properties": {
        "width": { "type": "number", "default": 1280 },
        "height": { "type": "number", "default": 720 }
      },
      "description": "Viewport size"
    }
  }
}
```

### Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "browser_launch",
    "arguments": {
      "browserType": "chromium",
      "headless": false
    }
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Browser launched successfully (chromium, headless: false)"
      }
    ]
  }
}
```

### Implementation

```typescript
// src/mcp/tools/browser_launch.ts

import { chromium, firefox, webkit, Browser } from 'playwright';
import { ToolResult } from '../types';

let browserInstance: Browser | null = null;

export async function browserLaunch(args: {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: { width: number; height: number };
}): Promise<ToolResult> {
  const { 
    browserType = 'chromium', 
    headless = true,
    viewport = { width: 1280, height: 720 }
  } = args;

  // Cerrar navegador existente si hay uno
  if (browserInstance) {
    await browserInstance.close();
  }

  // Lanzar nuevo navegador
  const browserMap = { chromium, firefox, webkit };
  browserInstance = await browserMap[browserType].launch({
    headless,
    viewport,
  });

  return {
    content: [
      {
        type: 'text',
        text: `Browser launched successfully (${browserType}, headless: ${headless})`
      }
    ]
  };
}

export function getBrowser(): Browser {
  if (!browserInstance) {
    throw new Error('No browser instance. Call browser_launch first.');
  }
  return browserInstance;
}
```

---

## 2. browser_navigate

Navega la página activa a una URL.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "URL to navigate to (must include protocol)"
    },
    "waitUntil": {
      "type": "string",
      "enum": ["load", "domcontentloaded", "networkidle"],
      "default": "load",
      "description": "When to consider navigation succeeded"
    }
  },
  "required": ["url"]
}
```

### Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "browser_navigate",
    "arguments": {
      "url": "https://example.com",
      "waitUntil": "domcontentloaded"
    }
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully navigated to https://example.com\nTitle: Example Domain"
      }
    ]
  }
}
```

### Implementation

```typescript
// src/mcp/tools/browser_navigate.ts

import { Page } from 'playwright';
import { ToolResult } from '../types';
import { getActivePage } from '../page-manager';

export async function browserNavigate(args: {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}): Promise<ToolResult> {
  const { url, waitUntil = 'load' } = args;

  const page = await getActivePage();
  await page.goto(url, { waitUntil });

  const title = await page.title();

  return {
    content: [
      {
        type: 'text',
        text: `Successfully navigated to ${url}\nTitle: ${title}`
      }
    ]
  };
}
```

---

## 3. browser_find

Busca elementos en la página usando locators de Playwright.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector, text, or role selector"
    },
    "selectorType": {
      "type": "string",
      "enum": ["css", "text", "role", "testId"],
      "default": "css",
      "description": "Type of selector"
    },
    "options": {
      "type": "object",
      "description": "Additional locator options (e.g., { name: 'Submit' })"
    }
  },
  "required": ["selector"]
}
```

### Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "browser_find",
    "arguments": {
      "selector": "button",
      "selectorType": "role",
      "options": { "name": "Submit" }
    }
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 1 element(s) matching: role=button[name=\"Submit\"]\nElement is visible and enabled"
      }
    ]
  }
}
```

### Implementation

```typescript
// src/mcp/tools/browser_find.ts

import { Locator } from 'playwright';
import { ToolResult } from '../types';
import { getActivePage } from '../page-manager';

export async function browserFind(args: {
  selector: string;
  selectorType?: 'css' | 'text' | 'role' | 'testId';
  options?: any;
}): Promise<ToolResult> {
  const { selector, selectorType = 'css', options = {} } = args;

  const page = await getActivePage();
  
  let locator: Locator;
  switch (selectorType) {
    case 'role':
      locator = page.getByRole(selector as any, options);
      break;
    case 'text':
      locator = page.getByText(selector, options);
      break;
    case 'testId':
      locator = page.getByTestId(selector);
      break;
    default:
      locator = page.locator(selector);
  }

  const count = await locator.count();
  const isVisible = count > 0 ? await locator.first().isVisible() : false;
  const isEnabled = count > 0 ? await locator.first().isEnabled() : false;

  return {
    content: [
      {
        type: 'text',
        text: `Found ${count} element(s) matching: ${selector}\n` +
              `Visible: ${isVisible}, Enabled: ${isEnabled}`
      }
    ]
  };
}
```

---

## 4. browser_click

Click en un elemento.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "Selector for the element to click"
    },
    "selectorType": {
      "type": "string",
      "enum": ["css", "text", "role", "testId"],
      "default": "css"
    },
    "options": {
      "type": "object",
      "description": "Click options (button, clickCount, etc.)"
    }
  },
  "required": ["selector"]
}
```

### Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "browser_click",
    "arguments": {
      "selector": "Submit",
      "selectorType": "text"
    }
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully clicked element: Submit"
      }
    ]
  }
}
```

### Implementation

```typescript
// src/mcp/tools/browser_click.ts

import { ToolResult } from '../types';
import { getActivePage } from '../page-manager';

export async function browserClick(args: {
  selector: string;
  selectorType?: 'css' | 'text' | 'role' | 'testId';
  options?: any;
}): Promise<ToolResult> {
  const { selector, selectorType = 'css', options = {} } = args;

  const page = await getActivePage();
  
  let locator;
  switch (selectorType) {
    case 'role':
      locator = page.getByRole(selector as any, options);
      break;
    case 'text':
      locator = page.getByText(selector);
      break;
    case 'testId':
      locator = page.getByTestId(selector);
      break;
    default:
      locator = page.locator(selector);
  }

  await locator.click(options);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully clicked element: ${selector}`
      }
    ]
  };
}
```

---

## 5. browser_type

Escribe texto en un elemento (input, textarea).

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "Selector for the input element"
    },
    "text": {
      "type": "string",
      "description": "Text to type"
    },
    "selectorType": {
      "type": "string",
      "enum": ["css", "text", "role", "testId", "label"],
      "default": "css"
    },
    "clear": {
      "type": "boolean",
      "default": true,
      "description": "Clear existing text before typing"
    }
  },
  "required": ["selector", "text"]
}
```

### Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "browser_type",
    "arguments": {
      "selector": "Email",
      "selectorType": "label",
      "text": "user@example.com",
      "clear": true
    }
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully typed into element: Email\nText: user@example.com"
      }
    ]
  }
}
```

### Implementation

```typescript
// src/mcp/tools/browser_type.ts

import { ToolResult } from '../types';
import { getActivePage } from '../page-manager';

export async function browserType(args: {
  selector: string;
  text: string;
  selectorType?: 'css' | 'text' | 'role' | 'testId' | 'label';
  clear?: boolean;
}): Promise<ToolResult> {
  const { selector, text, selectorType = 'css', clear = true } = args;

  const page = await getActivePage();
  
  let locator;
  switch (selectorType) {
    case 'role':
      locator = page.getByRole(selector as any);
      break;
    case 'text':
      locator = page.getByText(selector);
      break;
    case 'testId':
      locator = page.getByTestId(selector);
      break;
    case 'label':
      locator = page.getByLabel(selector);
      break;
    default:
      locator = page.locator(selector);
  }

  if (clear) {
    await locator.clear();
  }
  
  await locator.fill(text);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully typed into element: ${selector}\nText: ${text}`
      }
    ]
  };
}
```

---

## 6. browser_screenshot

Captura screenshot de la página o elemento específico.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "Optional: selector for element to screenshot"
    },
    "fullPage": {
      "type": "boolean",
      "default": false,
      "description": "Capture full scrollable page"
    },
    "path": {
      "type": "string",
      "description": "Optional: file path to save screenshot"
    }
  }
}
```

### Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "browser_screenshot",
    "arguments": {
      "fullPage": true
    }
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "image",
        "data": "iVBORw0KGgoAAAANSUhEUgAA...",
        "mimeType": "image/png"
      },
      {
        "type": "text",
        "text": "Screenshot captured (1280x720)"
      }
    ]
  }
}
```

### Implementation

```typescript
// src/mcp/tools/browser_screenshot.ts

import { ToolResult } from '../types';
import { getActivePage } from '../page-manager';

export async function browserScreenshot(args: {
  selector?: string;
  fullPage?: boolean;
  path?: string;
}): Promise<ToolResult> {
  const { selector, fullPage = false, path } = args;

  const page = await getActivePage();
  
  let screenshotBuffer: Buffer;
  
  if (selector) {
    const locator = page.locator(selector);
    screenshotBuffer = await locator.screenshot({ path });
  } else {
    screenshotBuffer = await page.screenshot({ fullPage, path });
  }

  const base64 = screenshotBuffer.toString('base64');

  return {
    content: [
      {
        type: 'image',
        data: base64,
        mimeType: 'image/png'
      },
      {
        type: 'text',
        text: `Screenshot captured${path ? ` and saved to ${path}` : ''}`
      }
    ]
  };
}
```

---

## 7. browser_quit

Cierra el navegador y libera recursos.

### Input Schema

```json
{
  "type": "object",
  "properties": {}
}
```

### Example Call

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "browser_quit",
    "arguments": {}
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Browser closed successfully"
      }
    ]
  }
}
```

### Implementation

```typescript
// src/mcp/tools/browser_quit.ts

import { ToolResult } from '../types';
import { getBrowser } from './browser_launch';

export async function browserQuit(): Promise<ToolResult> {
  const browser = getBrowser();
  await browser.close();

  return {
    content: [
      {
        type: 'text',
        text: 'Browser closed successfully'
      }
    ]
  };
}
```

---

## Tool Registration

```typescript
// src/mcp/server.ts

import { browserLaunch } from './tools/browser_launch';
import { browserNavigate } from './tools/browser_navigate';
import { browserFind } from './tools/browser_find';
import { browserClick } from './tools/browser_click';
import { browserType } from './tools/browser_type';
import { browserScreenshot } from './tools/browser_screenshot';
import { browserQuit } from './tools/browser_quit';

export class MCPServer {
  constructor() {
    this.registerTool('browser_launch', browserLaunchDefinition, browserLaunch);
    this.registerTool('browser_navigate', browserNavigateDefinition, browserNavigate);
    this.registerTool('browser_find', browserFindDefinition, browserFind);
    this.registerTool('browser_click', browserClickDefinition, browserClick);
    this.registerTool('browser_type', browserTypeDefinition, browserType);
    this.registerTool('browser_screenshot', browserScreenshotDefinition, browserScreenshot);
    this.registerTool('browser_quit', browserQuitDefinition, browserQuit);
  }

  private registerTool(name: string, definition: MCPTool, handler: ToolHandler) {
    this.tools.set(name, { definition, handler });
  }
}
```

## Error Handling

Todos los tools deben manejar errores consistentemente:

```typescript
export async function browserClick(args: any): Promise<ToolResult> {
  try {
    // ... implementation
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error clicking element: ${error.message}\n` +
                `Selector: ${args.selector}\n` +
                `Hint: Check if element exists and is actionable`
        }
      ]
    };
  }
}
```

## Testing Tools

```typescript
// tests/mcp/tools.spec.ts

import { test, expect } from '@playwright/test';
import { browserLaunch, browserNavigate, browserClick } from '../src/mcp/tools';

test('MCP tool flow', async () => {
  // Launch browser
  let result = await browserLaunch({ browserType: 'chromium', headless: true });
  expect(result.content[0].text).toContain('launched successfully');

  // Navigate
  result = await browserNavigate({ url: 'https://example.com' });
  expect(result.content[0].text).toContain('Successfully navigated');

  // Click
  result = await browserClick({ selector: 'h1' });
  expect(result.content[0].text).toContain('Successfully clicked');
});
```

## Referencias

- [Playwright Locators](https://playwright.dev/docs/locators)
- [MCP Protocol](./mcp-protocol.md)
- [JSON Schema](https://json-schema.org/)
