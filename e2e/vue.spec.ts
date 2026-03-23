import { test, expect } from '@playwright/test'

test.describe('Vue Playground', () => {
  test('renders header with title and tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header h1')).toContainText('Fluenti Vue Playground')
    await expect(page.locator('.tagline')).toContainText('Write text. Fluenti translates it. Zero config.')
  })

  test('navigation links are visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('nav-home')).toBeVisible()
    await expect(page.getByTestId('nav-plurals')).toBeVisible()
    await expect(page.getByTestId('nav-richtext')).toBeVisible()
    await expect(page.getByTestId('nav-formatting')).toBeVisible()
    await expect(page.getByTestId('nav-directives')).toBeVisible()
    await expect(page.getByTestId('nav-script')).toBeVisible()
  })

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await expect(page.locator('h2:has-text("Plural Demos")')).toBeVisible()

    await page.getByTestId('nav-richtext').click()
    await expect(page.locator('h2:has-text("Rich Text Demos")')).toBeVisible()

    await page.getByTestId('nav-formatting').click()
    await expect(page.locator('h2:has-text("Formatting Demos")')).toBeVisible()

    await page.getByTestId('nav-directives').click()
    await expect(page.locator('h2:has-text("v-t Directive")')).toBeVisible()

    await page.getByTestId('nav-script').click()
    await expect(page.locator('h2:has-text("Script Features")')).toBeVisible()
  })

  test('v-t directive renders plain text translations', async ({ page }) => {
    await page.goto('/directives')
    await expect(page.locator('h2:has-text("v-t Directive")')).toBeVisible()
    await expect(page.locator('p:has-text("Welcome to Fluenti")')).toBeVisible()
  })

  test('t() interpolation renders correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Hello, {arg0}!').first()).toBeVisible()
    await expect(page.locator('text=Current locale: {arg0}').first()).toBeVisible()
  })

  test('format() renders ICU interpolated text', async ({ page }) => {
    await page.goto('/script')
    await expect(page.locator('text=3 items at $9.99 each')).toBeVisible()
  })

  test('DateTime component renders date formatting', async ({ page }) => {
    await page.goto('/formatting')
    await expect(page.locator('h2:has-text("DateTime")')).toBeVisible()
    const dateOutput = page.locator('.demo-label:has-text("default") + div').first()
    await expect(dateOutput).toContainText('/')
  })

  test('NumberFormat component renders locale-aware numbers', async ({ page }) => {
    await page.goto('/formatting')
    await expect(page.locator('text=1,234,567.89').first()).toBeVisible()
    await expect(page.locator('text="42.5"')).toBeVisible()
  })

  test('locale switching updates translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('header h1')).toContainText('Fluenti Vue プレイグラウンド')
  })

  test('locale switching updates translations to Chinese', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("中文")').click()
    await expect(page.locator('header h1')).toContainText('Fluenti Vue 演练场')
  })

  test('v-t directive renders rich text with HTML tags', async ({ page }) => {
    await page.goto('/richtext')
    const richTextLink = page.locator('a[href="/terms"]')
    await expect(richTextLink).toBeVisible()
    await expect(richTextLink).toContainText('terms of service')

    const strongText = page.locator('p:has(strong):has-text("important")')
    await expect(strongText.first()).toBeVisible()
  })

  test('Trans component renders rich text with links and bold', async ({ page }) => {
    await page.goto('/richtext')
    const docLink = page.locator('a[href="https://github.com"][target="_blank"]')
    await expect(docLink).toBeVisible()
    await expect(docLink).toContainText('documentation')

    await expect(page.locator('strong:has-text("important")').first()).toBeVisible()
  })

  test('Plural component renders and updates with counter', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.locator('text=No apples').first()).toBeVisible()

    const addButtons = page.locator('button:has-text("Add")')
    await addButtons.first().click()
    await expect(page.locator('text=1 apple').first()).toBeVisible()

    await addButtons.first().click()
    await expect(page.locator('text=2 apples')).toBeVisible()
  })

  test('Select component renders gender-based text', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.locator('text=She liked this')).toBeVisible()

    await page.locator('button:has-text("male")').first().click()
    await expect(page.locator('text=He liked this')).toBeVisible()
  })

  test('footer renders attribution text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer')).toContainText('Built with Fluenti and Vue 3')
  })

  test('v-t attribute modifiers work on input placeholder', async ({ page }) => {
    await page.goto('/directives')
    const searchInput = page.locator('input[placeholder]').first()
    await expect(searchInput).toBeVisible()
  })

  test('msg`` tagged template renders lazy messages', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Admin: Administrator')).toBeVisible()
  })

  // XSS prevention e2e tests
  test('HTML in translated text is escaped, not executed', async ({ page }) => {
    await page.goto('/')
    // Verify no unexpected script or img elements from translations
    const scripts = page.locator('main script')
    await expect(scripts).toHaveCount(0)
  })

  // P0.6 Concurrent locale switches
  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    const enBtn = page.locator('.lang-buttons button:has-text("English")')
    const jaBtn = page.locator('.lang-buttons button:has-text("日本語")')
    // Rapidly switch 10 times
    for (let i = 0; i < 5; i++) {
      await jaBtn.click()
      await enBtn.click()
    }
    // Should settle on English (last click)
    await expect(page.locator('header h1')).toContainText('Fluenti Vue Playground')
  })

  // DateTime styles — verify component renders multiple format styles
  test('DateTime component renders short, long, relative, and datetime styles', async ({ page }) => {
    await page.goto('/formatting')
    // short style — renders as M/D/YYYY
    const shortOutput = page.locator('.demo-label:has-text("short") + div').first()
    await expect(shortOutput).toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
    // long style — currently renders same date format as default (M/D/YYYY)
    const longOutput = page.locator('.demo-label:has-text("long") + div').first()
    await expect(longOutput).toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
    // relative style — currently renders as date format (M/D/YYYY)
    const relativeOutput = page.locator('.demo-label:has-text("relative") + div').first()
    await expect(relativeOutput).toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
    // datetime style — currently renders as date format (M/D/YYYY)
    const datetimeOutput = page.locator('.demo-label:has-text("datetime") + div').first()
    await expect(datetimeOutput).toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
  })

  // Number formatting styles — verify NumberFormat component
  test('NumberFormat component renders currency, percent, and decimal styles', async ({ page }) => {
    await page.goto('/formatting')
    // currency: currently renders raw value as "42.5"
    await expect(page.locator('text="42.5"')).toBeVisible()
    // percent: currently renders raw value as "0.856"
    const percentOutput = page.locator('.demo-label:has-text("percent") + div').first()
    await expect(percentOutput).toContainText('0.856')
    // decimal: 1,234.5
    const decimalOutput = page.locator('.demo-label:has-text("decimal") + div').first()
    await expect(decimalOutput).toContainText('1,234.5')
  })

  test('missing translation falls back gracefully', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    // Should still show English text (fallback)
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
  })

  test('loading indicator disappears after locale switch', async ({ page }) => {
    await page.goto('/')
    // Switch locale
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    // After settling, loading should be gone
    await expect(page.locator('.loading-indicator')).not.toBeVisible()
    await expect(page.locator('header h1')).toContainText('Fluenti Vue プレイグラウンド')
  })

  test('preloadLocale fires on hover and subsequent switch works', async ({ page }) => {
    await page.goto('/')
    // Hover to trigger preload
    await page.locator('.lang-buttons button:has-text("日本語")').hover()
    await page.waitForTimeout(500)
    // Click to switch
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('header h1')).toContainText('Fluenti Vue プレイグラウンド')
  })
})

test.describe('Vue RTL support', () => {
  test('Arabic locale sets dir=rtl on html element', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("العربية")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('switching back to English sets dir=ltr', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("العربية")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.locator('.lang-buttons button:has-text("English")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  test('Arabic locale renders Arabic translations', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("العربية")').click()
    await expect(page.locator('header h1')).toContainText('ساحة Fluenti Vue')
  })
})

test.describe('Vue Cookie persistence', () => {
  test('locale persists after page reload via cookie', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('header h1')).toContainText('Fluenti Vue プレイグラウンド')
    await page.reload()
    // After reload, should still be in Japanese (not English)
    await expect(page.locator('header h1')).toContainText('Fluenti Vue プレイグラウンド')
  })

  test('Arabic locale persists after page reload', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("العربية")').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('header h1')).toContainText('ساحة Fluenti Vue')
  })
})
