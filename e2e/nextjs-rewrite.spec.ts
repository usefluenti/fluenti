import { test, expect } from '@playwright/test'

/**
 * E2E tests for createI18nMiddleware with rewriteDefaultLocale: true.
 *
 * App structure: app/[locale]/ — source locale (en) has no URL prefix.
 * Middleware: createI18nMiddleware({ rewriteDefaultLocale: true })
 *
 * Key behaviors under test:
 * - GET /       → URL stays /, internally rewritten to /en (not a redirect)
 * - GET /about  → URL stays /about, internally rewritten to /en/about
 * - GET /en     → 302 redirect → / (as-needed: source locale stripped from URL)
 * - GET /ja     → 200, Japanese content (no redirect)
 * - GET /about  + cookie=ja → 302 redirect → /ja/about
 */

test.describe('Next.js rewriteDefaultLocale middleware', () => {
  // ─── Group 1: rewriteDefaultLocale core behavior ───

  test('GET / stays at / and renders English (internal rewrite to /en)', async ({ page }) => {
    await page.goto('/')
    // URL must NOT change — rewrite is internal
    expect(page.url()).toMatch(/\/$|\/\?/)
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('current-locale')).toContainText('en')
  })

  test('GET /about stays at /about and renders English about page', async ({ page }) => {
    await page.goto('/about')
    expect(page.url()).toContain('/about')
    // URL must not contain /en/about — rewrite is internal
    expect(page.url()).not.toContain('/en/about')
    await expect(page.getByTestId('about-page')).toBeVisible()
    await expect(page.getByTestId('about-title')).toContainText('About')
  })

  test('GET /en redirects to / (source locale stripped in as-needed mode)', async ({ page }) => {
    await page.goto('/en')
    // Should redirect 302 → / (canonical URL has no /en prefix)
    expect(page.url()).toMatch(/\/$|\/\?/)
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('GET /en/about redirects to /about', async ({ page }) => {
    await page.goto('/en/about')
    expect(page.url()).toContain('/about')
    expect(page.url()).not.toContain('/en/about')
    await expect(page.getByTestId('about-page')).toBeVisible()
    await expect(page.getByTestId('about-title')).toContainText('About')
  })

  // ─── Group 2: Non-source locale behavior unchanged ───

  test('GET /ja renders Japanese homepage without redirect', async ({ page }) => {
    await page.goto('/ja')
    expect(page.url()).toContain('/ja')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('GET /zh-CN renders Chinese homepage', async ({ page }) => {
    await page.goto('/zh-CN')
    expect(page.url()).toContain('/zh-CN')
    await expect(page.getByTestId('welcome')).toContainText('欢迎使用 Fluenti')
    await expect(page.getByTestId('current-locale')).toContainText('zh-CN')
  })

  test('GET /ja/about renders Japanese about page', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('about-page')).toBeVisible()
    await expect(page.getByTestId('about-title')).toContainText('概要')
  })

  test('GET /about with cookie=ja redirects to /ja/about', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5208' },
    ])
    await page.goto('/about')
    expect(page.url()).toContain('/ja/about')
    await expect(page.getByTestId('about-title')).toContainText('概要')
  })

  test('GET / with cookie=ja redirects to /ja', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5208' },
    ])
    await page.goto('/')
    expect(page.url()).toContain('/ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  // ─── Group 3: SSR HTML validation ───

  test('SSR HTML for / contains English content', async ({ page }) => {
    const response = await page.request.get('/')
    const html = await response.text()
    expect(html).toContain('Welcome to Fluenti')
  })

  test('SSR HTML for /ja contains Japanese content', async ({ page }) => {
    const response = await page.request.get('/ja')
    const html = await response.text()
    expect(html).toContain('Fluenti へようこそ')
  })

  test('SSR HTML for /ja/about contains Japanese about content', async ({ page }) => {
    const response = await page.request.get('/ja/about')
    const html = await response.text()
    expect(html).toContain('概要')
  })

  test('SSR HTML for /about (en default) contains English content', async ({ page }) => {
    const response = await page.request.get('/about')
    const html = await response.text()
    expect(html).toContain('About')
    expect(html).toContain('This is the about page.')
  })

  // ─── Group 4: Concurrent SSR isolation ───

  test('concurrent requests to /, /ja, /zh-CN return correct locale content', async ({ browser }) => {
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

    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/ja'),
      pageZh.goto('/zh-CN'),
    ])

    await expect(pageEn.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(pageJa.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(pageZh.getByTestId('welcome')).toContainText('欢迎使用 Fluenti')

    await Promise.all([ctxEn.close(), ctxJa.close(), ctxZh.close()])
  })

  test('path-based detection takes priority over cookie', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: 'locale', value: 'zh-CN', domain: 'localhost', path: '/' },
    ])
    const page = await context.newPage()
    // Cookie says zh-CN but URL path says ja — path wins
    await page.goto('/ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await context.close()
  })

  test('repeated requests to same route return consistent content', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.goto('/ja')
      await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    }
  })

  // ─── Group 5: Hydration check ───

  test('no fluenti-related hydration errors on /', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(msg.text()))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const fluentiErrors = consoleLogs.filter(
      (log) => log.includes('[fluenti]') && log.includes('mismatch'),
    )
    expect(fluentiErrors).toHaveLength(0)
  })

  test('no fluenti-related hydration errors on /ja', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(msg.text()))

    await page.goto('/ja')
    await page.waitForLoadState('networkidle')

    const fluentiErrors = consoleLogs.filter(
      (log) => log.includes('[fluenti]') && log.includes('mismatch'),
    )
    expect(fluentiErrors).toHaveLength(0)
  })
})
