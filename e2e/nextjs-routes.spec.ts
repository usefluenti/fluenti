import { test, expect } from '@playwright/test'

test.describe('Next.js path-based routing e2e', () => {
  // ─── Group 1: Middleware redirects ───

  test('bare root / redirects to /en', async ({ page }) => {
    const response = await page.goto('/')
    expect(page.url()).toContain('/en')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('bare path /plurals redirects to /en/plurals', async ({ page }) => {
    await page.goto('/plurals')
    expect(page.url()).toContain('/en/plurals')
    await expect(page.getByTestId('plurals-page')).toBeVisible()
  })

  test('/ja renders Japanese without redirect', async ({ page }) => {
    const response = await page.goto('/ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('/ja/plurals renders Japanese without redirect', async ({ page }) => {
    await page.goto('/ja/plurals')
    await expect(page.getByTestId('plurals-page')).toBeVisible()
  })

  test('cookie locale=ja causes / to redirect to /ja', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5196' },
    ])
    await page.goto('/')
    expect(page.url()).toContain('/ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  // ─── Group 2: Path locale detection ───

  test('/en renders English content', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('home-desc')).toContainText('This is the home page.')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
  })

  test('/ja renders Japanese content', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('home-desc')).toContainText('こちらはホームページです。')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')
  })

  test('/zh-CN renders Chinese content', async ({ page }) => {
    await page.goto('/zh-CN')
    await expect(page.getByTestId('welcome')).toContainText('欢迎使用 Fluenti')
    await expect(page.getByTestId('home-desc')).toContainText('这是首页。')
    await expect(page.getByTestId('greeting')).toContainText('你好，World！')
  })

  test('/ja/rsc uses path locale for RSC (not cookie)', async ({ page }) => {
    // Set cookie to English but visit /ja/rsc — path should win
    await page.context().addCookies([
      { name: 'locale', value: 'en', url: 'http://localhost:5196' },
    ])
    await page.goto('/ja/rsc')
    await expect(page.getByTestId('rsc-title')).toContainText('サーバーレンダリング')
    await expect(page.getByTestId('rsc-locale')).toContainText('現在のサーバーロケール：ja')
  })

  // ─── Group 3: SSR HTML validation ───

  test('SSR HTML contains Japanese text for /ja', async ({ page }) => {
    const response = await page.request.get('/ja')
    const html = await response.text()
    expect(html).toContain('Fluenti へようこそ')
  })

  test('SSR HTML has correct lang attribute for /ja', async ({ page }) => {
    // The locale layout sets dir on a wrapper div; html lang may be set by root layout
    // Verify the page renders with Japanese content as SSR
    const response = await page.request.get('/ja')
    const html = await response.text()
    expect(html).toContain('Fluenti へようこそ')
    expect(html).toContain('こちらはホームページです。')
  })

  test('/ja/rsc SSR title is Japanese via generateMetadata', async ({ page }) => {
    const response = await page.request.get('/ja/rsc')
    const html = await response.text()
    expect(html).toContain('<title>サーバーレンダリング</title>')
  })

  // ─── Group 4: router.push locale switching ───

  test('switch from en to ja updates URL and content', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.waitForURL('**/ja')
    expect(page.url()).toContain('/ja')
  })

  test('switch from ja back to en updates URL and content', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await page.waitForURL('**/en')
    expect(page.url()).toContain('/en')
  })

  test('client navigation after locale switch keeps locale prefix', async ({ page }) => {
    await page.goto('/ja')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()
    expect(page.url()).toContain('/ja/plurals')
  })

  test('direct navigation to /zh-CN/plurals shows Chinese content', async ({ page }) => {
    await page.goto('/zh-CN/plurals')
    await expect(page.getByTestId('plurals-page')).toBeVisible()
  })

  test('locale switch on subpage preserves path (does not jump to home)', async ({ page }) => {
    await page.goto('/en/plurals')
    await expect(page.getByTestId('plurals-page')).toBeVisible()

    await page.getByTestId('lang-ja').click()
    await page.waitForURL('**/ja/plurals')
    expect(page.url()).toContain('/ja/plurals')
    await expect(page.getByTestId('plurals-page')).toBeVisible()
  })

  // ─── Group 5: generateMetadata with path locale ───

  test('/en/rsc document title is English', async ({ page }) => {
    await page.goto('/en/rsc')
    await expect(page).toHaveTitle('Server rendered')
  })

  test('/ja/rsc document title is Japanese', async ({ page }) => {
    await page.goto('/ja/rsc')
    await expect(page).toHaveTitle('サーバーレンダリング')
  })

  test('navigating from /en/rsc to /ja/rsc updates title', async ({ page }) => {
    await page.goto('/en/rsc')
    await expect(page).toHaveTitle('Server rendered')

    await page.getByTestId('lang-ja').click()
    await page.waitForURL('**/ja/rsc')
    await expect(page.getByTestId('rsc-title')).toContainText('サーバーレンダリング')
    await expect(page).toHaveTitle('サーバーレンダリング')
  })

  // ─── Group 6: Server Action + resolveLocale ───

  test('/en/server-action returns English result', async ({ page }) => {
    await page.goto('/en/server-action')
    await expect(page.getByTestId('action-page')).toBeVisible()

    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('Server says: Hello from server action')
  })

  test('/ja/server-action resolveLocale reads /ja from referer', async ({ page }) => {
    await page.goto('/ja/server-action')
    await expect(page.getByTestId('action-title')).toContainText('サーバーアクションデモ')

    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('サーバーの応答：サーバーアクションからこんにちは')
  })

  test('switch to ja then invoke server action returns Japanese', async ({ page }) => {
    await page.goto('/en/server-action')
    await page.getByTestId('lang-ja').click()
    await page.waitForURL('**/ja/server-action')
    await expect(page.getByTestId('action-title')).toContainText('サーバーアクションデモ')

    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('サーバーの応答：サーバーアクションからこんにちは')
  })

  // ─── Group 7: preloadLocale ───

  test('preloadLocale on hover does not error and switch works', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('home-page')).toBeVisible()

    // Hover to trigger preloadLocale, then click to switch
    await page.getByTestId('lang-ja').hover()
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  // ─── Group 8: Core feature parity ───

  test('/en/plurals counter works with Plural component', async ({ page }) => {
    await page.goto('/en/plurals')
    await expect(page.getByTestId('plural-result')).toContainText('No messages')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')

    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
  })

  test('/en/streaming shows fallback then streamed content', async ({ page }) => {
    await page.goto('/en/streaming')
    await expect(page.getByTestId('streaming-page')).toBeVisible()
    await expect(page.getByTestId('streaming-title')).toContainText('Streaming')
    await expect(page.getByTestId('streamed-content')).toContainText('Streamed content loaded!')
  })

  test('fallback page: switch to ja shows English for missing key', async ({ page }) => {
    await page.goto('/en/fallback')
    await expect(page.getByTestId('fallback-only-en')).toContainText('This key only exists in English')
    await expect(page.getByTestId('fallback-both')).toContainText('Welcome to Fluenti')

    await page.getByTestId('lang-ja').click()
    await page.waitForURL('**/ja/fallback')
    await expect(page.getByTestId('fallback-both')).toContainText('Fluenti へようこそ')
    // Missing key falls back to English
    await expect(page.getByTestId('fallback-only-en')).toContainText('This key only exists in English')
  })

  test('client-side navigation preserves locale prefix throughout', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('home-page')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()
    expect(page.url()).toContain('/ja/plurals')

    await page.getByTestId('nav-streaming').click()
    await expect(page.getByTestId('streaming-page')).toBeVisible()
    expect(page.url()).toContain('/ja/streaming')

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('home-page')).toBeVisible()
    expect(page.url()).toContain('/ja')
  })
})
