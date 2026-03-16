import { test, expect } from '@playwright/test'

test.describe('Next.js App Router e2e', () => {
  // === Existing tests (preserved) ===

  test('streaming page shows fallback then content', async ({ page }) => {
    await page.goto('/streaming')
    await expect(page.getByTestId('streaming-page')).toBeVisible()
    await expect(page.getByTestId('streaming-title')).toContainText('Streaming')
    await expect(page.getByTestId('streamed-content')).toContainText('Streamed content loaded!')
  })

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
      { name: 'locale', value: 'ja', url: 'http://localhost:5190' },
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
      { name: 'locale', value: 'ja', url: 'http://localhost:5190' },
    ])
    await page.reload()
    await expect(page.getByTestId('metadata-title')).toContainText('メタデータページ')
    await expect(page).toHaveTitle('メタデータページ')
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
      { name: 'locale', value: 'ja', url: 'http://localhost:5190' },
    ])
    await page.goto('/server-action')
    await expect(page.getByTestId('action-title')).toContainText('サーバーアクションデモ')

    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('サーバーアクションからこんにちは')
  })

  test('RTL direction is set for Arabic locale', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ar', url: 'http://localhost:5190' },
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
      { name: 'locale', value: 'ar', url: 'http://localhost:5190' },
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
    // Set cookie to Japanese
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5190' },
    ])
    // But use query param for English — query should win
    await page.goto('/rsc?lang=en')
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
    await expect(page.getByTestId('rsc-locale')).toContainText('Current server locale: en')
  })

  // === Trans component in Next.js client page ===

  test('richtext page renders Trans with link', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('richtext-page')).toBeVisible()
    await expect(page.getByTestId('trans-link').locator('a[href="/docs"]')).toContainText('documentation')
  })

  test('richtext page renders Trans with bold', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')
  })

  test('richtext page renders Trans with multiple elements', async ({ page }) => {
    await page.goto('/richtext')
    // <a href="/login">sign in</a> + <strong>register</strong>
    await expect(page.getByTestId('trans-multi').locator('a[href="/login"]')).toContainText('sign in')
    await expect(page.getByTestId('trans-multi').locator('strong')).toContainText('register')
  })

  // === msg`` lazy message descriptors ===

  test('msg tagged template renders lazy messages', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('richtext-title')).toContainText('Rich Text Demos')
    await expect(page.getByTestId('richtext-subtitle')).toContainText('Components for complex translations')
  })

  test('msg tagged template translates when locale switches to Japanese', async ({ page }) => {
    await page.goto('/richtext')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('richtext-title')).toContainText('リッチテキストデモ')
    await expect(page.getByTestId('richtext-subtitle')).toContainText('複雑な翻訳のためのコンポーネント')
  })

  test('Trans components translate when locale switches to Japanese', async ({ page }) => {
    await page.goto('/richtext')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('trans-link').locator('a[href="/docs"]')).toContainText('ドキュメント')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('重要な')
  })

  // === fallbackLocale — missing key falls back to English ===

  test('fallback locale shows English text for missing Japanese translation', async ({ page }) => {
    await page.goto('/fallback')
    await expect(page.getByTestId('fallback-page')).toBeVisible()
    // Verify both keys render in English
    await expect(page.getByTestId('fallback-only-en')).toContainText('This text is only translated in English')
    await expect(page.getByTestId('fallback-both')).toContainText('Welcome to Fluenti')

    // Switch to Japanese
    await page.getByTestId('lang-ja').click()
    // Key present in ja — should be Japanese
    await expect(page.getByTestId('fallback-both')).toContainText('Fluenti へようこそ')
    // Key NOT in ja — should fall back to English
    await expect(page.getByTestId('fallback-only-en')).toContainText('This text is only translated in English')
  })

  // ─── RSC Rich Text (Server Components with Trans, Plural, DateTime, NumberFormat) ───

  test('RSC richtext page renders Trans with link', async ({ page }) => {
    await page.goto('/rsc-richtext')
    await expect(page.getByTestId('rsc-richtext-page')).toBeVisible()
    const link = page.getByTestId('rsc-trans-link').locator('a')
    await expect(link).toHaveAttribute('href', '/docs')
    await expect(link).toContainText('documentation')
  })

  test('RSC richtext page renders Trans with bold', async ({ page }) => {
    await page.goto('/rsc-richtext')
    const bold = page.getByTestId('rsc-trans-bold').locator('strong')
    await expect(bold).toContainText('important')
  })

  test('RSC richtext page renders Plural', async ({ page }) => {
    await page.goto('/rsc-richtext')
    await expect(page.getByTestId('rsc-plural')).toContainText('5 items')
    await expect(page.getByTestId('rsc-plural-zero')).toContainText('No items')
  })

  test('RSC richtext page renders DateTime', async ({ page }) => {
    await page.goto('/rsc-richtext')
    await expect(page.getByTestId('rsc-date')).not.toBeEmpty()
  })

  test('RSC richtext page renders NumberFormat', async ({ page }) => {
    await page.goto('/rsc-richtext')
    const text = await page.getByTestId('rsc-number').textContent()
    expect(text).toContain('1')
    expect(text).toContain('234')
  })

  test('RSC richtext page translates Trans when locale is Japanese', async ({ page }) => {
    // Set Japanese locale via cookie
    await page.context().addCookies([{ name: 'locale', value: 'ja', url: 'http://localhost:5190' }])
    await page.goto('/rsc-richtext')
    await expect(page.getByTestId('rsc-richtext-page')).toBeVisible()
    const link = page.getByTestId('rsc-trans-link').locator('a')
    await expect(link).toContainText('ドキュメント')
  })

  // ─── t`` tagged template verification (via @fluenti/next webpack loader) ───

  test('t`` with interpolation in client component translates on locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('home-desc')).toContainText('こちらはホームページです。')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')
  })

  test('t`` works in RSC without explicit hook import', async ({ page }) => {
    // Verifies webpack loader server injection path (__getServerI18n via Proxy)
    await page.goto('/rsc')
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
    await expect(page.getByTestId('rsc-desc')).toContainText('This page is a React Server Component.')
  })

  test('t`` in server action returns translated text', async ({ page }) => {
    await page.goto('/server-action')
    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('Server says: Hello from server action')
  })

  // ─── FluentProvider verification ───

  test('FluentProvider sets up both server and client i18n', async ({ page }) => {
    // Client page and RSC page both work via FluentProvider
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await page.getByTestId('nav-rsc').click()
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
  })

  test('FluentProvider passes locale to client components via cookie', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5190' },
    ])
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})
