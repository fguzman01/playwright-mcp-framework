# Process Cleanup & Shutdown

Este documento define cómo manejar correctamente el ciclo de vida de procesos, navegadores y limpieza de recursos.

## Principio Central: Shutdown Graceful

Todos los recursos (navegadores, contextos, páginas) deben cerrarse correctamente para:
- Evitar procesos zombies
- Liberar puertos y sockets
- Prevenir memory leaks
- Garantizar reportes completos

## Arquitectura de Cleanup

### 1. Test-Level Cleanup (Automático)

Playwright maneja automáticamente la limpieza después de cada test:

```typescript
import { test } from '@playwright/test';

test('example', async ({ page, context, browser }) => {
  // page, context y browser se cierran automáticamente al finalizar
  await page.goto('https://example.com');
});
```

**No es necesario** llamar a `await page.close()` en tests normales.

### 2. Suite-Level Cleanup (beforeAll/afterAll)

Para recursos compartidos:

```typescript
import { test, Browser, chromium } from '@playwright/test';

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch();
});

test.afterAll(async () => {
  await browser.close();  // ⚠️ Importante: cerrar manualmente
});

test('example', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // ...
  await context.close();  // Cerrar recursos creados manualmente
});
```

### 3. Global Cleanup (globalSetup/globalTeardown)

Para recursos globales (servidores, bases de datos):

**globalSetup.ts:**
```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  // Guardar estado si es necesario
  await browser.close();
}

export default globalSetup;
```

**globalTeardown.ts:**
```typescript
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Limpiar recursos globales
  console.log('Global cleanup completed');
}

export default globalTeardown;
```

**playwright.config.ts:**
```typescript
export default defineConfig({
  globalSetup: require.resolve('./globalSetup'),
  globalTeardown: require.resolve('./globalTeardown'),
});
```

## Signal Handling (SIGINT/SIGTERM)

### Para Scripts Custom

Cuando crees procesos fuera de Playwright (ej: MCP server):

```typescript
import { Browser, chromium } from 'playwright';

let browser: Browser | null = null;

async function main() {
  browser = await chromium.launch();
  
  // Registrar handlers de señales
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown();
  });
  
  // Tu lógica aquí
}

async function shutdown() {
  console.log('\nShutting down gracefully...');
  
  if (browser) {
    await browser.close();
    browser = null;
  }
  
  process.exit(0);
}

main();
```

### Para MCP Server

El servidor MCP debe manejar `initialize` y un método custom de shutdown:

```typescript
class MCPServer {
  private browser: Browser | null = null;
  
  async initialize() {
    this.browser = await chromium.launch();
    
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  async shutdown() {
    console.log('Closing browser...');
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    console.log('Shutdown complete');
    process.exit(0);
  }
}
```

## Playwright Test Runner Cleanup

El test runner de Playwright ya maneja SIGINT/SIGTERM correctamente:

```bash
# Ctrl+C durante la ejecución
npm test
^C  # Playwright cierra navegadores y genera reportes antes de salir
```

## Best Practices

### ✅ DO

- Usa fixtures de Playwright (`{ page }`) para cleanup automático
- Cierra manualmente recursos creados con `browser.newContext()` o `context.newPage()`
- Registra signal handlers en scripts standalone
- Usa `try/finally` para garantizar cleanup en operaciones críticas:

```typescript
const context = await browser.newContext();
try {
  const page = await context.newPage();
  await page.goto('https://example.com');
} finally {
  await context.close();  // Siempre se ejecuta
}
```

### ❌ DON'T

- No dejes navegadores abiertos en `beforeAll` sin cerrarlos en `afterAll`
- No ignores errores en cleanup (pueden dejar procesos zombies)
- No uses `process.exit()` en tests (interrumpe el test runner)
- No confíes solo en `process.on('exit')` (no es async-safe)

## Debugging Cleanup Issues

### Encontrar procesos zombies

**Linux/Mac:**
```bash
ps aux | grep chromium
ps aux | grep playwright
```

**Windows:**
```powershell
Get-Process | Where-Object { $_.ProcessName -like "*chrome*" }
```

### Forzar cleanup

```bash
# Matar todos los procesos de Chromium
pkill -9 chromium

# Windows PowerShell
Get-Process chrome | Stop-Process -Force
```

## Referencias

- [Playwright Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Node.js Process Signals](https://nodejs.org/api/process.html#process_signal_events)
- [Playwright Browser Contexts](https://playwright.dev/docs/browser-contexts)
