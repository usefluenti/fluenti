import { test, expect } from '@playwright/test'

test.describe('SolidStart Playground (SSR)', () => {
  test('renders server-side translated content', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Welcome to Fluenti')
  })

  test('renders interpolated greeting', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2')).toContainText('Hello, Developer!')
  })

  test('displays SSR description', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.locator('text=server-side rendered with per-request locale isolation'),
    ).toBeVisible()
  })

  test('shows current locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Current locale: en').first()).toBeVisible()
  })

  test('locale switching updates translations to Japanese', async ({ page }) => {
    await page.goto('/')
    // Click Japanese locale button
    await page.locator('button:has-text("日本語")').click()
    // Welcome heading should now be in Japanese
    await expect(page.locator('h1').first()).toContainText('Fluenti へようこそ')
  })

  test('locale switching back to English', async ({ page }) => {
    await page.goto('/')
    // Switch to Japanese first
    await page.locator('button:has-text("日本語")').click()
    await expect(page.locator('h1').first()).toContainText('Fluenti へようこそ')
    // Switch back to English
    await page.locator('button:has-text("English")').click()
    await expect(page.locator('h1').first()).toContainText('Welcome to Fluenti')
  })

  test('rich text page renders with Trans component', async ({ page }) => {
    await page.goto('/rich-text')
    // RichText page heading
    await expect(page.locator('h1:has-text("Rich Text")')).toBeVisible()
    // Trans renders <strong>Fluenti</strong>
    await expect(page.locator('strong:has-text("Fluenti")')).toBeVisible()
    // Trans renders <em>SolidStart</em>
    await expect(page.locator('em:has-text("SolidStart")')).toBeVisible()
    // Trans renders <a> links
    await expect(page.locator('a:has-text("links")')).toBeVisible()
  })

  test('plurals page renders zero state', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.locator('h1:has-text("Plurals")')).toBeVisible()
    await expect(page.locator('text=Your cart is empty.')).toBeVisible()
  })

  test('plurals page increments and shows correct forms', async ({ page }) => {
    await page.goto('/plurals')
    const pluralsSection = page.locator('h1:has-text("Plurals")').locator('..')
    const plusButton = pluralsSection.locator('button:has-text("+")')

    await plusButton.click()
    await expect(page.locator('text=You have 1 item in your cart.')).toBeVisible()

    await plusButton.click()
    await expect(page.locator('text=You have 2 items in your cart.')).toBeVisible()
  })

  test('plurals reset button works', async ({ page }) => {
    await page.goto('/plurals')
    const pluralsSection = page.locator('h1:has-text("Plurals")').locator('..')
    const plusButton = pluralsSection.locator('button:has-text("+")')
    const resetButton = pluralsSection.locator('button:has-text("Reset")')

    await plusButton.click()
    await expect(page.locator('text=You have 1 item in your cart.')).toBeVisible()

    await resetButton.click()
    await expect(page.locator('text=Your cart is empty.')).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')
    // Navigate to rich-text
    await page.locator('a:has-text("Rich Text")').first().click()
    await expect(page.locator('h1:has-text("Rich Text")')).toBeVisible()

    // Navigate to plurals
    await page.locator('a:has-text("Plurals")').first().click()
    await expect(page.locator('h1:has-text("Plurals")')).toBeVisible()

    // Navigate back home
    await page.locator('a:has-text("Home")').first().click()
    await expect(page.locator('h1:has-text("Welcome to Fluenti")')).toBeVisible()
  })

  test('language switcher shows both locales', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button:has-text("English")')).toBeVisible()
    await expect(page.locator('button:has-text("日本語")')).toBeVisible()
  })
})
