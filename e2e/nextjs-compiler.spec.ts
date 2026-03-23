import { test, expect } from '@playwright/test'

/**
 * Next.js + React Compiler E2E tests.
 *
 * These tests mirror the core nextjs.spec.ts scenarios to verify that
 * React Compiler's auto-memoization does not break Fluenti's i18n features
 * in a Next.js App Router environment (RSC, client components, streaming,
 * server actions, locale switching).
 */

test.describe('Next.js + React Compiler — Client Components', () => {
  test('home page renders with t`` tagged template', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
  })

  test('locale switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')
  })

  test('switching back to English restores text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('locale persists across client-side navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-title')).toContainText('私たちのプロジェクトについて')
    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('lang-ja').click()
      await page.getByTestId('lang-en').click()
    }
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })
})

test.describe('Next.js + React Compiler — Stateful Components', () => {
  test('Plural component with counter increments', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')
    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')
    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
  })

  test('Select component switches between gender forms', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.getByTestId('select-result')).toContainText('They liked it')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked it')
    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She liked it')
  })
})

test.describe('Next.js + React Compiler — Server Components', () => {
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
    await expect(page.getByTestId('rsc-locale')).toContainText('現在のサーバーロケール：ja')
  })

  test('cookie-based locale on RSC page', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5207' },
    ])
    await page.goto('/rsc')
    await expect(page.getByTestId('rsc-title')).toContainText('サーバーレンダリング')
  })
})

test.describe('Next.js + React Compiler — Streaming & Suspense', () => {
  test('streaming page shows fallback then content', async ({ page }) => {
    await page.goto('/streaming')
    await expect(page.getByTestId('streaming-page')).toBeVisible()
    await expect(page.getByTestId('streaming-title')).toContainText('Streaming')
    await expect(page.getByTestId('streamed-content')).toContainText('Streamed content loaded!')
  })

  test('streaming page with Japanese locale', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5207' },
    ])
    await page.goto('/streaming')
    await expect(page.getByTestId('streaming-title')).toContainText('ストリーミング')
    await expect(page.getByTestId('streamed-content')).toContainText('ストリーミングコンテンツが読み込まれました！')
  })
})

test.describe('Next.js + React Compiler — Server Actions', () => {
  test('server action returns translated result', async ({ page }) => {
    await page.goto('/server-action')
    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('Server says: Hello from server action')
  })

  test('server action reflects Japanese locale', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5207' },
    ])
    await page.goto('/server-action')
    await expect(page.getByTestId('action-title')).toContainText('サーバーアクションデモ')
    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('サーバーの応答：サーバーアクションからこんにちは')
  })
})

test.describe('Next.js + React Compiler — Rich Text Components', () => {
  test('Trans with link renders correctly', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('richtext-page')).toBeVisible()
    await expect(page.getByTestId('trans-link').locator('a[href="/docs"]')).toContainText('documentation')
  })

  test('Trans with bold renders correctly', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')
  })

  test('Trans components translate on locale switch', async ({ page }) => {
    await page.goto('/richtext')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('trans-link').locator('a[href="/docs"]')).toContainText('ドキュメント')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('重要な')
  })

  test('RSC richtext renders Trans and Plural', async ({ page }) => {
    await page.goto('/rsc-richtext')
    await expect(page.getByTestId('rsc-richtext-page')).toBeVisible()
    await expect(page.getByTestId('rsc-trans-link').locator('a')).toContainText('documentation')
    await expect(page.getByTestId('rsc-plural')).toContainText('5 items')
  })
})

test.describe('Next.js + React Compiler — RTL & Fallback', () => {
  test('Arabic locale sets dir=rtl', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ar', url: 'http://localhost:5207' },
    ])
    await page.goto('/')
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')
    await expect(page.getByTestId('welcome')).toContainText('مرحباً بكم في Fluenti')
  })

  test('fallback locale for missing Japanese translation', async ({ page }) => {
    await page.goto('/fallback')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('fallback-only-en')).toContainText('This text is only translated in English')
    await expect(page.getByTestId('fallback-both')).toContainText('Fluenti へようこそ')
  })
})

test.describe('Next.js + React Compiler — Hydration', () => {
  test('no hydration errors in console', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(msg.text()))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hydrationErrors = consoleLogs.filter(
      (log) => log.includes('mismatch') || log.includes('Hydration'),
    )
    expect(hydrationErrors).toHaveLength(0)
  })

  test('cookie persists locale across reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.reload()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})

test.describe('Next.js + React Compiler — Concurrent Locale Isolation', () => {
  test('concurrent SSR requests with different locales are isolated', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5207' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/'),
    ])

    await expect(pageEn.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(pageJa.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})
