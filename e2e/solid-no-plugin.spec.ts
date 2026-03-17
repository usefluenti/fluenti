import { test, expect } from '@playwright/test'

test.describe('Solid No-Plugin (runtime Trans)', () => {
  test('renders Trans components in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('strong')).toContainText('Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('em')).toContainText('SolidJS')
    await expect(page.getByTestId('trans-features').locator('strong')).toContainText('bold')
    await expect(page.getByTestId('trans-features').locator('em')).toContainText('italic')
    await expect(page.getByTestId('trans-features').locator('a')).toContainText('links')
  })

  test('Trans translates when switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('trans-welcome').locator('strong')).toContainText('Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('em')).toContainText('SolidJS')
    await expect(page.getByTestId('trans-welcome')).toContainText('へようこそ')
    await expect(page.getByTestId('trans-features').locator('strong')).toContainText('太字')
    await expect(page.getByTestId('trans-features').locator('em')).toContainText('斜体')
    await expect(page.getByTestId('trans-features').locator('a')).toContainText('リンク')
  })

  test('Trans preserves component structure after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('welcome')).toContainText('欢迎使用 Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('strong')).toBeVisible()
    await expect(page.getByTestId('trans-welcome').locator('em')).toBeVisible()
    await expect(page.getByTestId('trans-features').locator('strong')).toBeVisible()
    await expect(page.getByTestId('trans-features').locator('em')).toBeVisible()
    await expect(page.getByTestId('trans-features').locator('a')).toBeVisible()
  })
})
