import { test, expect } from '@playwright/test'

test.describe('React No-Plugin (runtime Trans)', () => {
  test('renders Trans components in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('documentation')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')
    await expect(page.getByTestId('trans-multi').locator('a[href="/login"]')).toContainText('sign in')
    await expect(page.getByTestId('trans-multi').locator('strong')).toContainText('register')
  })

  test('Trans translates when switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('ドキュメント')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('重要')
    await expect(page.getByTestId('trans-multi').locator('a[href="/login"]')).toContainText('ログイン')
    await expect(page.getByTestId('trans-multi').locator('strong')).toContainText('登録')
  })

  test('Trans preserves element structure after zh-CN switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('welcome')).toContainText('欢迎使用 Fluenti')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toBeVisible()
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('文档')
    await expect(page.getByTestId('trans-bold').locator('strong')).toBeVisible()
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('重要')
    await expect(page.getByTestId('trans-multi').locator('a[href="/login"]')).toBeVisible()
    await expect(page.getByTestId('trans-multi').locator('strong')).toBeVisible()
  })

  test('switching back to English restores original text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('documentation')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')
  })
})
