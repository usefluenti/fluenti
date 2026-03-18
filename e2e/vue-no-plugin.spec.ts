import { test, expect } from '@playwright/test'

const DEMO_DATE = new Date(Date.UTC(2025, 0, 15, 12))

function expectedDate(locale: string): string {
  return new Intl.DateTimeFormat(locale).format(DEMO_DATE)
}

function expectedNumber(locale: string): string {
  return new Intl.NumberFormat(locale).format(1234.5)
}

test.describe('Vue No-Plugin (runtime components)', () => {
  test('renders runtime-capable components in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('documentation')
    await expect(page.getByTestId('plural-basic')).toContainText('No items')
    await expect(page.getByTestId('select-basic')).toContainText('Administrator')
    await expect(page.getByTestId('date-basic')).toContainText(expectedDate('en'))
    await expect(page.getByTestId('number-basic')).toContainText(expectedNumber('en'))
  })

  test('translates and formats after switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()

    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('ドキュメント')
    await expect(page.getByTestId('plural-basic')).toContainText('アイテムはありません')
    await expect(page.getByTestId('select-basic')).toContainText('管理者')
    await expect(page.getByTestId('date-basic')).toContainText(expectedDate('ja'))
    await expect(page.getByTestId('number-basic')).toContainText(expectedNumber('ja'))
  })

  test('plural and select stay runtime-correct in Chinese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()

    await page.getByTestId('count-add').click()
    await page.getByTestId('count-add').click()
    await expect(page.getByTestId('plural-basic')).toContainText('2 件商品')

    await page.getByTestId('role-user').click()
    await expect(page.getByTestId('select-basic')).toContainText('用户')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('文档')
  })
})
