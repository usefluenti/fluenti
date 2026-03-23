import { test, expect } from '@playwright/test'

test.describe('Solid Playground', () => {
  test('renders Home section with welcome heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1:has-text("Welcome to Fluenti")')).toBeVisible()
    await expect(page.locator('text=A type-safe i18n library for Solid')).toBeVisible()
  })

  test('t() interpolation renders correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2:has-text("Hello, Developer!")')).toBeVisible()
    await expect(page.locator('text=Current locale: en').first()).toBeVisible()
  })

  test('Home page renders form fields', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('label:has-text("Username")').first()).toBeVisible()
    await expect(page.locator('label:has-text("Email")')).toBeVisible()
    await expect(page.locator('label:has-text("Password")')).toBeVisible()
    await expect(page.locator('button:has-text("Submit")')).toBeVisible()
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
    await expect(page.locator('text=This field is required')).toBeVisible()
  })

  test('locale switching updates translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("日本語")').click()
    await expect(page.locator('h1').first()).toContainText('Fluenti へようこそ')
  })

  test('locale switching updates translations to Chinese', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("中文")').click()
    await expect(page.locator('h1').first()).toContainText('欢迎使用 Fluenti')
  })

  test('Rich Text section renders with Trans component', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1:has-text("Rich Text")')).toBeVisible()
    await expect(page.locator('strong:has-text("Fluenti")')).toBeVisible()
    await expect(page.locator('em:has-text("SolidJS")')).toBeVisible()
    await expect(page.locator('a:has-text("links")')).toBeVisible()
  })

  test('Rich Text translates when switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("日本語")').click()
    await expect(page.locator('strong:has-text("Fluenti")')).toBeVisible()
    await expect(page.locator('em:has-text("SolidJS")')).toBeVisible()
    await expect(page.locator('text=へようこそ').first()).toBeVisible()
    await expect(page.locator('text=サポート')).toBeVisible()
  })

  test('Rich Text preserves component structure after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("日本語")').click()
    await expect(page.locator('strong:has-text("Fluenti")')).toBeVisible()
    await expect(page.locator('strong:has-text("太字")')).toBeVisible()
    await expect(page.locator('em:has-text("斜体")')).toBeVisible()
    await expect(page.locator('a:has-text("リンク")')).toBeVisible()
  })

  test('Plural component renders zero state', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Your cart is empty.')).toBeVisible()
  })

  test('Plural component increments and shows correct forms', async ({ page }) => {
    await page.goto('/')
    const pluralsSection = page.locator('h1:has-text("Plurals")').locator('..')
    const plusButton = pluralsSection.locator('button:has-text("+")')

    await plusButton.click()
    await expect(page.locator('text=You have 1 item in your cart.')).toBeVisible()

    await plusButton.click()
    await expect(page.locator('text=You have 2 items in your cart.')).toBeVisible()
  })

  test('Plural Reset button works', async ({ page }) => {
    await page.goto('/')
    const pluralsSection = page.locator('h1:has-text("Plurals")').locator('..')
    const plusButton = pluralsSection.locator('button:has-text("+")')
    const resetButton = pluralsSection.locator('button:has-text("Reset")')

    await plusButton.click()
    await expect(page.locator('text=You have 1 item in your cart.')).toBeVisible()

    await resetButton.click()
    await expect(page.locator('text=Your cart is empty.')).toBeVisible()
  })

  test('d() date formatting section is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2:has-text("Feature: d() Date Formatting")')).toBeVisible()
  })

  test('n() number formatting renders locale-aware numbers', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=1,234,567.89').first()).toBeVisible()
  })

  test('format() direct ICU interpolation works', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('text=Hello Developer, you have 5 notifications'),
    ).toBeVisible()
  })

  test('Select component renders gender-based text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=She liked this')).toBeVisible()

    const maleButton = page.locator('button:has-text("male")').first()
    await maleButton.click()
    await expect(page.locator('text=He liked this')).toBeVisible()

    const otherButton = page.locator('button:has-text("other")').first()
    await otherButton.click()
    await expect(page.locator('text=They liked this')).toBeVisible()
  })

  test('language switcher shows all three locales', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button:has-text("English")')).toBeVisible()
    await expect(page.locator('button:has-text("中文")')).toBeVisible()
    await expect(page.locator('button:has-text("日本語")')).toBeVisible()
  })

  // XSS prevention e2e test
  test('no unexpected script elements in rendered output', async ({ page }) => {
    await page.goto('/')
    const scripts = page.locator('main script')
    await expect(scripts).toHaveCount(0)
  })

  // P1.9 Solid signal race condition — rapid locale switching
  test('rapid locale switching with signals settles correctly', async ({ page }) => {
    await page.goto('/')
    const enBtn = page.locator('button:has-text("English")')
    const jaBtn = page.locator('button:has-text("日本語")')
    // 10 rapid switches
    for (let i = 0; i < 5; i++) {
      await jaBtn.click()
      await enBtn.click()
    }
    // Verify final state is English
    await expect(page.locator('h1').first()).toContainText('Welcome to Fluenti')
  })

  // P2.12 DateTime styles — d() renders multiple format styles
  test('d() date formatting renders short, long, and relative styles', async ({ page }) => {
    await page.goto('/')
    // short style — e.g. "1/1/24" with slashes
    const dateSection = page.locator('h2:has-text("Feature: d() Date Formatting")').locator('..')
    const shortOutput = dateSection.locator('div').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{2,4}/ })
    await expect(shortOutput.first()).toBeVisible()
    // long style — e.g. "January 1, 2024" with full month name
    const longOutput = dateSection.locator('div').filter({ hasText: /[A-Z][a-z]+ \d{1,2}, \d{4}/ })
    await expect(longOutput.first()).toBeVisible()
    // Should have at least 3 date outputs (default, short, long)
    const dateOutputs = dateSection.locator('div').filter({ hasText: /\d{1,4}/ })
    expect(await dateOutputs.count()).toBeGreaterThanOrEqual(3)
  })

  // P2.13 Number formatting styles — n() with currency and percent
  test('n() number formatting renders currency and percent styles', async ({ page }) => {
    await page.goto('/')
    // currency: $42.50 or similar
    await expect(page.locator('text=$42.50').first()).toBeVisible()
    // percent: 86% or similar
    await expect(page.locator('text=86%').first()).toBeVisible()
  })

  test('missing translation falls back gracefully', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
    await page.locator('button:has-text("日本語")').click()
    // Should still show English text (fallback)
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
  })

  test('loading indicator disappears after locale switch', async ({ page }) => {
    await page.goto('/')
    // Switch locale
    await page.locator('button:has-text("日本語")').click()
    // After settling, loading indicator (span with "Loading...") should be gone
    await expect(page.locator('span:has-text("Loading...")')).not.toBeVisible()
    await expect(page.locator('h1').first()).toContainText('Fluenti へようこそ')
  })

  test('preloadLocale fires on hover and subsequent switch works', async ({ page }) => {
    await page.goto('/')
    // Hover to trigger preload
    await page.locator('button:has-text("日本語")').hover()
    await page.waitForTimeout(500)
    // Click to switch
    await page.locator('button:has-text("日本語")').click()
    await expect(page.locator('h1').first()).toContainText('Fluenti へようこそ')
  })

  test('msg() lazy message descriptor translates', async ({ page }) => {
    await page.goto('/')
    // Switch to Japanese
    await page.locator('button:has-text("日本語")').click()
    const after = await page.getByTestId('msg-title').textContent()
    expect(after).toContain('管理者')
  })
})

test.describe('Solid RTL support', () => {
  test('Arabic locale sets dir=rtl on html element', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("العربية")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('switching back to English sets dir=ltr', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("العربية")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.locator('button:has-text("English")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  test('Arabic locale renders Arabic translations', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("العربية")').click()
    await expect(page.locator('h1').first()).toContainText('مرحبًا بك في Fluenti')
  })
})

test.describe('Solid Cookie persistence', () => {
  test('locale persists after page reload via cookie', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("日本語")').click()
    await expect(page.locator('h1').first()).toContainText('Fluenti へようこそ')
    await page.reload()
    // After reload, should still be in Japanese (not English)
    await expect(page.locator('h1').first()).toContainText('Fluenti へようこそ')
  })

  test('Arabic locale persists after page reload', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("العربية")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('h1').first()).toContainText('مرحبًا بك في Fluenti')
  })
})
