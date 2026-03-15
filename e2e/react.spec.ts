import { test, expect } from '@playwright/test'

test.describe('React SPA Playground', () => {
  test('renders header with title and tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('title')).toContainText('Fluenti React Playground')
    await expect(page.getByTestId('tagline')).toContainText('Write text. Fluenti translates it. Zero config.')
  })

  test('home page shows welcome, greeting, and interpolation', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
    await expect(page.getByTestId('current-locale')).toContainText('Current locale: en')
    await expect(page.getByTestId('items')).toContainText('You have 3 items in your cart.')
  })

  test('d() date formatting renders output', async ({ page }) => {
    await page.goto('/')
    const dateOutput = page.getByTestId('date')
    await expect(dateOutput).not.toBeEmpty()
  })

  test('n() number formatting renders locale-aware number', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('number')).toContainText('1,234.5')
  })

  test('features list renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('features-list')).toContainText('Reactive locale switching')
    await expect(page.getByTestId('features-list')).toContainText('Built-in plural support')
  })

  test('locale switching updates translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('title')).toContainText('Fluenti React プレイグラウンド')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')
  })

  test('locale switching updates translations to Chinese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('title')).not.toContainText('Fluenti React Playground')
  })

  test('switching back to English restores original text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('title')).toContainText('Fluenti React プレイグラウンド')
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('title')).toContainText('Fluenti React Playground')
  })

  test('Plural component renders zero, one, other forms', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')
  })

  test('Plural reset button works', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await page.getByTestId('btn-add').click()
    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')

    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
  })

  test('Select component renders gender-based text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('select-result')).toContainText('They liked your post')

    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He liked your post')

    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She liked your post')
  })

  test('Rich text page renders Trans components', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-richtext').click()
    await expect(page.getByTestId('richtext-section')).toBeVisible()
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('documentation')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')
  })

  test('footer renders attribution', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('footer')).toContainText('Built with Fluenti and React')
  })

  test('navigation between sections works', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-section')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-section')).toBeVisible()

    await page.getByTestId('nav-richtext').click()
    await expect(page.getByTestId('richtext-section')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('home-section')).toBeVisible()
  })
})
