import { test, expect } from '@playwright/test'

test.describe('Nuxt Prefix Strategy — Middleware Redirect', () => {
  test('redirects unprefixed root to locale-prefixed URL', async ({ page }) => {
    // With 'prefix' strategy, visiting / should redirect to a locale-prefixed URL.
    // detectOrder is ['query', 'path', 'cookie', 'header'].
    // No query, no path locale, no cookie, no Accept-Language → fallbackLocale = 'ja'
    const response = await page.goto('/')
    // Should have been redirected to /ja (fallbackLocale)
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    expect(page.url()).toContain('/ja')
  })

  test('redirects unprefixed /about to locale-prefixed URL', async ({ page }) => {
    const response = await page.goto('/about')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
    expect(page.url()).toContain('/ja/about')
  })

  test('does not redirect when path already has valid locale prefix', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    expect(page.url()).toContain('/en')
  })

  test('cookie locale is applied after redirect via plugin detection', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: 'fluenti_locale', value: 'zh', domain: 'localhost', path: '/' },
    ])
    const page = await context.newPage()
    // Navigate directly to a prefixed URL — cookie locale applies via plugin
    await page.goto('/zh/about')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('关于我们')
    await context.close()
  })

  test('prefixed URL with cookie preserves correct locale', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addCookies([
      { name: 'fluenti_locale', value: 'en', domain: 'localhost', path: '/' },
    ])
    const page = await context.newPage()
    // Path locale 'ja' takes precedence over cookie 'en'
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await context.close()
  })
})

test.describe('Nuxt Prefix Strategy — Fallback Locale', () => {
  test('falls back to fallbackLocale (ja) when no detector resolves', async ({ page }) => {
    // No cookie, no Accept-Language, no query → fallbackLocale = 'ja'
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })

  test('fallbackLocale differs from defaultLocale', async ({ browser }) => {
    // Send unsupported Accept-Language, no cookie → should use fallbackLocale 'ja', NOT defaultLocale 'en'
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'fr,de;q=0.5' },
    })
    const page = await context.newPage()
    await page.goto('/')
    // Should fall back to 'ja' (fallbackLocale), not 'en' (defaultLocale)
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await context.close()
  })
})

test.describe('Nuxt Prefix Strategy — Path Detection Priority', () => {
  test('path locale is detected from URL prefix', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })

  test('path locale works for non-default locales', async ({ page }) => {
    await page.goto('/zh')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')
  })

  test('path locale works on subpages', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
  })

  test('ignores invalid query locale and uses path', async ({ page }) => {
    await page.goto('/en?locale=invalid')
    // Invalid locale ignored, path detector finds 'en'
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })
})

test.describe('Nuxt Prefix Strategy — NuxtLinkLocale Component', () => {
  test('NuxtLinkLocale generates locale-prefixed hrefs', async ({ page }) => {
    await page.goto('/en')
    // nav-home should point to /en (current locale)
    await expect(page.getByTestId('nav-home')).toHaveAttribute('href', '/en')
    // nav-about should point to /en/about
    await expect(page.getByTestId('nav-about')).toHaveAttribute('href', '/en/about')
  })

  test('NuxtLinkLocale locale prop overrides current locale', async ({ page }) => {
    await page.goto('/en')
    // link-about-ja always generates /ja/about regardless of current locale
    await expect(page.getByTestId('link-about-ja')).toHaveAttribute('href', '/ja/about')
    // link-about-zh always generates /zh/about
    await expect(page.getByTestId('link-about-zh')).toHaveAttribute('href', '/zh/about')
  })

  test('NuxtLinkLocale hrefs update after locale switch', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('nav-home')).toHaveAttribute('href', '/en')

    // Switch to Japanese
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    // nav-home should now point to /ja
    await expect(page.getByTestId('nav-home')).toHaveAttribute('href', '/ja')
    await expect(page.getByTestId('nav-about')).toHaveAttribute('href', '/ja/about')

    // Explicit locale props should remain fixed
    await expect(page.getByTestId('link-about-ja')).toHaveAttribute('href', '/ja/about')
    await expect(page.getByTestId('link-about-zh')).toHaveAttribute('href', '/zh/about')
  })

  test('NuxtLinkLocale performs client-side navigation', async ({ page }) => {
    await page.goto('/en')
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
    await expect(page.getByTestId('current-path')).toContainText('/en/about')
  })
})

test.describe('Nuxt Prefix Strategy — Locale Switching', () => {
  test('switches locale and updates URL prefix', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    expect(page.url()).toContain('/ja')
  })

  test('round-trip: en → ja → zh → en preserves page', async ({ page }) => {
    await page.goto('/en/about')
    await expect(page.getByTestId('page-title')).toContainText('About Us')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
    expect(page.url()).toContain('/ja/about')

    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('page-title')).toContainText('关于我们')
    expect(page.url()).toContain('/zh/about')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
    expect(page.url()).toContain('/en/about')
  })
})
