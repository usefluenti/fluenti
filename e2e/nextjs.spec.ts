import { test, expect } from '@playwright/test'

test.describe('Next.js App Router e2e', () => {
  // === Existing tests (preserved) ===

  test('home page renders welcome and greeting', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('home-desc')).toContainText('This is the home page.')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
  })

  test('about page renders with interpolation', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('about-page')).toBeVisible()
    await expect(page.getByTestId('about-title')).toContainText('About our project')
    await expect(page.getByTestId('contact')).toContainText('Contact us at hello@fluenti.dev')
  })

  test('plurals page with counter', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.getByTestId('plural-result')).toContainText('No messages')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')

    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
  })

  test('client-side navigation between pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-page')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('home-page')).toBeVisible()
  })

  test('locale switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')
  })

  test('locale persists across page navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-title')).toContainText('私たちのプロジェクトについて')

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('switching back to English restores text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  // === New tests ===

  test('RSC page renders server-side content', async ({ page }) => {
    await page.goto('/rsc')
    await expect(page.getByTestId('rsc-page')).toBeVisible()
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
    await expect(page.getByTestId('rsc-desc')).toContainText('This page is a React Server Component.')
    await expect(page.getByTestId('rsc-locale')).toContainText('Current server locale: en')
  })

  test('RSC page with query param locale override', async ({ page }) => {
    await page.goto('/rsc?lang=ja')
    await expect(page.getByTestId('rsc-title')).toContainText('サーバーレンダリング')
    await expect(page.getByTestId('rsc-desc')).toContainText('このページは React サーバーコンポーネントです。')
    await expect(page.getByTestId('rsc-locale')).toContainText('現在のサーバーロケール：ja')
  })

  test('cookie-based locale on RSC page', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5183' },
    ])
    await page.goto('/rsc')
    await expect(page.getByTestId('rsc-title')).toContainText('サーバーレンダリング')
    await expect(page.getByTestId('rsc-locale')).toContainText('現在のサーバーロケール：ja')
  })

  test('generateMetadata translates document title', async ({ page }) => {
    await page.goto('/metadata')
    await expect(page.getByTestId('metadata-page')).toBeVisible()
    await expect(page.getByTestId('metadata-title')).toContainText('Metadata Page')
    await expect(page).toHaveTitle('Metadata Page')

    // Switch to Japanese via cookie and reload
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5183' },
    ])
    await page.reload()
    await expect(page.getByTestId('metadata-title')).toContainText('メタデータページ')
    await expect(page).toHaveTitle('メタデータページ')
  })

  test('streaming page shows fallback then content', async ({ page }) => {
    await page.goto('/streaming')
    await expect(page.getByTestId('streaming-page')).toBeVisible()
    await expect(page.getByTestId('streaming-title')).toContainText('Streaming')
    await expect(page.getByTestId('streamed-content')).toContainText('Streamed content loaded!')
  })

  test('server action returns translated result', async ({ page }) => {
    await page.goto('/server-action')
    await expect(page.getByTestId('action-page')).toBeVisible()
    await expect(page.getByTestId('action-title')).toContainText('Server Action Demo')

    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('Server says: Hello from server action')
  })

  test('server action respects locale cookie', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5183' },
    ])
    await page.goto('/server-action')
    await expect(page.getByTestId('action-title')).toContainText('サーバーアクションデモ')

    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('サーバーアクションからこんにちは')
  })

  test('RTL direction is set for Arabic locale', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ar', url: 'http://localhost:5183' },
    ])
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('ar')
    await expect(page.getByTestId('welcome')).toContainText('مرحباً بكم في Fluenti')
  })

  test('RTL switches back to LTR when changing to English', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ar', url: 'http://localhost:5183' },
    ])
    await page.goto('/')
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')

    await page.getByTestId('lang-en').click()
    // After switching locale, router.refresh() triggers a server re-render
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await page.waitForFunction(() => document.documentElement.getAttribute('dir') === 'ltr')
    expect(await page.locator('html').getAttribute('dir')).toBe('ltr')
  })

  test('cookie persists locale across page reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    // Verify cookie was set
    const cookies = await page.context().cookies()
    const localeCookie = cookies.find((c) => c.name === 'locale')
    expect(localeCookie?.value).toBe('ja')

    // Reload the page - cookie should be sent to server
    await page.reload()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('query param overrides cookie on RSC page', async ({ page }) => {
    // Set cookie to English
    await page.context().addCookies([
      { name: 'locale', value: 'en', url: 'http://localhost:5183' },
    ])
    // But use query param for Japanese
    await page.goto('/rsc?lang=ja')
    await expect(page.getByTestId('rsc-title')).toContainText('サーバーレンダリング')
    await expect(page.getByTestId('rsc-locale')).toContainText('現在のサーバーロケール：ja')
  })
})
