import { test, expect } from '@playwright/test'

test.describe('TanStack Start Playground', () => {
  test('renders home route and switches locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('title')).toContainText('Fluenti TanStack Start Playground')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('msg-admin')).toContainText('Administrator')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluenti へようこそ')
    await expect(page.getByTestId('msg-admin')).toContainText('管理者')
  })

  test('plural and select route stays translated', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-plurals').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
    await expect(page.getByTestId('select-result')).toContainText('They liked your post')

    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')

    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She liked your post')

    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('title')).toContainText('Fluenti TanStack Start 练习场')
    await expect(page.getByTestId('plural-result')).toContainText('1')
    await expect(page.getByTestId('select-result')).toContainText('She')
  })

  test('rich text route renders translated Trans output', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-richtext').click()
    await expect(page.getByTestId('richtext-title')).toContainText('Rich Text Demos')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('documentation')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('important')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('richtext-title')).toContainText('リッチテキストデモ')
    await expect(page.getByTestId('trans-basic').locator('a[href="/docs"]')).toContainText('ドキュメント')
    await expect(page.getByTestId('trans-bold').locator('strong')).toContainText('重要')
  })
})
