import { test, expect } from '@playwright/test'

test.describe('Monorepo App B (independent catalog)', () => {
  test('renders English greeting from independent catalog', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('greeting')).toContainText('Hello from App B')
  })

  test('switches to Japanese using independent catalog', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('greeting')).toContainText('App Bからこんにちは')
  })

  test('switches back to English', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('greeting')).toContainText('App Bからこんにちは')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('greeting')).toContainText('Hello from App B')
  })
})
