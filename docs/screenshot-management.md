# Screenshot Management

Este documento explica cómo gestionar screenshots en playwright-mcp-framework para evitar acumulación de archivos.

## Problema

Durante el testing, especialmente cuando hay errores, se generan múltiples screenshots:
- Screenshots manuales en tests
- Screenshots automáticos de error (cuando un test falla)
- Screenshots de debugging

Sin limpieza, estos archivos se acumulan y pueden llenar el disco o dificultar encontrar screenshots relevantes.

## Solución: `cleanScreenshots()`

### Método en BrowserManager

```typescript
async cleanScreenshots(pattern: string = '*.png'): Promise<number>
```

**Características:**
- Elimina archivos de la carpeta `screenshots/`
- Soporta patrones glob (ej: `*.png`, `error-*`, `test-*.png`)
- Retorna el número de archivos eliminados
- No falla si la carpeta no existe
- Mantiene el directorio (solo elimina archivos)

### Uso Básico

#### En Tests de Playwright

```typescript
import { test } from '@playwright/test';
import { browserManager } from '../src/core/browserManager';

test.describe('My Test Suite', () => {
  
  // Limpiar screenshots ANTES de ejecutar esta suite
  test.beforeAll(async () => {
    await browserManager.cleanScreenshots();
  });

  test('my test', async () => {
    // ... test code
  });
});
```

#### En Scripts

```typescript
import { browserManager } from './src/core/browserManager';

async function main() {
  // Limpiar antes de comenzar
  await browserManager.cleanScreenshots();
  
  // ... tu código
}
```

## Estrategias de Limpieza

### 1. Limpiar Todo Antes de Cada Suite

**Cuándo usar:** Test suites independientes, CI/CD

```typescript
test.describe('Login Tests', () => {
  test.beforeAll(async () => {
    // Elimina TODOS los *.png
    await browserManager.cleanScreenshots();
  });
  
  // tests...
});
```

### 2. Limpiar Solo Screenshots de Error

**Cuándo usar:** Debugging, queremos mantener screenshots manuales

```typescript
test.describe('Feature Tests', () => {
  test.beforeAll(async () => {
    // Solo elimina error-*.png
    await browserManager.cleanScreenshots('error-*.png');
  });
  
  // tests...
});
```

### 3. NO Limpiar (Default)

**Cuándo usar:** Debugging activo, análisis post-mortem

```typescript
test.describe('Debug Tests', () => {
  // NO hay beforeAll
  // Los screenshots se acumulan para análisis
  
  // tests...
});
```

### 4. Limpiar Selectivamente por Patrón

```typescript
// Limpiar solo screenshots de tests específicos
await browserManager.cleanScreenshots('test-login-*.png');

// Limpiar solo screenshots antiguos (con timestamp en nombre)
await browserManager.cleanScreenshots('*-20260126*.png');

// Limpiar todo excepto... (usar patrón inverso manualmente)
// O simplemente no limpiar y filtrar manualmente
```

## Ejemplos Prácticos

### Ejemplo 1: Suite con Limpieza Automática

```typescript
// tests/features/auth.spec.ts
import { test, expect } from '@playwright/test';
import { browserManager } from '../../src/core/browserManager';

test.describe('Authentication Tests', () => {
  
  test.beforeAll(async () => {
    // Iniciar con carpeta limpia
    const deleted = await browserManager.cleanScreenshots();
    console.log(`Cleaned ${deleted} old screenshots`);
  });

  test.beforeEach(async () => {
    await browserManager.launch({ headless: true });
  });

  test.afterEach(async () => {
    await browserManager.quit();
  });

  test('user can login', async () => {
    await browserManager.navigate('https://app.example.com');
    await browserManager.type('#email', 'user@example.com');
    await browserManager.type('#password', 'secret');
    await browserManager.click('button[type="submit"]');
    
    // Screenshot manual de éxito
    await browserManager.screenshot({ 
      path: 'screenshots/login-success.png' 
    });
  });
});
```

### Ejemplo 2: Multiple Suites, Limpieza Individual

```typescript
// tests/suite-a.spec.ts
test.describe('Suite A', () => {
  test.beforeAll(async () => {
    await browserManager.cleanScreenshots('suite-a-*.png');
  });
  // tests...
});

// tests/suite-b.spec.ts
test.describe('Suite B', () => {
  test.beforeAll(async () => {
    await browserManager.cleanScreenshots('suite-b-*.png');
  });
  // tests...
});
```

### Ejemplo 3: CI/CD Pipeline

```typescript
// tests/setup.ts (global setup)
import { browserManager } from '../src/core/browserManager';

async function globalSetup() {
  console.log('Cleaning screenshots before test run...');
  const deleted = await browserManager.cleanScreenshots();
  console.log(`Deleted ${deleted} old screenshots`);
}

export default globalSetup;
```

**playwright.config.ts:**
```typescript
export default defineConfig({
  globalSetup: require.resolve('./tests/setup'),
  // ...
});
```

## Configuración del Directorio

Por defecto, screenshots se guardan en `./screenshots`.

**Cambiar directorio:**

```bash
# .env o variables de entorno
SCREENSHOT_DIR=./test-artifacts/screenshots
```

## API de Bajo Nivel

Si necesitas más control, puedes usar las utilidades de filesystem directamente:

```typescript
import { cleanDirectory } from './src/utils/fs';

// Limpiar cualquier directorio
await cleanDirectory('./screenshots', '*.png');

// Limpiar con patrón personalizado
await cleanDirectory('./screenshots', 'test-*-2026-01-27*.png');
```

## Best Practices

### ✅ DO

1. **Usa `beforeAll` en suites independientes:**
   ```typescript
   test.describe('Suite', () => {
     test.beforeAll(() => browserManager.cleanScreenshots());
   });
   ```

2. **Nombra screenshots descriptivamente:**
   ```typescript
   await browserManager.screenshot({ 
     path: 'screenshots/suite-name-test-step.png' 
   });
   ```

3. **Limpia en CI/CD:**
   - Usa `globalSetup` para limpiar antes de todos los tests
   - O usa comandos de shell en CI

4. **Usa patrones para limpieza selectiva:**
   ```typescript
   cleanScreenshots('error-*.png')  // Solo errores
   cleanScreenshots('test-*.png')   // Solo tests manuales
   ```

### ❌ DON'T

1. **No limpies en `beforeEach` (demasiado agresivo):**
   ```typescript
   // ❌ Eliminaría screenshots útiles entre tests
   test.beforeEach(() => browserManager.cleanScreenshots());
   ```

2. **No confíes solo en limpieza automática para debugging:**
   - Cuando debuggeas, comenta la limpieza temporalmente

3. **No olvides `.gitignore`:**
   ```gitignore
   # .gitignore
   screenshots/**/*.png
   !screenshots/.gitkeep
   ```

## Troubleshooting

### "No se eliminan los screenshots"

**Causa:** Path incorrecto o permisos.

**Solución:**
```typescript
// Verificar path
import { config } from './src/core/config';
console.log('Screenshot dir:', config.screenshotDir);

// Verificar permisos
import { pathExists } from './src/utils/fs';
const exists = await pathExists('./screenshots');
```

### "Se eliminan screenshots que necesito"

**Causa:** Patrón muy amplio o limpieza en lugar incorrecto.

**Solución:**
- Usa patrones más específicos: `error-*.png` en vez de `*.png`
- Mueve limpieza a `beforeAll` de suite específica
- O no uses limpieza automática temporalmente

### "Demasiados screenshots en CI"

**Solución:**
```typescript
// globalSetup.ts
async function globalSetup() {
  if (process.env.CI) {
    await browserManager.cleanScreenshots();
  }
}
```

## Referencias

- [src/utils/fs.ts](../src/utils/fs.ts) - Utilidades de filesystem
- [src/core/browserManager.ts](../src/core/browserManager.ts) - Método `cleanScreenshots()`
- [tests/browserManager.spec.ts](../tests/browserManager.spec.ts) - Ejemplos de uso
