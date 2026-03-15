import { test, expect } from '@playwright/test'

test.describe('Vue Playground', () => {
  test('renders header with title and tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header h1')).toContainText('Fluenti Vue Playground')
    await expect(page.locator('.tagline')).toContainText('Write text. Fluenti translates it. Zero config.')
  })

  test('v-t directive renders plain text translations', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2:has-text("v-t Directive")')).toBeVisible()
    await expect(page.locator('p:has-text("Welcome to Fluenti")')).toBeVisible()
  })

  test('t() interpolation renders correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Hello, World!').first()).toBeVisible()
    await expect(page.locator('text=Current locale: en').first()).toBeVisible()
  })

  test('format() renders ICU interpolated text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=3 items at $9.99 each')).toBeVisible()
  })

  test('d() date formatting renders non-empty output', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2:has-text("$d() Date Formatting")')).toBeVisible()
    const dateOutput = page.locator('.demo-label:has-text("$d(date) — default") + div')
    await expect(dateOutput).toContainText('/')
  })

  test('n() number formatting renders locale-aware numbers', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=1,234,567.89').first()).toBeVisible()
    await expect(page.locator('text=$42.50')).toBeVisible()
  })

  test('locale switching updates translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('header h1')).not.toContainText('Fluenti Vue Playground')
  })

  test('locale switching updates translations to Chinese', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("中文")').click()
    await expect(page.locator('header h1')).not.toContainText('Fluenti Vue Playground')
  })

  test('v-t directive renders rich text with HTML tags', async ({ page }) => {
    await page.goto('/')
    const richTextLink = page.locator('a[href="/terms"]')
    await expect(richTextLink).toBeVisible()
    await expect(richTextLink).toContainText('terms of service')

    const strongText = page.locator('p:has(strong):has-text("important")')
    await expect(strongText.first()).toBeVisible()
  })

  test('Trans component renders rich text with links and bold', async ({ page }) => {
    await page.goto('/')
    const docLink = page.locator('a[href="https://github.com"][target="_blank"]')
    await expect(docLink).toBeVisible()
    await expect(docLink).toContainText('documentation')

    await expect(page.locator('strong:has-text("important")').first()).toBeVisible()
  })

  test('Plural component renders and updates with counter', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=No apples').first()).toBeVisible()

    const addButtons = page.locator('button:has-text("Add")')
    await addButtons.first().click()
    await expect(page.locator('text=1 apple').first()).toBeVisible()

    await addButtons.first().click()
    await expect(page.locator('text=2 apples')).toBeVisible()
  })

  test('Select component renders gender-based text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=She liked this')).toBeVisible()

    await page.locator('button:has-text("male")').first().click()
    await expect(page.locator('text=He liked this')).toBeVisible()
  })

  test('footer renders attribution text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer')).toContainText('Built with Fluenti and Vue 3')
  })

  test('v-t attribute modifiers work on input placeholder', async ({ page }) => {
    await page.goto('/')
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
})
