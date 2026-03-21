import { test, expect } from '@playwright/test'

test.describe('Monorepo App A (shared catalog)', () => {
  test('renders English greeting from shared catalog', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('greeting')).toContainText('Hello from App A')
  })

  test('switches to Japanese using shared catalog', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('greeting')).toContainText('App Aからこんにちは')
  })

  test('switches back to English', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('greeting')).toContainText('App Aからこんにちは')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('greeting')).toContainText('Hello from App A')
  })
})
