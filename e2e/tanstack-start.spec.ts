import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5178'

test.describe('TanStack Start — Home Page Details', () => {
  test('renders title and tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('title')).toContainText('Fluenti TanStack Start Playground')
    await expect(page.getByTestId('tagline')).toContainText('Write text. Fluenti translates it. Zero config.')
  })

  test('renders welcome, subtitle, greeting, and items', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('subtitle')).toContainText('A modern i18n library for React')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
    await expect(page.getByTestId('items')).toContainText('You have 3 items in your cart.')
  })

  test('renders current locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('Current locale: en')
  })

  test('date formatting: default, long, short', async ({ page }) => {
    await page.goto('/')
    const dateDefault = page.getByTestId('date-default')
    const dateLong = page.getByTestId('date-long')
    const dateShort = page.getByTestId('date-short')
    await expect(dateDefault).toContainText('1/15/2025')
    await expect(dateLong).toContainText('January 15, 2025')
    await expect(dateShort).toContainText('1/15/25')
    // Long format should be longer than short format
    const longText = await dateLong.textContent()
    const shortText = await dateShort.textContent()
    expect(longText!.length).toBeGreaterThan(shortText!.length)
  })

  test('number formatting: default, currency, percent', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('number-default')).toContainText('1,234,567.89')
    await expect(page.getByTestId('number-currency')).toContainText('$')
    await expect(page.getByTestId('number-percent')).toContainText('86%')
  })

  test('msg() roles: admin and user', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('msg-admin')).toContainText('Administrator')
    await expect(page.getByTestId('msg-user')).toContainText('Regular User')
  })

  test('features title and list are rendered', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('features-title')).toContainText('Features')
    const list = page.getByTestId('features-list')
    await expect(list.locator('li')).toHaveCount(4)
    await expect(list).toContainText('Reactive locale switching')
    await expect(list).toContainText('Rich text with React components')
    await expect(list).toContainText('Built-in plural support')
    await expect(list).toContainText('Type-safe message catalogs')
  })

  test('footer renders attribution', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('footer')).toContainText('Built with Fluenti and TanStack Start')
  })
})

test.describe('TanStack Start — Locale Switching', () => {
  test('switch to Japanese and verify translations', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('msg-admin')).toContainText('管理者')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('switch to Chinese and verify translations', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('title')).toContainText('Fluenti TanStack Start 练习场')
    await expect(page.getByTestId('current-locale')).toContainText('zh-CN')
  })

  test('switch to Japanese then back to English restores content', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('current-locale')).toContainText('Current locale: en')
    await expect(page.getByTestId('msg-admin')).toContainText('Administrator')
  })

  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('lang-ja').click()
      await page.getByTestId('lang-en').click()
    }
    // After 5 round-trips, should settle on English (last click was lang-en)
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('current-locale')).toContainText('Current locale: en')
  })
})

test.describe('TanStack Start — Plurals Page', () => {
  test('plural counter: add increments, reset resets, remove decrements', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.getByTestId('plural-result')).toContainText('No messages')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')

    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')

    await page.getByTestId('btn-add').click()
    await page.getByTestId('btn-add').click()
    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('3 messages')

    await page.getByTestId('btn-remove').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')
  })

  test('select component: male, female, other', async ({ page }) => {
    await page.goto('/plurals')
    // Default is "other"
    await expect(page.getByTestId('select-result')).toContainText('They liked your post')

    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked your post')

    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She liked your post')

    await page.getByTestId('gender-other').click()
    await expect(page.getByTestId('select-result')).toContainText('They liked your post')
  })

  test('plurals translate on locale switch to Japanese', async ({ page }) => {
    await page.goto('/plurals')
    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('title')).toContainText('Fluenti TanStack Start プレイグラウンド')
    // Plural has no Japanese translation, falls back to English
    await expect(page.getByTestId('plural-result')).toContainText('1 message')
  })
})

test.describe('TanStack Start — Rich Text', () => {
  test('trans-basic has <a> link', async ({ page }) => {
    await page.goto('/richtext')
    const link = page.getByTestId('trans-basic').locator('a[href="/docs"]')
    await expect(link).toContainText('documentation')
  })

  test('trans-bold has <strong> tag', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')
  })

  test('trans-multi has both <a> and <strong>', async ({ page }) => {
    await page.goto('/richtext')
    const multi = page.getByTestId('trans-multi')
    await expect(multi.locator('a[href="/login"]')).toContainText('sign in')
    await expect(multi.locator('strong')).toContainText('register')
  })

  test('richtext-title and richtext-subtitle from msg()', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('richtext-title')).toContainText('Rich Text Demos')
    await expect(page.getByTestId('richtext-subtitle')).toContainText('Components for complex translations')
  })

  test('rich text translates on locale switch', async ({ page }) => {
    await page.goto('/richtext')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('richtext-title')).toContainText('リッチテキストデモ')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('ドキュメント')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('重要')
  })
})

test.describe('TanStack Start — Fallback Locale', () => {
  test('fallback-only shows English text in default locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
  })

  test('fallback-only still shows English text when switched to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    // Key only exists in English fallback, should still display English text
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
  })
})

test.describe('TanStack Start — XSS Prevention', () => {
  test('no script tags injected in main content', async ({ page }) => {
    await page.goto('/')
    const scripts = await page.locator('main script').count()
    expect(scripts).toBe(0)
  })
})

test.describe('TanStack Start — Navigation', () => {
  test('navigate between all pages via nav links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-section')).toBeVisible()

    await page.getByTestId('nav-richtext').click()
    await expect(page.getByTestId('richtext-section')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('home-section')).toBeVisible()
  })

  test('locale persists across client-side navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('title')).toContainText('Fluenti TanStack Start プレイグラウンド')

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('browser back/forward preserves locale', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-section')).toBeVisible()

    await page.goBack()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })
})

test.describe('TanStack Start — Cookie Persistence', () => {
  test('locale switch sets cookie', async ({ page, context }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    const cookies = await context.cookies()
    const localeCookie = cookies.find(c => c.name === 'locale')
    expect(localeCookie).toBeDefined()
    expect(localeCookie!.value).toBe('ja')
  })

  test('page refresh preserves locale from cookie', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    await page.reload()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})

test.describe('TanStack Start — Hydration Integrity', () => {
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
})

test.describe('TanStack Start — Concurrent SSR Isolation', () => {
  test('concurrent requests with different locale cookies are isolated', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto(BASE_URL + '/'),
      pageJa.goto(BASE_URL + '/'),
    ])

    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')

    // English context should show English
    await expect(pageEn.getByTestId('welcome')).toContainText('Welcome to Fluenti')

    // Japanese context should show Japanese
    await expect(pageJa.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})

test.describe('TanStack Start — RTL Support', () => {
  test('Arabic locale sets dir=rtl', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')
  })

  test('switching back to English sets dir=ltr', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await page.getByTestId('lang-en').click()
    expect(await page.locator('html').getAttribute('dir')).toBe('ltr')
  })

  test('Arabic locale renders Arabic translations', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.getByTestId('welcome')).toContainText('مرحبًا بك في Fluenti')
    await expect(page.getByTestId('title')).toContainText('ساحة تجارب Fluenti TanStack Start')
  })
})

test.describe('TanStack Start — SSR Rendering', () => {
  test('server-rendered HTML contains translated content before hydration', async ({ page }) => {
    // Intercept the initial HTML response
    const response = await page.goto('/')
    const html = await response!.text()
    // The server should render "Welcome to Fluenti" in the HTML
    expect(html).toContain('Welcome to Fluenti')
  })

  test('SSR with Arabic cookie renders RTL dir attribute', async ({ page, context }) => {
    await context.addCookies([
      { name: 'locale', value: 'ar', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')
    await context.clearCookies()
  })
})

test.describe('TanStack Start — isLoading Indicator', () => {
  test('loading indicator element exists in DOM', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // isLoading should be false after initial load
    const loading = page.getByTestId('loading')
    await expect(loading).toBeHidden()
  })
})

test.describe('TanStack Start — Preload on Hover', () => {
  test('hovering locale buttons preloads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').hover()
    await page.waitForTimeout(500)
    await page.getByTestId('lang-ar').hover()
    await page.waitForTimeout(500)

    expect(errors).toHaveLength(0)
  })
})
