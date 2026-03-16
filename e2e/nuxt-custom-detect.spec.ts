import { test, expect } from '@playwright/test'

test.describe('Nuxt Custom Detector Hook — X-User-Locale Header', () => {
  test('detects locale from custom X-User-Locale header (ja)', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'X-User-Locale': 'ja' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await context.close()
  })

  test('detects locale from custom X-User-Locale header (zh)', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'X-User-Locale': 'zh' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')
    await context.close()
  })

  test('falls back to default locale when no custom header is set', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })

  test('path detection takes priority (runs before hook)', async ({ browser }) => {
    // Path detection is in detectOrder, hook runs AFTER detectors.
    // So /ja path should win over X-User-Locale: zh
    const context = await browser.newContext({
      extraHTTPHeaders: { 'X-User-Locale': 'zh' },
    })
    const page = await context.newPage()
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await context.close()
  })

  test('ignores invalid locale in custom header', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'X-User-Locale': 'invalid-locale' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    await context.close()
  })
})
