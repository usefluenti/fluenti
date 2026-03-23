import { test, expect } from '@playwright/test'

test.describe('Nuxt Playground (SSR)', () => {
  test('renders server-side translated content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
    await expect(page.locator('header p')).toContainText('Server-rendered i18n with Nuxt 3 and Fluenti')
  })

  test('renders homepage with v-t directive and $t() interpolation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()
    await expect(page.locator('text=Hello, World!')).toBeVisible()
    await expect(page.locator('text=Current locale: en')).toBeVisible()
    await expect(page.locator('text=You have 5 items in your cart.')).toBeVisible()
  })

  test('<DateTime> date formatting renders output', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=<DateTime> — Date Formatting')).toBeVisible()
    const dateSection = page.locator('.demo-label:has-text("DateTime :value") + div').first()
    const dateText = await dateSection.textContent()
    expect(dateText).toMatch(/\d{1,4}/)
  })

  test('<NumberFormat> number formatting renders locale-aware numbers', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=1,234,567.89').first()).toBeVisible()
  })

  test('locale switching updates all translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const jaButton = page.locator('header button:has-text("日本語")')
    await expect(jaButton).toBeVisible()
    await jaButton.click()
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await expect(page.locator('h2:has-text("Fluenti へようこそ")')).toBeVisible()
  })

  test('SSR hydration preserves locale from cookie', async ({ page, context }) => {
    await context.addCookies([
      { name: 'fluenti_locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.clearCookies()
  })

  test('rich text page renders correctly with SSR', async ({ page }) => {
    await page.goto('/rich-text')
    await page.waitForLoadState('networkidle')
    const docLink = page.locator('a[href="https://github.com"][target="_blank"]')
    await expect(docLink).toBeVisible()
    await expect(docLink).toContainText('documentation')
    await expect(page.locator('strong:has-text("important")').first()).toBeVisible()
  })

  test('plurals page works with SSR', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=No apples').first()).toBeVisible()

    const addButtons = page.locator('button:has-text("Add")')
    await addButtons.first().click()
    await expect(page.locator('text=1 apple').first()).toBeVisible()

    await addButtons.first().click()
    await expect(page.locator('text=2 apples')).toBeVisible()
  })

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()

    await page.locator('nav a[href="/rich-text"]').click()
    await expect(page.locator('h2:has-text("Rich Text Demos")')).toBeVisible()

    await page.locator('nav a[href="/plurals"]').click()
    await expect(page.locator('h2:has-text("Plural Demos")')).toBeVisible()

    await page.locator('nav a[href="/"]').click()
    await expect(page.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()
  })

  test('footer renders attribution text', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('footer')).toContainText('Built with Fluenti and Nuxt 3')
  })

  test('features list is rendered on homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Server-side rendering')).toBeVisible()
    await expect(page.locator('text=Locale detection from cookies')).toBeVisible()
    await expect(page.locator('text=Hydration without flash')).toBeVisible()
    await expect(page.locator('text=Reactive locale switching')).toBeVisible()
  })
})

test.describe('Nuxt SSR — Accept-Language Header Detection', () => {
  test('detects Japanese from Accept-Language header', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'ja',
      extraHTTPHeaders: { 'Accept-Language': 'ja,en;q=0.5' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.close()
  })

  test('falls back to English when Accept-Language is unsupported', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'fr,de;q=0.5' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
    await context.close()
  })

  test('cookie takes priority over Accept-Language header', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'ja,en;q=0.5' },
    })
    await context.addCookies([
      { name: 'fluenti_locale', value: 'en', domain: 'localhost', path: '/' },
    ])
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Cookie (en) should take priority over header (ja)
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
    await context.close()
  })
})

test.describe('Nuxt SSR — Accept-Language Complex q-value Negotiation', () => {
  test('selects highest q-value supported locale from complex header', async ({ browser }) => {
    // Browser sends: fr (unsupported) > ja (q=0.8) > en (q=0.5)
    // Should pick ja since fr is not available.
    // Set locale to 'ja' so Playwright's browser-level Accept-Language aligns
    // with the expected outcome (ja), preventing header conflicts.
    const context = await browser.newContext({
      locale: 'ja',
      extraHTTPHeaders: { 'Accept-Language': 'fr;q=1.0, ja;q=0.8, en;q=0.5' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.close()
  })

  test('handles whitespace variations in Accept-Language header', async ({ browser }) => {
    // Real browsers sometimes send different spacing
    const context = await browser.newContext({
      locale: 'ja',
      extraHTTPHeaders: { 'Accept-Language': 'ja;q=0.9,  en;q=0.8 , fr;q=0.7' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.close()
  })

  test('defaults to en when all Accept-Language locales are unsupported', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'ko;q=0.9, th;q=0.8, vi;q=0.7' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
    await context.close()
  })

  test('implicit q=1 locale wins over explicit lower q-values', async ({ browser }) => {
    // ja has no q-value → implicit q=1.0, en has q=0.9
    const context = await browser.newContext({
      locale: 'ja',
      extraHTTPHeaders: { 'Accept-Language': 'ja, en;q=0.9' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.close()
  })

  test('equal q-value picks first listed locale', async ({ browser }) => {
    // Both ja and en have q=0.8 — first match in supported locales wins
    const context = await browser.newContext({
      locale: 'ja',
      extraHTTPHeaders: { 'Accept-Language': 'ja;q=0.8, en;q=0.8' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // ja is listed first, so it should win
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.close()
  })

  test('region subtag prefix matching (en-US matches en)', async ({ browser }) => {
    // en-US is not in the locales list, but en is — prefix matching should work
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'en-US;q=0.9, ja;q=0.5' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
    await context.close()
  })
})

test.describe('Nuxt SSR — Concurrent Locale Isolation', () => {
  test('concurrent SSR requests with different locales are isolated', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'fluenti_locale', value: 'ja', domain: 'localhost', path: '/' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    // Navigate both concurrently
    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/'),
    ])

    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')

    // English user sees English
    await expect(pageEn.locator('header h1')).toContainText('Fluenti Nuxt Playground')
    await expect(pageEn.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()

    // Japanese user sees Japanese
    await expect(pageJa.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await expect(pageJa.locator('h2:has-text("Fluenti へようこそ")')).toBeVisible()

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })

  test('concurrent SSR requests to different pages with different locales', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'fluenti_locale', value: 'ja', domain: 'localhost', path: '/' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    // Hit different pages concurrently
    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/rich-text'),
    ])

    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')

    await expect(pageEn.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()
    await expect(pageJa.locator('h2').first()).toContainText('リッチテキストデモ')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})

test.describe('Nuxt SSR — Hydration Integrity', () => {
  // Note: Nuxt/Vue may emit generic "Hydration completed but contains mismatches"
  // for time-sensitive content (dates, timestamps). We only fail on Fluenti-specific
  // hydration errors (e.g., locale mismatch between SSR and client).

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
      { name: 'fluenti_locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.clearCookies()
  })

  test('locale persists after page reload', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Switch to Japanese
    const jaButton = page.locator('header button:has-text("日本語")')
    await jaButton.click()
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')

    // Reload — SSR should match client state
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
  })
})

test.describe('Nuxt — Rapid Locale Switching', () => {
  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const enBtn = page.locator('header button:has-text("English")')
    const jaBtn = page.locator('header button:has-text("日本語")')
    for (let i = 0; i < 5; i++) {
      await jaBtn.click()
      await enBtn.click()
    }
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
  })
})

test.describe('Nuxt — XSS Prevention', () => {
  test('no script injection in translated content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const scripts = page.locator('main script')
    await expect(scripts).toHaveCount(0)
  })
})

test.describe('Nuxt — Browser Back/Forward', () => {
  test('browser back preserves locale after navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const jaBtn = page.locator('header button:has-text("日本語")')
    await jaBtn.click()
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await page.locator('nav a[href="/plurals"]').click()
    await expect(page.locator('h2').first()).toContainText('複数形デモ')
    await page.goBack()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
  })
})

test.describe('Nuxt — RTL support', () => {
  test('Arabic locale sets dir=rtl', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('header button:has-text("العربية")').click()
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')
  })

  test('switching back to English sets dir=ltr', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('header button:has-text("العربية")').click()
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl')
    await page.locator('header button:has-text("English")').click()
    expect(await page.locator('html').getAttribute('dir')).toBe('ltr')
  })

  test('Arabic locale shows Arabic translations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('header button:has-text("العربية")').click()
    await expect(page.locator('header h1')).toContainText('ملعب Fluenti Nuxt')
    await expect(page.locator('h2:has-text("مرحباً بكم في Fluenti")')).toBeVisible()
  })

  test('SSR hydration preserves Arabic locale from cookie', async ({ page, context }) => {
    await context.addCookies([
      { name: 'fluenti_locale', value: 'ar', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('ملعب Fluenti Nuxt')
    await context.clearCookies()
  })
})

test.describe('Nuxt — msg`` lazy descriptors', () => {
  test('msg tagged template renders subtitle', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('msg-subtitle')).toContainText('A modern i18n framework')
  })

  test('msg tagged template translates when locale switches to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('header button:has-text("日本語")').click()
    await expect(page.getByTestId('msg-subtitle')).toContainText('モダンな i18n フレームワーク')
  })

  test('msg tagged template translates when locale switches to Arabic', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('header button:has-text("العربية")').click()
    await expect(page.getByTestId('msg-subtitle')).toContainText('إطار عمل i18n حديث')
  })
})

test.describe('Nuxt — Preload on hover', () => {
  test('preloading a locale on mouseenter does not change current locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Hover over Japanese button to trigger preload
    await page.locator('header button:has-text("日本語")').hover()
    // Current locale should still be English
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
  })
})

test.describe('Nuxt — Select component', () => {
  test('select renders correct gender form', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He')
    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She')
  })
})

test.describe('Nuxt — Fallback & Loading', () => {
  test('missing translation falls back gracefully', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
    await page.locator('header button:has-text("日本語")').click()
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
  })

  test('loading indicator disappears after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Switch locale
    await page.locator('header button:has-text("日本語")').click()
    // After settling, loading indicator should be gone
    await expect(page.locator('.loading-indicator')).not.toBeVisible()
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
  })
})
