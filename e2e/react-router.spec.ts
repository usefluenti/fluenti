import { test, expect } from '@playwright/test'

test.describe('React Router e2e', () => {
  test('home page renders welcome and greeting', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('home-desc')).toContainText('This is the home page.')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
  })

  test('about page renders with interpolation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-page')).toBeVisible()
    await expect(page.getByTestId('about-title')).toContainText('About our project')
    await expect(page.getByTestId('about-desc')).toContainText('Learn more about Fluenti.')
    await expect(page.getByTestId('contact')).toContainText('Contact us at hello@fluenti.dev')
  })

  test('plurals page with counter', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')

    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
  })

  test('navigation between routes works', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-page')).toBeVisible()

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plurals-page')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('home-page')).toBeVisible()
  })

  test('locale switching to Japanese updates all pages', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('home-desc')).toContainText('こちらはホームページです。')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-title')).toContainText('私たちのプロジェクトについて')
  })

  test('switching back to English restores original text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('direct URL navigation works', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('about-page')).toBeVisible()
    await expect(page.getByTestId('about-title')).toContainText('About our project')
  })

  test('locale persists across route navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('nav-home')).toContainText('ホーム')

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('query-based locale sets Japanese via ?lang=ja', async ({ page }) => {
    await page.goto('/?lang=ja')
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('cookie persists locale across reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.reload()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
  })

  test('cookie persists locale across routes after reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-page')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('about-title')).toContainText('私たちのプロジェクトについて')
  })

  test('RTL Arabic locale sets dir=rtl and shows Arabic text', async ({ page }) => {
    await page.goto('/?lang=ar')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByTestId('welcome')).toContainText('مرحباً بكم في Fluenti')
  })

  test('RTL switches back to LTR when changing to English', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    const rtlDir = await page.locator('html').getAttribute('dir')
    expect(rtlDir).toBe('rtl')

    await page.getByTestId('lang-en').click()
    const ltrDir = await page.locator('html').getAttribute('dir')
    expect(ltrDir).toBe('ltr')
  })

  test('query param overrides cookie locale', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')

    await page.goto('/?lang=en')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })
})
