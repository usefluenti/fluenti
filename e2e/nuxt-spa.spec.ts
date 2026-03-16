import { test, expect } from '@playwright/test'

test.describe('Nuxt SPA — Client-only Rendering', () => {
  test('renders home page entirely on the client', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    await expect(page.getByTestId('render-mode')).toContainText('SPA')
  })

  test('HTML source does not contain pre-rendered content (SPA shell only)', async ({ page }) => {
    const response = await page.goto('/')
    const html = await response!.text()
    // In SPA mode, the initial HTML is a shell — translated content should NOT be in source
    expect(html).not.toContain('Welcome Home')
    expect(html).not.toContain('data-testid="page-title"')
  })

  test('renders about page on client-side navigation', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
    await expect(page.getByTestId('current-path')).toContainText('/about')
  })
})

test.describe('Nuxt SPA — Locale Switching', () => {
  test('switches to Japanese via locale switcher', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await expect(page.getByTestId('current-path')).toContainText('/ja')
  })

  test('switches to Chinese and navigates', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('page-title')).toContainText('关于我们')
    await expect(page.getByTestId('current-path')).toContainText('/zh/about')
  })

  test('round-trip: en → ja → zh → en', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')

    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })
})

test.describe('Nuxt SPA — Cookie Locale Persistence', () => {
  test('persists locale in cookie after switching', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')

    // Switch to Japanese
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    // Check cookie was set
    const cookies = await context.cookies()
    const localeCookie = cookies.find(c => c.name === 'fluenti_locale')
    expect(localeCookie).toBeDefined()
    expect(localeCookie!.value).toBe('ja')
  })

  test('restores locale from cookie on fresh page load', async ({ page, context }) => {
    // Set cookie before visiting
    await context.addCookies([
      { name: 'fluenti_locale', value: 'zh', domain: 'localhost', path: '/' },
    ])

    await page.goto('/')
    // In SPA + prefix_except_default, the app should detect cookie locale
    // and either redirect or display zh content
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')

    await context.clearCookies()
  })
})

test.describe('Nuxt SPA — Direct URL Navigation', () => {
  test('direct navigation to /ja renders Japanese', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })

  test('direct navigation to /zh/about renders Chinese about', async ({ page }) => {
    await page.goto('/zh/about')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('关于我们')
  })

  test('direct navigation to /about (no prefix) uses default locale', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('page-title')).toContainText('About Us')
  })
})
