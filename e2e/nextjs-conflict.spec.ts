import { test, expect } from '@playwright/test'

test.describe('Next.js Conflict — Loader Coexistence (loaderEnforce: undefined)', () => {
  test('page renders correctly without enforce: pre', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toBeVisible()
    await expect(page.getByTestId('home-page')).toBeVisible()
  })

  test('t`` tagged templates still work', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
  })

  test('custom webpack loader also runs (data-custom-loader attribute present)', async ({ page }) => {
    await page.goto('/')
    // The custom loader injects data-custom-loader="true" on elements with data-testid
    const homeEl = page.locator('[data-custom-loader="true"][data-testid="home-page"]')
    await expect(homeEl).toBeVisible()
  })

  test('both loaders process the same file correctly', async ({ page }) => {
    await page.goto('/')
    // Fluenti loader transforms t`` → correct translation
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    // Custom loader adds data-custom-loader attribute
    const welcomeEl = page.locator('[data-custom-loader="true"][data-testid="welcome"]')
    await expect(welcomeEl).toBeVisible()
  })

  test('RSC page renders with correct translations', async ({ page }) => {
    await page.goto('/rsc')
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
    await expect(page.getByTestId('rsc-locale')).toContainText('Current server locale: en')
  })

  test('locale switching works normally', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('current-locale')).toContainText('en')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluentiへようこそ')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('I18nProvider setup works correctly', async ({ page }) => {
    await page.goto('/')
    // html lang attribute should be set by layout
    const htmlLang = await page.locator('html').getAttribute('lang')
    expect(htmlLang).toBe('en')
  })
})

test.describe('Next.js Conflict — Config Preservation', () => {
  test('user webpack config is preserved (custom loader active)', async ({ page }) => {
    await page.goto('/rsc')
    // Custom loader should also have run on the RSC page
    const rscEl = page.locator('[data-custom-loader="true"][data-testid="rsc-page"]')
    await expect(rscEl).toBeVisible()
  })
})
