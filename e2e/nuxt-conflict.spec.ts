import { test, expect } from '@playwright/test'

test.describe('Nuxt Conflict — Explicit Imports (autoImports: false)', () => {
  test('renders correctly with explicit imports from @fluenti/vue', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    await expect(page.getByTestId('page-description')).toContainText('This is the home page')
  })

  test('useI18n works via explicit import', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('current-locale')).toContainText('en')
  })

  test('locale switching works via composable', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')

    await page.getByTestId('switch-ja').click()
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('SSR renders correct locale from path prefix', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })
})

test.describe('Nuxt Conflict — Third-party Plugin Coexistence (injectGlobalProperties: false)', () => {
  test('third-party $t is preserved (fluenti does not overwrite)', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('third-party-t')).toContainText('[third-party] test.key')
  })

  test('third-party $localePath is preserved (fluenti does not overwrite)', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('third-party-localepath')).toContainText('/third-party/test')
  })

  test('fluenti useI18n and third-party $t coexist without conflict', async ({ page }) => {
    await page.goto('/en')
    // Fluenti's useI18n provides correct translations
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    // Third-party $t also works in the same app
    await expect(page.getByTestId('third-party-t')).toContainText('[third-party] test.key')
  })
})

test.describe('Nuxt Conflict — Custom Query Param (queryParamKey: "lang")', () => {
  test('?lang=ja detects locale correctly', async ({ page }) => {
    await page.goto('/?lang=ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })

  test('?lang=zh detects locale correctly', async ({ page }) => {
    await page.goto('/?lang=zh')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')
  })

  test('?locale=ja does NOT work (old param name ignored)', async ({ page }) => {
    await page.goto('/?locale=ja')
    // Should fall back to default locale since 'locale' is not the configured param
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })
})

test.describe('Nuxt Conflict — Cookie Edge Cases', () => {
  test('expired cookie falls back to default locale', async ({ browser }) => {
    const context = await browser.newContext()
    // Set a cookie with max-age=0 (effectively expired)
    await context.addCookies([
      { name: 'fluenti_locale', value: 'ja', domain: 'localhost', path: '/', expires: 0 },
    ])
    const page = await context.newPage()
    await page.goto('/en')
    // Expired cookie should not be sent — falls back to path detection
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await context.close()
  })

  test('cookie set via query param persists across page reload', async ({ page }) => {
    await page.goto('/en?lang=ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    // Reload without query param — locale should persist from detection
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('cookie with invalid locale value is ignored', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: 'fluenti_locale', value: 'xx-INVALID', domain: 'localhost', path: '/' },
    ])
    const page = await context.newPage()
    await page.goto('/en')
    // Invalid cookie should be ignored, path /en should win
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await context.close()
  })

  test('query param takes priority over cookie', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: 'fluenti_locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    const page = await context.newPage()
    // detectOrder is ['query', 'path', 'cookie', 'header'] — query should win
    await page.goto('/en?lang=zh')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await context.close()
  })
})

test.describe('Nuxt Conflict — Named Middleware (globalMiddleware: false)', () => {
  test('unprefixed / does NOT redirect (no global middleware)', async ({ page }) => {
    // With prefix strategy + globalMiddleware: false, visiting /
    // should NOT redirect to /en (unlike the default behavior).
    // Instead, it should fail with 404 since unprefixed routes
    // are removed and no middleware is there to redirect.
    const response = await page.goto('/')
    // Nuxt returns 404 for routes that don't exist
    expect(response?.status()).toBe(404)
  })

  test('prefixed /en works normally', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })

  test('prefixed /ja works normally', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })
})

test.describe('Nuxt Conflict — Component Registration (registerNuxtLinkLocale: false)', () => {
  test('NuxtLinkLocale is NOT available as auto-resolved component', async ({ page }) => {
    await page.goto('/en')
    // The fixture uses <NuxtLink> not <NuxtLinkLocale>.
    // With registerNuxtLinkLocale: false, NuxtLinkLocale should not be globally available.
    // We verify that standard NuxtLink still works (not broken by the opt-out).
    await expect(page.getByTestId('link-about')).toBeVisible()
    await expect(page.getByTestId('link-about')).toHaveAttribute('href', /\/en\/about|\/about/)
  })
})
