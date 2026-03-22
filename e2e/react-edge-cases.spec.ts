import { test, expect } from '@playwright/test'

test.describe('React Edge Cases — P0 Coverage', () => {
  // ---------- P0.1: Plural rules ----------

  test('English plurals: zero form (0)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('plural-0')).toContainText('Your cart is empty')
  })

  test('English plurals: one form (1)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('plural-1')).toContainText('You have 1 item')
  })

  test('English plurals: other form (2)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('plural-2')).toContainText('You have 2 items')
  })

  test('English plurals: other form (100)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('plural-100')).toContainText('You have 100 items')
  })

  // ---------- P0.1: Arabic plural rules (all 6 forms) ----------

  test('Arabic plurals: zero form (0)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.getByTestId('arabic-0')).toContainText('لا عناصر')
  })

  test('Arabic plurals: one form (1)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.getByTestId('arabic-1')).toContainText('عنصر واحد')
  })

  test('Arabic plurals: two form (2)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.getByTestId('arabic-2')).toContainText('عنصران')
  })

  test('Arabic plurals: few form (3)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.getByTestId('arabic-3')).toContainText('3 عناصر')
  })

  test('Arabic plurals: many form (11)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.getByTestId('arabic-11')).toContainText('11 عنصراً')
  })

  test('Arabic plurals: other form (100)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.getByTestId('arabic-100')).toContainText('100 عنصر')
  })

  // ---------- P0.2: Nested select + interpolation ----------

  test('nested select+plural: male with 1 gift', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('select-male-1')).toContainText('He bought 1 gift')
  })

  test('nested select+plural: female with 3 gifts', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('select-female-3')).toContainText('She bought 3 gifts')
  })

  test('nested select+plural: other with 5 gifts', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('select-other-5')).toContainText('They bought 5 gifts')
  })

  // ---------- P0.3: Missing translation handling ----------

  test('missing key renders key itself', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('missing-key')).toContainText('this.key.does.not.exist')
  })

  test('te() returns true for existing key', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('te-exists')).toContainText('true')
  })

  test('te() returns false for missing key', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('te-missing')).toContainText('false')
  })

  test('fallback locale used when ja translation missing', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('fallback-test')).toContainText('English fallback')
  })

  // ---------- P0.4: Currency and percent formatting ----------

  test('currency formatting shows $ symbol', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('currency-usd')).toContainText('$')
    await expect(page.getByTestId('currency-usd')).toContainText('1,234.56')
  })

  test('percent formatting shows %', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('percent')).toContainText('75%')
  })

  // ---------- P0.6: Concurrent locale switches ----------

  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 10; i++) {
      await page.getByTestId(i % 2 === 0 ? 'lang-ja' : 'lang-en').click()
    }
    // Final click was lang-en (i=9, 9%2=1, so lang-en)
    await expect(page.getByTestId('plural-1')).toContainText('You have 1 item')
  })

  // ---------- P1: Edge cases ----------

  test('empty string translation renders empty', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('empty-string')).toHaveText('')
  })

  test('long message renders completely', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('long-message')).toContainText(
      'This is a very long message that contains more than two hundred characters',
    )
    await expect(page.getByTestId('long-message')).toContainText('rendering pipeline')
  })

  test('special characters are escaped properly', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('special-chars')).toContainText('"hello"')
    await expect(page.getByTestId('special-chars')).toContainText('&')
  })

  // ---------- P1.7: RTL ----------

  test('Arabic locale sets dir=rtl', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('switching back to English sets dir=ltr', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ar').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.getByTestId('lang-en').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  // ---------- Japanese locale tests ----------

  test('Japanese plurals use other form for all counts', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('plural-1')).toContainText('カートに1個の商品')
    await expect(page.getByTestId('plural-5')).toContainText('カートに5個の商品')
  })

  test('Japanese nested select: male', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('select-male-1')).toContainText('彼は1個のギフトを買った')
  })
})
