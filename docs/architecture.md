# Architecture Overview

## Vision

**playwright-mcp-framework** es un framework híbrido de testing y automatización web que sirve a dos tipos de usuarios:

1. **Humans:** Desarrolladores escribiendo tests tradicionales con Playwright + TypeScript
2. **Agents:** LLMs/Agentes AI que invocan capacidades de browser vía Model Context Protocol (MCP)

## Inspiración: Vibium Framework

Este proyecto está inspirado en la arquitectura de **Vibium**, que provee herramientas de browser automation para agentes AI.

### Diferencias clave con Vibium:

| Aspecto | Vibium | playwright-mcp-framework |
|---------|--------|--------------------------|
| **Motor** | Puppeteer | **Playwright** |
| **Lenguaje** | JavaScript | **TypeScript** |
| **Protocolo** | MCP | MCP |
| **Testing** | ❌ No incluido | ✅ Playwright Test integrado |
| **Multi-browser** | ❌ Solo Chromium | ✅ Chromium, Firefox, WebKit |
| **Target** | Solo agentes | **Humanos + Agentes** |

### Por qué Playwright sobre Puppeteer:

- **Multi-browser:** Chromium, Firefox, WebKit con la misma API
- **Auto-waiting:** Manejo inteligente de timing sin sleeps
- **Test Runner:** Framework completo para testing
- **DevTools:** Codegen, trace viewer, UI mode
- **Actionability:** Verificaciones automáticas antes de cada acción
- **TypeScript:** First-class support

## Arquitectura del Framework

```
playwright-mcp-framework/
│
├── tests/                    # 👨 For Humans: Playwright Tests
│   └── example.spec.ts
│
├── src/
│   ├── core/                 # Playwright engine & browser management
│   │   ├── browser-manager.ts
│   │   └── page-manager.ts
│   │
│   ├── mcp/                  # 🤖 For Agents: MCP Server
│   │   ├── server.ts         # MCP JSON-RPC server
│   │   ├── tools/            # MCP tool implementations
│   │   │   ├── browser_launch.ts
│   │   │   ├── browser_navigate.ts
│   │   │   ├── browser_find.ts
│   │   │   ├── browser_click.ts
│   │   │   ├── browser_type.ts
│   │   │   ├── browser_screenshot.ts
│   │   │   └── browser_quit.ts
│   │   └── types.ts
│   │
│   └── utils/                # Shared utilities
│       ├── logger.ts
│       └── validators.ts
│
├── docs/                     # Documentation
│   ├── architecture.md       # This file
│   ├── actionability.md      # Locator rules
│   ├── process-cleanup.md    # Shutdown handling
│   ├── mcp-protocol.md       # MCP spec
│   └── mcp-tools.md          # Tool definitions
│
├── scripts/                  # Utility scripts
│   └── start-mcp-server.ts
│
├── playwright.config.ts      # Playwright configuration
└── package.json
```

## Flujos de Uso

### 1. Human Flow (Playwright Tests)

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('https://app.example.com');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await expect(page).toHaveURL(/dashboard/);
});
```

**Ejecutar:**
```bash
npm test                # Headless
npm run test:headed     # Con UI
npm run test:ui         # Playwright UI mode
```

### 2. Agent Flow (MCP Protocol)

**Agente AI invoca tool via JSON-RPC:**

```json
// Request: tools/call
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "browser_navigate",
    "arguments": {
      "url": "https://example.com"
    }
  }
}
```

**MCP Server ejecuta Playwright:**

```typescript
// src/mcp/tools/browser_navigate.ts
async function browserNavigate(url: string) {
  const page = await getActivePage();
  await page.goto(url);
  
  return {
    content: [
      {
        type: "text",
        text: `Navigated to ${url}`
      }
    ]
  };
}
```

## Core Components

### BrowserManager (`src/core/browser-manager.ts`)

Responsable de:
- Lanzar/cerrar navegador
- Mantener estado del navegador
- Configuración (headless, viewport, etc.)

```typescript
class BrowserManager {
  private browser: Browser | null = null;
  
  async launch(options?: LaunchOptions): Promise<Browser>
  async close(): Promise<void>
  getBrowser(): Browser | null
}
```

### PageManager (`src/core/page-manager.ts`)

Responsable de:
- Crear/gestionar contextos y páginas
- Mantener referencia a página activa
- Cleanup de recursos

```typescript
class PageManager {
  private pages: Map<string, Page> = new Map();
  private activePage: Page | null = null;
  
  async createPage(): Promise<Page>
  async closePage(pageId: string): Promise<void>
  getActivePage(): Page | null
  setActivePage(page: Page): void
}
```

### MCP Server (`src/mcp/server.ts`)

Responsable de:
- Implementar protocolo JSON-RPC
- Registrar y ejecutar tools
- Manejar inicialización y shutdown

```typescript
class MCPServer {
  async initialize(): Promise<void>
  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse>
  async shutdown(): Promise<void>
}
```

## MCP Tools (7 herramientas básicas)

| Tool | Descripción | Playwright API |
|------|-------------|----------------|
| `browser_launch` | Lanza navegador | `chromium.launch()` |
| `browser_navigate` | Navega a URL | `page.goto(url)` |
| `browser_find` | Busca elemento | `page.locator(selector)` |
| `browser_click` | Click en elemento | `locator.click()` |
| `browser_type` | Escribir texto | `locator.fill(text)` |
| `browser_screenshot` | Captura pantalla | `page.screenshot()` |
| `browser_quit` | Cierra navegador | `browser.close()` |

Ver [mcp-tools.md](mcp-tools.md) para especificaciones completas.

## Principios de Diseño

### 1. Shared Engine
- Tests y MCP tools usan el mismo `BrowserManager` y `PageManager`
- Mismo código, mismo comportamiento
- Facilita debugging y mantenimiento

### 2. Stateful Session
- MCP server mantiene navegador abierto entre llamadas
- Permite flujos multi-step: login → navigate → interact
- Cleanup explícito con `browser_quit`

### 3. Actionability First
- Todos los tools siguen reglas de [actionability.md](actionability.md)
- No sleeps, solo locators con auto-wait
- Errores claros cuando elementos no son actionables

### 4. TypeScript Strict
- Type safety en todos los componentes
- Interfaces claras para MCP protocol
- Validación de schemas en runtime

### 5. Graceful Shutdown
- Signal handling (SIGINT/SIGTERM)
- Cleanup automático de recursos
- Ver [process-cleanup.md](process-cleanup.md)

## Roadmap

### Phase 1: Foundation (Current)
- [x] Playwright test setup
- [x] Basic project structure
- [ ] Core components (BrowserManager, PageManager)

### Phase 2: MCP Implementation
- [ ] MCP server skeleton
- [ ] 7 basic tools implementation
- [ ] JSON-RPC protocol handling
- [ ] Tool validation & error handling

### Phase 3: Advanced Features
- [ ] Multi-page support
- [ ] Browser contexts (auth, cookies)
- [ ] Advanced selectors (AI-powered?)
- [ ] Trace/screenshot management

### Phase 4: Agent Integration
- [ ] Claude Desktop integration
- [ ] Ejemplo de agente usando MCP tools
- [ ] Debugging tools para agentes

## Referencias

- [Vibium (Inspiración)](https://github.com/vibium/vibium)
- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Playwright Documentation](https://playwright.dev)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
