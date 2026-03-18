import { test, expect } from '@playwright/test'

const DEMO_DATE = new Date(Date.UTC(2025, 0, 15, 12))

function expectedDate(locale: string): string {
  return new Intl.DateTimeFormat(locale).format(DEMO_DATE)
}

function expectedCurrency(locale: string): string {
  const currency = locale === 'ja' ? 'JPY' : locale === 'zh-CN' ? 'CNY' : 'USD'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(1234.5)
}

test.describe('Solid No-Plugin (runtime components)', () => {
  test('renders runtime-capable components in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('strong')).toContainText('Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('em')).toContainText('SolidJS')
    await expect(page.getByTestId('trans-features').locator('strong')).toContainText('bold')
    await expect(page.getByTestId('trans-features').locator('em')).toContainText('italic')
    await expect(page.getByTestId('trans-features').locator('a')).toContainText('links')
    await expect(page.getByTestId('plural-basic')).toContainText('No items')
    await expect(page.getByTestId('select-basic')).toContainText('Administrator')
    await expect(page.getByTestId('date-basic')).toContainText(expectedDate('en'))
    await expect(page.getByTestId('number-basic')).toContainText(expectedCurrency('en'))
  })

  test('components translate and format when switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('trans-welcome').locator('strong')).toContainText('Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('em')).toContainText('SolidJS')
    await expect(page.getByTestId('trans-welcome')).toContainText('へようこそ')
    await expect(page.getByTestId('trans-features').locator('strong')).toContainText('太字')
    await expect(page.getByTestId('trans-features').locator('em')).toContainText('斜体')
    await expect(page.getByTestId('trans-features').locator('a')).toContainText('リンク')
    await expect(page.getByTestId('plural-basic')).toContainText('アイテムはありません')
    await expect(page.getByTestId('select-basic')).toContainText('管理者')
    await expect(page.getByTestId('date-basic')).toContainText(expectedDate('ja'))
    await expect(page.getByTestId('number-basic')).toContainText(expectedCurrency('ja'))
  })

  test('runtime plural and select stay correct after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('welcome')).toContainText('欢迎使用 Fluenti')
    await expect(page.getByTestId('trans-welcome').locator('strong')).toBeVisible()
    await expect(page.getByTestId('trans-welcome').locator('em')).toBeVisible()
    await expect(page.getByTestId('trans-features').locator('strong')).toBeVisible()
    await expect(page.getByTestId('trans-features').locator('em')).toBeVisible()
    await expect(page.getByTestId('trans-features').locator('a')).toBeVisible()
    await page.getByTestId('count-add').click()
    await page.getByTestId('count-add').click()
    await expect(page.getByTestId('plural-basic')).toContainText('2 件商品')
    await page.getByTestId('role-user').click()
    await expect(page.getByTestId('select-basic')).toContainText('用户')
  })
})
