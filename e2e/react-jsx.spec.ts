import { test, expect } from '@playwright/test'

test.describe('React JSX (plain JS/JSX source files)', () => {
  test('renders msg`` and t`` in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('hello')).toContainText('Hello World')
    await expect(page.getByTestId('msg-admin')).toContainText('Administrator')
    await expect(page.getByTestId('msg-user')).toContainText('Regular User')
    await expect(page.getByTestId('count')).toContainText('You have 0 items.')
  })

  test('translates msg`` and t`` when switching to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('hello')).toContainText('こんにちは世界')
    await expect(page.getByTestId('msg-admin')).toContainText('管理者')
    await expect(page.getByTestId('msg-user')).toContainText('一般ユーザー')
  })

  test('interpolation renders correct values in JSX source', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('count-add').click()
    await page.getByTestId('count-add').click()
    await expect(page.getByTestId('count')).toContainText('You have 2 items.')
    await page.getByTestId('count-reset').click()
    await expect(page.getByTestId('count')).toContainText('You have 0 items.')
  })
})
