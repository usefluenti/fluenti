import { test, expect } from '@playwright/test'

/**
 * Next.js 16 + Turbopack E2E tests.
 *
 * Mirror of nextjs.spec.ts — verifies identical behavior when built with
 * Turbopack (Next 16 default) instead of webpack (Next 15).
 */
test.describe('Next.js Turbopack — App Router e2e', () => {
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
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
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

    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
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

  test('server action page reflects locale cookie across both UI and action payload', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])
    await page.goto('/server-action')
    await expect(page.getByTestId('action-title')).toContainText('サーバーアクションデモ')

    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('サーバーの応答：サーバーアクションからこんにちは')
  })

  test('RTL direction is set for Arabic locale', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ar', url: 'http://localhost:5210' },
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
      { name: 'locale', value: 'ar', url: 'http://localhost:5210' },
    ])
    await page.goto('/')
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await page.waitForFunction(() => document.documentElement.getAttribute('dir') === 'ltr')
    expect(await page.locator('html').getAttribute('dir')).toBe('ltr')
  })

  test('cookie persists locale across page reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    const cookies = await page.context().cookies()
    const localeCookie = cookies.find((c) => c.name === 'locale')
    expect(localeCookie?.value).toBe('ja')

    await page.reload()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('query param overrides cookie on RSC page', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])
    await page.goto('/rsc?lang=en')
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
    await expect(page.getByTestId('rsc-locale')).toContainText('Current server locale: en')
  })

  // === Trans component ===

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

  // === fallbackLocale ===

  test('fallback locale shows English text for missing Japanese translation', async ({ page }) => {
    await page.goto('/fallback')
    await expect(page.getByTestId('fallback-page')).toBeVisible()
    await expect(page.getByTestId('fallback-only-en')).toContainText('This text is only translated in English')
    await expect(page.getByTestId('fallback-both')).toContainText('Welcome to Fluenti')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('fallback-both')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('fallback-only-en')).toContainText('This text is only translated in English')
  })

  // === RSC Rich Text ===

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
    const dateText = await page.getByTestId('rsc-date').textContent()
    expect(dateText).toMatch(/\d{1,4}/)
  })

  test('RSC richtext page renders NumberFormat', async ({ page }) => {
    await page.goto('/rsc-richtext')
    const text = await page.getByTestId('rsc-number').textContent()
    expect(text).toMatch(/1[,.]?234/)
  })

  test('RSC richtext page translates Trans when locale is Japanese', async ({ page }) => {
    await page.context().addCookies([{ name: 'locale', value: 'ja', url: 'http://localhost:5210' }])
    await page.goto('/rsc-richtext')
    await expect(page.getByTestId('rsc-richtext-page')).toBeVisible()
    const link = page.getByTestId('rsc-trans-link').locator('a')
    await expect(link).toContainText('ドキュメント')
  })

  // === t`` tagged template ===

  test('t`` with interpolation in client component translates on locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('home-desc')).toContainText('こちらはホームページです。')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')
  })

  test('withFluenti reroutes unified @fluenti/react authoring surface in RSC', async ({ page }) => {
    await page.goto('/rsc')
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
    await expect(page.getByTestId('rsc-desc')).toContainText('This page is a React Server Component.')
  })

  test('t`` in server action returns translated text', async ({ page }) => {
    await page.goto('/server-action')
    await page.getByTestId('action-submit').click()
    await expect(page.getByTestId('action-result')).toContainText('Server says: Hello from server action')
  })

  // === I18nProvider ===

  test('I18nProvider sets up both server and client i18n', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await page.getByTestId('nav-rsc').click()
    await expect(page.getByTestId('rsc-title')).toContainText('Server rendered')
  })

  test('I18nProvider passes locale to client components via cookie', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  // === Hydration ===

  test('no fluenti-related hydration errors in console', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(msg.text()))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const fluentiErrors = consoleLogs.filter(
      (log) => log.includes('[fluenti]') && log.includes('mismatch'),
    )
    expect(fluentiErrors).toHaveLength(0)
  })

  test('locale persists after switch and reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})

test.describe('Next.js Turbopack — Preload locale', () => {
  test('preloadLocale fires on hover and switch works', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').hover()
    await page.waitForTimeout(500)
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})

test.describe('Next.js Turbopack — Select component', () => {
  test('select component renders default (other) form', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.getByTestId('select-result')).toContainText('They liked it')
  })

  test('select component renders correct gender form', async ({ page }) => {
    await page.goto('/plurals')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked it')
  })

  test('select component switches between gender forms', async ({ page }) => {
    await page.goto('/plurals')
    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She liked it')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked it')
  })
})

test.describe('Next.js Turbopack — Concurrent Server Actions', () => {
  test('concurrent server action calls with different locales return correct translations', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const pageEn = await ctxEn.newPage()

    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto('/server-action'),
      pageJa.goto('/server-action'),
    ])

    await Promise.all([
      pageEn.getByTestId('action-submit').click(),
      pageJa.getByTestId('action-submit').click(),
    ])

    await expect(pageEn.getByTestId('action-result')).toContainText('Server says: Hello from server action')
    await expect(pageJa.getByTestId('action-result')).toContainText('サーバーの応答：サーバーアクションからこんにちは')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})

test.describe('Next.js Turbopack — Streaming & Suspense Edge Cases', () => {
  test('streaming page with Japanese locale renders translated content', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])
    await page.goto('/streaming')
    await expect(page.getByTestId('streaming-title')).toContainText('ストリーミング')
    await expect(page.getByTestId('streamed-content')).toContainText('ストリーミングコンテンツが読み込まれました！')
  })

  test('navigating from streaming page preserves locale', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])
    await page.goto('/streaming')
    await expect(page.getByTestId('streamed-content')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('concurrent SSR requests to streaming page with different locales', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto('/streaming'),
      pageJa.goto('/streaming'),
    ])

    await expect(pageEn.getByTestId('streaming-title')).toContainText('Streaming')
    await expect(pageEn.getByTestId('streamed-content')).toContainText('Streamed content loaded!')

    await expect(pageJa.getByTestId('streaming-title')).toContainText('ストリーミング')
    await expect(pageJa.getByTestId('streamed-content')).toContainText('ストリーミングコンテンツが読み込まれました！')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})

test.describe('Next.js Turbopack — Cookie Edge Cases', () => {
  test('switching locale sets cookie and survives page reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === 'locale')?.value).toBe('ja')

    await page.reload()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-rsc').click()
    await expect(page.getByTestId('rsc-locale')).toContainText('現在のサーバーロケール：ja')
  })

  test('invalid cookie locale falls back gracefully', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'xx-INVALID', url: 'http://localhost:5210' },
    ])
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('empty cookie locale falls back to default', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: '', url: 'http://localhost:5210' },
    ])
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })
})

test.describe('Next.js Turbopack — Concurrent SSR Locale Isolation', () => {
  test('concurrent SSR requests with different locales are isolated', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ])

    const locales = ['en', 'ja', 'ar']
    const BASE = 'http://localhost:5210'
    for (let i = 0; i < contexts.length; i++) {
      await contexts[i].addCookies([
        { name: 'locale', value: locales[i], url: BASE },
      ])
    }

    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()))

    await Promise.all(pages.map((p) => p.goto('/')))

    await expect(pages[0].getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(pages[1].getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(pages[2].getByTestId('welcome')).toContainText('مرحباً بكم في Fluenti')
    expect(await pages[2].locator('html').getAttribute('dir')).toBe('rtl')

    await Promise.all(contexts.map((ctx) => ctx.close()))
  })

  test('concurrent SSR to different pages with different locales', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5210' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto('/about'),
      pageJa.goto('/rsc'),
    ])

    await expect(pageEn.getByTestId('about-title')).toContainText('About our project')
    await expect(pageJa.getByTestId('rsc-title')).toContainText('サーバーレンダリング')
    await expect(pageJa.getByTestId('rsc-locale')).toContainText('現在のサーバーロケール：ja')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})

test.describe('Next.js Turbopack — Rapid Locale Switching', () => {
  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('lang-ja').click()
      await page.getByTestId('lang-en').click()
    }
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })
})

test.describe('Next.js Turbopack — XSS Prevention', () => {
  test('no script injection in translated content', async ({ page }) => {
    await page.goto('/')
    const scripts = page.locator('main script')
    await expect(scripts).toHaveCount(0)
  })
})

test.describe('Next.js Turbopack — isLoading indicator', () => {
  test('isLoading indicator is not visible on initial page load', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('loading')).not.toBeVisible()
  })

  test('isLoading indicator disappears after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('loading')).not.toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})

test.describe('Next.js Turbopack — Browser Back/Forward', () => {
  test('browser back preserves locale after navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()
    await page.goBack()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})
