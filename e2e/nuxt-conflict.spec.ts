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
  test('third-party $t is preserved', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('third-party-t')).toContainText('[third-party] test.key')
  })

  test('third-party $localePath is preserved', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('third-party-localepath')).toContainText('/third-party/test')
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

test.describe('Nuxt Conflict — Named Middleware (globalMiddleware: false)', () => {
  test('unprefixed /no-middleware is NOT redirected (no global middleware)', async ({ page }) => {
    const response = await page.goto('/no-middleware')
    // Should not redirect — page renders directly
    expect(response?.url()).toContain('/no-middleware')
    await expect(page.getByTestId('page-no-middleware')).toBeVisible()
  })

  test('unprefixed /about IS redirected (page opts into middleware)', async ({ page }) => {
    await page.goto('/about')
    // Should redirect to /en/about (prefix strategy + named middleware)
    await expect(page).toHaveURL(/\/en\/about/)
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
  })

  test('prefixed /ja/about renders without redirect', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
  })
})
