# Actionability Rules

Este documento define las reglas de interacción con elementos del navegador para garantizar tests estables y mantenibles.

## Principios Fundamentales

### 1. Locator-Only Approach
**Nunca uses selectores directos**, siempre utiliza locators de Playwright:

✅ **Correcto:**
```typescript
await page.locator('button.submit').click();
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByText('Login').click();
```

❌ **Incorrecto:**
```typescript
const button = await page.$('button.submit');
await button.click();
```

### 2. No Sleeps / No Waits Manuales
**Playwright maneja automáticamente la espera** por elementos. Nunca uses:

❌ **Prohibido:**
```typescript
await page.waitForTimeout(2000);  // Solo para debugging/visualización
await page.waitForSelector('#element');  // Redundante con locators
```

✅ **Correcto:**
```typescript
// Playwright espera automáticamente que el elemento sea actionable
await page.locator('#element').click();
```

### 3. Actionability Automática
Playwright verifica automáticamente que un elemento sea "actionable" antes de interactuar:

- **Attached:** El elemento está en el DOM
- **Visible:** El elemento es visible (no `display: none`, no `visibility: hidden`)
- **Stable:** El elemento no está en animación
- **Receives Events:** El elemento puede recibir eventos (no está cubierto por otro elemento)
- **Enabled:** El elemento no está deshabilitado (para inputs/buttons)

```typescript
// Playwright espera automáticamente todas estas condiciones
await page.locator('button').click();
```

## Locators Recomendados

### Por Prioridad (más resistente a cambios → menos resistente)

1. **Por Rol (ARIA):**
```typescript
page.getByRole('button', { name: 'Submit' })
page.getByRole('textbox', { name: 'Email' })
page.getByRole('link', { name: 'About' })
```

2. **Por Label:**
```typescript
page.getByLabel('Password')
page.getByLabel('Accept terms')
```

3. **Por Texto:**
```typescript
page.getByText('Welcome back')
page.getByText(/welcome/i)  // Case insensitive
```

4. **Por Test ID:**
```typescript
page.getByTestId('submit-button')
// Requiere: <button data-testid="submit-button">
```

5. **Por CSS/XPath (último recurso):**
```typescript
page.locator('button.btn-primary')
page.locator('xpath=//button[@type="submit"]')
```

## Assertions con Auto-Wait

Las assertions también esperan automáticamente:

```typescript
// Espera hasta 30s (timeout configurable) a que la condición sea true
await expect(page.locator('.status')).toHaveText('Success');
await expect(page).toHaveURL(/dashboard/);
await expect(page.locator('#message')).toBeVisible();
```

## Timeout Configuration

Configura timeouts globales en `playwright.config.ts`:

```typescript
export default defineConfig({
  use: {
    actionTimeout: 10_000,  // 10s para acciones
    navigationTimeout: 30_000,  // 30s para navegación
  },
  expect: {
    timeout: 5_000,  // 5s para assertions
  },
});
```

## Casos Especiales

### Esperas Explícitas (Solo cuando sea necesario)
```typescript
// Esperar a que desaparezca un loading spinner
await page.locator('.loading-spinner').waitFor({ state: 'hidden' });

// Esperar a que aparezca un elemento dinámico
await page.locator('.notification').waitFor({ state: 'visible' });

// Esperar a que una condición personalizada se cumpla
await page.waitForFunction(() => window.dataLoaded === true);
```

### Debugging Visual (Solo en desarrollo)
```typescript
// ✅ OK para debugging manual
await page.pause();  // Abre inspector de Playwright
await page.waitForTimeout(2000);  // Pausa visual
```

## Referencias

- [Playwright Actionability](https://playwright.dev/docs/actionability)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Playwright Auto-waiting](https://playwright.dev/docs/actionability#auto-waiting)
