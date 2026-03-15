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
    await expect(page.locator('h1').first()).not.toContainText('Welcome to Fluenti')
  })

  test('locale switching updates translations to Chinese', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("中文")').click()
    await expect(page.locator('h1').first()).not.toContainText('Welcome to Fluenti')
  })

  test('Rich Text section renders with Trans component', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1:has-text("Rich Text")')).toBeVisible()
    await expect(page.locator('strong:has-text("Fluenti")')).toBeVisible()
    await expect(page.locator('em:has-text("SolidJS")')).toBeVisible()
    await expect(page.locator('a:has-text("links")')).toBeVisible()
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
})
