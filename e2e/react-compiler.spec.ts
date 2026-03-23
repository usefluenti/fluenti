import { test, expect } from '@playwright/test'

test.describe('React Compiler — Fluenti compatibility', () => {
  // ---------- Basic rendering with Compiler ----------

  test('renders greeting with interpolation', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('greeting')).toHaveText('Hello, World!')
  })

  test('shows current locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('en')
  })

  // ---------- Plurals ----------

  test('plural: zero form', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('plural-0')).toHaveText('No items')
  })

  test('plural: one form', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('plural-1')).toHaveText('1 item')
  })

  test('plural: other form', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('plural-5')).toHaveText('5 items')
  })

  // ---------- Select ----------

  test('select: male', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('select-male')).toHaveText('He liked your post')
  })

  test('select: female', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('select-female')).toHaveText('She liked your post')
  })

  test('select: other', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('select-other')).toHaveText('They liked your post')
  })

  // ---------- Nested select + plural ----------

  test('nested: male with 1 gift', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('nested-male-1')).toHaveText('He bought 1 gift')
  })

  test('nested: female with 3 gifts', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('nested-female-3')).toHaveText('She bought 3 gifts')
  })

  // ---------- Number formatting ----------

  test('currency formatting', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('currency')).toContainText('$')
    await expect(page.getByTestId('currency')).toContainText('1,234.56')
  })

  test('percent formatting', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('percent')).toContainText('85%')
  })

  // ---------- Fallback & te() ----------

  test('te() returns true for existing key', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('te-exists')).toHaveText('true')
  })

  test('te() returns false for missing key', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('te-missing')).toHaveText('false')
  })

  test('fallback to en when ja translation missing', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('fallback')).toHaveText('English only')
  })

  // ---------- Locale switching (Compiler memoization stress) ----------

  test('locale switch to Japanese updates all translations', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('greeting')).toHaveText('こんにちは、World！')
    await expect(page.getByTestId('plural-1')).toHaveText('1個のアイテム')
    await expect(page.getByTestId('select-male')).toHaveText('彼があなたの投稿にいいねしました')
  })

  test('switching back to English restores translations', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('greeting')).toHaveText('こんにちは、World！')
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('greeting')).toHaveText('Hello, World!')
    await expect(page.getByTestId('plural-1')).toHaveText('1 item')
  })

  test('rapid locale switching settles correctly', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 10; i++) {
      await page.getByTestId(i % 2 === 0 ? 'lang-ja' : 'lang-en').click()
    }
    // Final click was lang-en (i=9, odd)
    await expect(page.getByTestId('greeting')).toHaveText('Hello, World!')
  })

  // ---------- Stateful component (Compiler auto-memo) ----------

  test('counter increments with Compiler memoization', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('counter-value')).toHaveText('Count: 0')
    await page.getByTestId('counter-inc').click()
    await expect(page.getByTestId('counter-value')).toHaveText('Count: 1')
    await page.getByTestId('counter-inc').click()
    await expect(page.getByTestId('counter-value')).toHaveText('Count: 2')
  })

  test('counter decrements correctly', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('counter-inc').click()
    await page.getByTestId('counter-inc').click()
    await page.getByTestId('counter-dec').click()
    await expect(page.getByTestId('counter-value')).toHaveText('Count: 1')
  })

  test('counter works after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('counter-inc').click()
    await page.getByTestId('counter-inc').click()
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('counter-value')).toHaveText('カウント: 2')
    await page.getByTestId('counter-inc').click()
    await expect(page.getByTestId('counter-value')).toHaveText('カウント: 3')
  })
})
