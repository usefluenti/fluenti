import { test, expect } from '@playwright/test'

test.describe('Nuxt ISR — Locale-aware Incremental Static Regeneration', () => {
  test('default locale (en) renders without prefix', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    await expect(page.getByTestId('page-description')).toContainText('This page is served via ISR')
  })

  test('Japanese locale renders with /ja prefix', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await expect(page.getByTestId('page-description')).toContainText('このページはISRで配信されています')
  })

  test('Chinese locale renders with /zh prefix', async ({ page }) => {
    await page.goto('/zh')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')
  })

  test('ISR-served pages return correct SSR HTML per locale', async ({ page }) => {
    // Verify SSR HTML directly (not client-hydrated) for each locale
    const enHtml = await page.request.get('/')
    expect(await enHtml.text()).toContain('Welcome Home')

    const jaHtml = await page.request.get('/ja')
    expect(await jaHtml.text()).toContain('ようこそ')

    const zhHtml = await page.request.get('/zh')
    expect(await zhHtml.text()).toContain('欢迎回家')
  })

  test('about page works with locale prefix under ISR', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('about-title')).toContainText('私たちについて')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('concurrent requests to different locale ISR routes return correct content', async ({ browser }) => {
    const [ctxEn, ctxJa, ctxZh] = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ])

    const [pageEn, pageJa, pageZh] = await Promise.all([
      ctxEn.newPage(),
      ctxJa.newPage(),
      ctxZh.newPage(),
    ])

    // Hit different locale routes concurrently — ISR cache should not mix locales
    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/ja'),
      pageZh.goto('/zh'),
    ])

    await expect(pageEn.getByTestId('page-title')).toContainText('Welcome Home')
    await expect(pageJa.getByTestId('page-title')).toContainText('ようこそ')
    await expect(pageZh.getByTestId('page-title')).toContainText('欢迎回家')

    await Promise.all([ctxEn.close(), ctxJa.close(), ctxZh.close()])
  })

  test('Accept-Language header detection works with ISR', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'ja;q=0.9, en;q=0.5' },
    })
    const page = await context.newPage()
    await page.goto('/')
    // Header detection should work on unprefixed route
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await context.close()
  })

  test('cookie detection works with ISR', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: 'fluenti_locale', value: 'zh', domain: 'localhost', path: '/' },
    ])
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await context.close()
  })

  test('repeated requests to same locale ISR route are consistent', async ({ page }) => {
    // Hit the same ISR route multiple times — should always return correct content
    for (let i = 0; i < 3; i++) {
      await page.goto('/ja')
      await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    }
  })
})
