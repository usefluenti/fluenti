import { test, expect } from '@playwright/test'

test.describe('Svelte Playground', () => {
  test('renders header with title and tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header h1')).toContainText('Fluenti Svelte Playground')
    await expect(page.locator('.tagline')).toContainText('Write text. Fluenti translates it. Zero config.')
  })

  test('t() interpolation renders correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Hello, World!').first()).toBeVisible()
    await expect(page.locator('text=Current locale: en').first()).toBeVisible()
  })

  test('t() with count renders correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=You have 5 items in your cart.').first()).toBeVisible()
  })

  test('format() renders ICU interpolated text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=3 items at $9.99 each')).toBeVisible()
  })

  test('d() date formatting renders non-empty output', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2:has-text("d() — Date Formatting")')).toBeVisible()
    // Date output should contain some numeric content
    const dateSection = page.locator('.section:has(h2:has-text("d() — Date"))').locator('.demo-item div').last()
    await expect(dateSection).not.toBeEmpty()
  })

  test('n() number formatting renders locale-aware numbers', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=1,234,567.89').first()).toBeVisible()
  })

  test('locale switching updates translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('header h1')).toContainText('Fluenti Svelte プレイグラウンド')
    await expect(page.locator('.tagline')).toContainText('テキストを書く。Fluentiが翻訳する。設定不要。')
  })

  test('locale switching updates translations to Chinese', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("中文")').click()
    await expect(page.locator('header h1')).toContainText('Fluenti Svelte 演练场')
  })

  test('locale switching updates t() interpolated text', async ({ page }) => {
    await page.goto('/')
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('text=こんにちは、Worldさん！')).toBeVisible()
    await expect(page.locator('text=現在のロケール: ja')).toBeVisible()
  })

  test('Plural component renders zero state', async ({ page }) => {
    await page.goto('/')
    // Cart plural starts at 0
    await expect(page.locator('text=Your cart is empty.')).toBeVisible()
  })

  test('Plural component renders and updates with counter', async ({ page }) => {
    await page.goto('/')
    // Apple section
    await expect(page.locator('text=No apples').first()).toBeVisible()

    const appleSection = page.locator('.section:has(h3:has-text("Apples"))')
    const addButton = appleSection.locator('button:has-text("Add")')

    await addButton.click()
    await expect(page.locator('text=1 apple').first()).toBeVisible()

    await addButton.click()
    await expect(page.locator('text=2 apples')).toBeVisible()
  })

  test('Plural component cart increments correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Your cart is empty.')).toBeVisible()

    const cartSection = page.locator('.section:has(h3:has-text("Cart Items"))')
    const plusButton = cartSection.locator('button:has-text("+")')

    await plusButton.click()
    await expect(page.locator('text=You have 1 item in your cart.')).toBeVisible()

    await plusButton.click()
    await expect(page.locator('text=You have 2 items in your cart.')).toBeVisible()
  })

  test('Plural Reset button works', async ({ page }) => {
    await page.goto('/')
    const appleSection = page.locator('.section:has(h3:has-text("Apples"))')
    const addButton = appleSection.locator('button:has-text("Add")')
    const resetButton = appleSection.locator('button:has-text("Reset")')

    await addButton.click()
    await expect(page.locator('text=1 apple').first()).toBeVisible()

    await resetButton.click()
    await expect(page.locator('text=No apples').first()).toBeVisible()
  })

  test('Select component renders gender-based text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=She liked this')).toBeVisible()

    await page.locator('button:has-text("male")').first().click()
    await expect(page.locator('text=He liked this')).toBeVisible()

    await page.locator('button:has-text("other")').first().click()
    await expect(page.locator('text=They liked this')).toBeVisible()
  })

  test('footer renders attribution text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer')).toContainText('Built with Fluenti and Svelte 5')
  })

  test('msg`` tagged template renders lazy messages', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Admin: Administrator')).toBeVisible()
    await expect(page.locator('text=User: Regular User')).toBeVisible()
  })

  test('language switcher shows all three locales', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.lang-buttons button:has-text("English")')).toBeVisible()
    await expect(page.locator('.lang-buttons button:has-text("中文")')).toBeVisible()
    await expect(page.locator('.lang-buttons button:has-text("日本語")')).toBeVisible()
  })

  test('Reactivity demo counter works', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Counter value: 0')).toBeVisible()

    const reactivitySection = page.locator('.section:has(h2:has-text("Reactivity Demo"))')
    const incrementButton = reactivitySection.locator('button:has-text("Increment")')

    await incrementButton.click()
    await expect(page.locator('text=Counter value: 1')).toBeVisible()

    await incrementButton.click()
    await expect(page.locator('text=Counter value: 2')).toBeVisible()
  })

  test('input placeholder is translated', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input[placeholder="Search products..."]')
    await expect(searchInput).toBeVisible()
  })

  test('locale switch updates features list', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Reactive locale switching')).toBeVisible()

    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('text=リアクティブなロケール切替')).toBeVisible()
  })

  test('locale persists across Select component after switching', async ({ page }) => {
    await page.goto('/')
    // Switch to Japanese
    await page.locator('.lang-buttons button:has-text("日本語")').click()
    await expect(page.locator('text=彼女がいいねしました')).toBeVisible()

    // Switch gender
    await page.locator('button:has-text("male")').first().click()
    await expect(page.locator('text=彼がいいねしました')).toBeVisible()
  })

  // XSS prevention e2e test
  test('no unexpected script elements in rendered output', async ({ page }) => {
    await page.goto('/')
    const scripts = page.locator('main script')
    await expect(scripts).toHaveCount(0)
  })
})
