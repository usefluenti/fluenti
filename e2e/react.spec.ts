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

  test('d() date formatting renders locale-aware output', async ({ page }) => {
    await page.goto('/')
    const dateText = await page.getByTestId('date').textContent()
    // Date output should contain a recognizable date pattern (month, day, year)
    expect(dateText).toMatch(/\d/)
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
    await expect(page.getByTestId('title')).toContainText('Fluenti React 练习场')
    await expect(page.getByTestId('welcome')).toContainText('欢迎使用 Fluenti')
    await expect(page.getByTestId('greeting')).toContainText('你好，World！')
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

    // Also verify reset works
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

  // === msg`` lazy message descriptors ===

  test('msg tagged template renders lazy messages in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('msg-admin')).toContainText('Administrator')
    await expect(page.getByTestId('msg-user')).toContainText('Regular User')
  })

  test('msg tagged template translates when switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('msg-admin')).toContainText('管理者')
    await expect(page.getByTestId('msg-user')).toContainText('一般ユーザー')
  })

  test('msg tagged template translates when switching to Chinese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('msg-admin')).toContainText('管理员')
    await expect(page.getByTestId('msg-user')).toContainText('普通用户')
  })

  // === fallbackLocale — missing key falls back to English ===

  test('fallback locale shows English for missing translation in Japanese', async ({ page }) => {
    await page.goto('/')
    // English — key exists
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')

    // Switch to Japanese — key does NOT exist in ja, should fall back to English
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
    // But other keys should be Japanese
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })
})
