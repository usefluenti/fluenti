import { test, expect } from '@playwright/test'

test.describe('React Router e2e', () => {
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
    await expect(page.getByTestId('about-desc')).toContainText('Learn more about Fluenti.')
    await expect(page.getByTestId('contact')).toContainText('Contact us at hello@fluenti.dev')
  })

  test('plurals page with counter', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')

    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
  })

  test('navigation between routes works', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-page')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('home-page')).toBeVisible()
  })

  test('locale switching to Japanese persists across routes', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('home-desc')).toContainText('こちらはホームページです。')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')

    // Verify locale persists when navigating to another page
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-title')).toContainText('私たちのプロジェクトについて')

    // And back to home
    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('switching back to English restores original text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('query-based locale sets Japanese via ?lang=ja', async ({ page }) => {
    await page.goto('/?lang=ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('cookie persists locale across reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.reload()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('cookie persists locale across routes after reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-page')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('about-title')).toContainText('私たちのプロジェクトについて')
  })

  test('RTL Arabic locale sets dir=rtl and shows Arabic text', async ({ page }) => {
    await page.goto('/?lang=ar')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByTestId('welcome')).toContainText('مرحباً بكم في Fluenti')
  })

  test('RTL switches back to LTR when changing to English', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    const rtlDir = await page.locator('html').getAttribute('dir')
    expect(rtlDir).toBe('rtl')

    await page.getByTestId('lang-en').click()
    const ltrDir = await page.locator('html').getAttribute('dir')
    expect(ltrDir).toBe('ltr')
  })

  test('query param overrides cookie locale', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.goto('/?lang=en')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })
})

test.describe('React Router — Select component', () => {
  test('select component renders default (other) form', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('select-result')).toContainText('They liked it')
  })

  test('select component renders correct gender form', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked it')
  })

  test('select component switches between gender forms', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She liked it')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked it')
  })
})

test.describe('React Router — Trans/richtext', () => {
  test('Trans renders link in rich text', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('richtext-page')).toBeVisible()
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('documentation')
  })

  test('Trans renders bold in rich text', async ({ page }) => {
    await page.goto('/richtext')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')
  })
})

test.describe('React Router — DateTime/NumberFormat', () => {
  test('DateTime renders a formatted date', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('date-display')).not.toBeEmpty()
  })

  test('NumberFormat renders a formatted number', async ({ page }) => {
    await page.goto('/')
    const text = await page.getByTestId('number-display').textContent()
    expect(text).toContain('1')
    expect(text).toContain('234')
  })
})

test.describe('React Router — msg`` lazy descriptors', () => {
  test('msg tagged template renders role text', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('msg-role')).toContainText('Developer')
  })

  test('msg tagged template translates to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('msg-role')).toContainText('開発者')
  })
})

test.describe('React Router — Fallback', () => {
  test('missing translation falls back to English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
  })
})

test.describe('React Router — isLoading indicator', () => {
  test('isLoading indicator disappears after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('loading')).not.toBeVisible()
  })
})

test.describe('React Router — Preload locale', () => {
  test('preloadLocale fires on hover', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').hover()
    await page.waitForTimeout(500)
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).not.toContainText('Welcome')
  })
})

test.describe('React Router — Rapid Locale Switching', () => {
  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('lang-ja').click()
      await page.getByTestId('lang-en').click()
    }
    await expect(page.getByTestId('welcome')).toContainText('Welcome')
  })
})

test.describe('React Router — XSS Prevention', () => {
  test('no script injection in translated content', async ({ page }) => {
    await page.goto('/')
    const scripts = page.locator('main script')
    await expect(scripts).toHaveCount(0)
  })
})

test.describe('React Router — Browser Back/Forward', () => {
  test('browser back preserves locale after navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-page')).toBeVisible()
    await page.goBack()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})

test.describe('React Router — SSR', () => {
  test('server renders content before hydration', async ({ page }) => {
    await page.goto('/')
    // Content should be visible immediately (SSR)
    await expect(page.getByTestId('welcome')).toBeVisible()
  })

  test('no hydration mismatch errors', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => logs.push(msg.text()))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const errors = logs.filter(l => l.includes('hydration') || l.includes('mismatch'))
    expect(errors).toHaveLength(0)
  })

  test('cookie-based locale renders correct SSR content', async ({ page, context }) => {
    await context.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).not.toContainText('Welcome')
  })
})

test.describe('React Router — Concurrent SSR', () => {
  test('concurrent requests with different locales are isolated', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()
    await Promise.all([
      pageEn.goto('http://localhost:5188/'),
      pageJa.goto('http://localhost:5188/'),
    ])
    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')
    await expect(pageEn.getByTestId('welcome')).toContainText('Welcome')
    await expect(pageJa.getByTestId('welcome')).not.toContainText('Welcome')
    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})
