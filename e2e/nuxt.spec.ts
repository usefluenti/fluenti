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

  test('$d() date formatting renders output', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=$d() — Date Formatting')).toBeVisible()
    const dateSection = page.locator('.demo-label:has-text("$d(Date.now())") + div')
    await expect(dateSection).not.toBeEmpty()
  })

  test('$n() number formatting renders locale-aware numbers', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=1,234,567.89').first()).toBeVisible()
  })

  // FIXME: v-t directive needs compile-time SFC transform (register @fluenti/vue/vite-plugin in nuxt module)
  test.fixme('locale switching updates all translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const jaButton = page.locator('header button:has-text("日本語")')
    await expect(jaButton).toBeVisible()
    await jaButton.click()
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await expect(page.locator('h2:has-text("Fluenti へようこそ")')).toBeVisible()
  })

  // FIXME: v-t directive needs compile-time SFC transform
  test.fixme('SSR hydration preserves locale from cookie', async ({ page, context }) => {
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
  // FIXME: v-t not transformed in SSR — detected locale is correct but template renders English fallback
  test.fixme('detects Japanese from Accept-Language header', async ({ browser }) => {
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
  test.fixme('selects highest q-value supported locale from complex header', async ({ browser }) => {
    // Browser sends: fr (unsupported) > ja (q=0.8) > en (q=0.5)
    // Should pick ja since fr is not available
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'fr;q=1.0, ja;q=0.8, en;q=0.5' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.close()
  })

  test.fixme('handles whitespace variations in Accept-Language header', async ({ browser }) => {
    // Real browsers sometimes send different spacing
    const context = await browser.newContext({
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

  test.fixme('implicit q=1 locale wins over explicit lower q-values', async ({ browser }) => {
    // ja has no q-value → implicit q=1.0, en has q=0.9
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'ja, en;q=0.9' },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.close()
  })

  test.fixme('equal q-value picks first listed locale', async ({ browser }) => {
    // Both ja and en have q=0.8 — first match in supported locales wins
    const context = await browser.newContext({
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
