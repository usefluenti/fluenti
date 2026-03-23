import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5176'

test.describe('SolidStart — Home Page', () => {
  test('renders welcome, description, and greeting in English', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('description')).toContainText('compile-time i18n library with SSR support')
    await expect(page.getByTestId('greeting')).toContainText('Hello, Developer!')
  })

  test('shows current locale as en', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('current-locale')).toContainText('Current locale: en')
  })

  test('date formatting renders non-empty output', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('date')).not.toBeEmpty()
  })

  test('number formatting renders locale-aware number', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('number')).not.toBeEmpty()
    // English locale uses comma grouping
    await expect(page.getByTestId('number')).toContainText('1,234,567.89')
  })

  test('language switcher shows both locales', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('lang-en')).toBeVisible()
    await expect(page.getByTestId('lang-ja')).toBeVisible()
  })
})

test.describe('SolidStart — Locale Switching', () => {
  test('switches to Japanese and updates welcome/description', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('description')).toContainText('SSR対応のコンパイル時i18nライブラリ')
  })

  test('switches back to English and restores content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('description')).toContainText('compile-time i18n library with SSR support')
  })

  test('current locale updates reactively on switch', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('rapid locale switching (5x) settles correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('lang-ja').click()
      await page.getByTestId('lang-en').click()
    }
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })
})

test.describe('SolidStart — Plurals Page', () => {
  test('counter starts at 0 with empty cart message', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('plural-count')).toContainText('0')
    await expect(page.getByTestId('plural-result')).toContainText('Your cart is empty.')
  })

  test('increment shows correct singular and plural forms', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('btn-inc').click()
    await expect(page.getByTestId('plural-count')).toContainText('1')
    await expect(page.getByTestId('plural-result')).toContainText('You have 1 item in your cart.')

    await page.getByTestId('btn-inc').click()
    await expect(page.getByTestId('plural-count')).toContainText('2')
    await expect(page.getByTestId('plural-result')).toContainText('You have 2 items in your cart.')
  })

  test('reset button returns to zero state', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('btn-inc').click()
    await page.getByTestId('btn-inc').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 items')

    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-count')).toContainText('0')
    await expect(page.getByTestId('plural-result')).toContainText('Your cart is empty.')
  })

  test('decrement from 0 stays at 0', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('btn-dec').click()
    await expect(page.getByTestId('plural-count')).toContainText('0')
    await expect(page.getByTestId('plural-result')).toContainText('Your cart is empty.')
  })
})

test.describe('SolidStart — Select Component', () => {
  test('gender-male shows "He liked your post"', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked your post')
  })

  test('gender-female shows "She", gender-other shows "They"', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She liked your post')

    await page.getByTestId('gender-other').click()
    await expect(page.getByTestId('select-result')).toContainText('They liked your post')
  })
})

test.describe('SolidStart — Rich Text', () => {
  test('rich text title is visible', async ({ page }) => {
    await page.goto('/rich-text')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('richtext-title')).toBeVisible()
    await expect(page.getByTestId('richtext-title')).toContainText('Rich Text')
  })

  test('Trans component renders HTML elements (strong, em)', async ({ page }) => {
    await page.goto('/rich-text')
    await page.waitForLoadState('networkidle')
    const welcome = page.getByTestId('trans-welcome')
    await expect(welcome).toBeVisible()
    await expect(welcome.locator('strong')).toContainText('Fluenti')
    await expect(welcome.locator('em')).toContainText('SolidStart')
  })

  test('rich text translates on locale switch', async ({ page }) => {
    await page.goto('/rich-text')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('richtext-title')).toContainText('Rich Text')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('richtext-title')).toContainText('リッチテキスト')
    // Trans content should be in Japanese
    await expect(page.getByTestId('trans-welcome')).toContainText('ようこそ')
  })
})

test.describe('SolidStart — Formatting Page', () => {
  test('DateTime components render non-empty output', async ({ page }) => {
    await page.goto('/formatting')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('date-default')).not.toBeEmpty()
    await expect(page.getByTestId('date-short')).not.toBeEmpty()
    await expect(page.getByTestId('date-long')).not.toBeEmpty()
  })

  test('NumberFormat components render non-empty output', async ({ page }) => {
    await page.goto('/formatting')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('number-default')).not.toBeEmpty()
    await expect(page.getByTestId('number-percent')).not.toBeEmpty()
    await expect(page.getByTestId('number-currency')).not.toBeEmpty()
  })

  test('formatting page translates on locale switch', async ({ page }) => {
    await page.goto('/formatting')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('formatting-title')).toContainText('Date & Number Formatting')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('formatting-title')).toContainText('日付と数値のフォーマット')
  })
})

test.describe('SolidStart — Navigation', () => {
  test('navigates through all pages and back home', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('plural-count')).toBeVisible()

    await page.getByTestId('nav-richtext').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('richtext-title')).toBeVisible()

    await page.getByTestId('nav-formatting').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('formatting-title')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toBeVisible()
  })

  test('locale persists across page navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-plurals').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('plural-result')).toContainText('カートは空です。')

    await page.getByTestId('nav-richtext').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('richtext-title')).toContainText('リッチテキスト')
  })
})

test.describe('SolidStart — Cookie Persistence', () => {
  test('switching to ja sets locale cookie', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    const cookies = await context.cookies()
    const localeCookie = cookies.find((c) => c.name === 'locale')
    expect(localeCookie).toBeDefined()
    expect(localeCookie!.value).toBe('ja')
  })

  test('reload preserves Japanese content from cookie', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})

test.describe('SolidStart — msg`` Lazy Messages', () => {
  test('formatting page title from msg`` translates on locale switch', async ({ page }) => {
    await page.goto('/formatting')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('formatting-title')).toContainText('Date & Number Formatting')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('formatting-title')).toContainText('日付と数値のフォーマット')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('formatting-title')).toContainText('Date & Number Formatting')
  })
})

test.describe('SolidStart — XSS Prevention', () => {
  test('no script injection in translated content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const scripts = page.locator('main script')
    await expect(scripts).toHaveCount(0)
  })
})

test.describe('SolidStart — Hydration Integrity', () => {
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

  test('Japanese locale from cookie renders correct SSR content', async ({ page, context }) => {
    await context.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await context.clearCookies()
  })
})

test.describe('SolidStart — Concurrent SSR Isolation', () => {
  test('concurrent requests with different cookies get correct locale', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto(`${BASE_URL}/`),
      pageJa.goto(`${BASE_URL}/`),
    ])

    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')

    await expect(pageEn.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(pageJa.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })

  test('concurrent requests to different pages with different locales', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto(`${BASE_URL}/`),
      pageJa.goto(`${BASE_URL}/rich-text`),
    ])

    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')

    await expect(pageEn.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(pageJa.getByTestId('richtext-title')).toContainText('リッチテキスト')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})

test.describe('SolidStart — Browser Back/Forward', () => {
  test('browser back preserves locale after navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-plurals').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('plural-result')).toContainText('カートは空です。')

    await page.goBack()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})
