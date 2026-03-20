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

test.describe('Nuxt SSR — Concurrent Request Isolation', () => {
  test('concurrent requests with different locales return correct content', async ({ browser }) => {
    // Create multiple browser contexts simulating different users
    const [ctxEn, ctxJa, ctxZh] = await Promise.all([
      browser.newContext(),
      browser.newContext({
        extraHTTPHeaders: { 'X-User-Locale': 'ja' },
      }),
      browser.newContext({
        extraHTTPHeaders: { 'X-User-Locale': 'zh' },
      }),
    ])

    const [pageEn, pageJa, pageZh] = await Promise.all([
      ctxEn.newPage(),
      ctxJa.newPage(),
      ctxZh.newPage(),
    ])

    // Fire all requests concurrently
    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/'),
      pageZh.goto('/'),
    ])

    // Each should see their own locale — no leaking between requests
    await expect(pageEn.getByTestId('current-locale')).toContainText('en')
    await expect(pageEn.getByTestId('page-title')).toContainText('Welcome Home')

    await expect(pageJa.getByTestId('current-locale')).toContainText('ja')
    await expect(pageJa.getByTestId('page-title')).toContainText('ようこそ')

    await expect(pageZh.getByTestId('current-locale')).toContainText('zh')
    await expect(pageZh.getByTestId('page-title')).toContainText('欢迎回家')

    await Promise.all([ctxEn.close(), ctxJa.close(), ctxZh.close()])
  })

  test('rapid sequential requests do not leak locale state', async ({ browser }) => {
    // First request with ja
    const ctx1 = await browser.newContext({
      extraHTTPHeaders: { 'X-User-Locale': 'ja' },
    })
    const page1 = await ctx1.newPage()
    await page1.goto('/')
    await expect(page1.getByTestId('current-locale')).toContainText('ja')

    // Immediately after, request with en (no header)
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await page2.goto('/')
    await expect(page2.getByTestId('current-locale')).toContainText('en')
    await expect(page2.getByTestId('page-title')).toContainText('Welcome Home')

    // Original ja page should still show ja
    await expect(page1.getByTestId('current-locale')).toContainText('ja')

    await Promise.all([ctx1.close(), ctx2.close()])
  })
})

test.describe('Nuxt SSR — High-Concurrency Request Isolation (10+ requests)', () => {
  test('10 concurrent requests with mixed locales return correct content', async ({ browser }) => {
    // Simulate 10 concurrent users: 4 en, 3 ja, 3 zh
    const localeHeaders = [
      undefined, undefined, undefined, undefined, // 4x en (no header)
      'ja', 'ja', 'ja',                           // 3x ja
      'zh', 'zh', 'zh',                           // 3x zh
    ]

    const contexts = await Promise.all(
      localeHeaders.map((locale) =>
        locale
          ? browser.newContext({ extraHTTPHeaders: { 'X-User-Locale': locale } })
          : browser.newContext(),
      ),
    )

    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()))

    // Fire all 10 requests concurrently
    await Promise.all(pages.map((page) => page.goto('/')))

    // Verify each page shows the correct locale
    for (let i = 0; i < localeHeaders.length; i++) {
      const expected = localeHeaders[i] ?? 'en'
      await expect(pages[i]!.getByTestId('current-locale')).toContainText(expected)
    }

    await Promise.all(contexts.map((ctx) => ctx.close()))
  })

  test('rapid locale alternation does not leak state across requests', async ({ browser }) => {
    // Rapidly alternate between locales to stress-test isolation
    for (const locale of ['ja', 'en', 'zh', 'ja', 'en', 'zh', 'ja', 'en']) {
      const ctx = locale === 'en'
        ? await browser.newContext()
        : await browser.newContext({ extraHTTPHeaders: { 'X-User-Locale': locale } })
      const page = await ctx.newPage()
      await page.goto('/')
      await expect(page.getByTestId('current-locale')).toContainText(locale)
      await ctx.close()
    }
  })

  test('concurrent requests to different paths isolate locale correctly', async ({ browser }) => {
    const [ctxEn, ctxJa, ctxZh] = await Promise.all([
      browser.newContext(),
      browser.newContext({ extraHTTPHeaders: { 'X-User-Locale': 'ja' } }),
      browser.newContext({ extraHTTPHeaders: { 'X-User-Locale': 'zh' } }),
    ])

    const [pageEn, pageJa, pageZh] = await Promise.all([
      ctxEn.newPage(),
      ctxJa.newPage(),
      ctxZh.newPage(),
    ])

    // Navigate to root, then /ja path, then root with zh header — all at once
    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/ja'),  // path detection should win
      pageZh.goto('/'),    // header detection should apply
    ])

    await expect(pageEn.getByTestId('current-locale')).toContainText('en')
    await expect(pageJa.getByTestId('current-locale')).toContainText('ja')
    await expect(pageZh.getByTestId('current-locale')).toContainText('zh')

    await Promise.all([ctxEn.close(), ctxJa.close(), ctxZh.close()])
  })
})
