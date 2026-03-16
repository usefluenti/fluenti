import { test, expect } from '@playwright/test'

test.describe('vue-i18n Bridge — Coexistence', () => {
  test('renders title from vue-i18n (legacy) messages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('title')).toContainText('Bridge Demo App')
  })

  test('renders legacy vue-i18n greeting', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('legacy-greeting')).toContainText('Hello from vue-i18n!')
  })

  test('renders legacy vue-i18n message with interpolation', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('legacy-farewell')).toContainText('Goodbye from vue-i18n, Alice!')
  })

  test('renders new fluenti message', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('new-welcome')).toContainText('Welcome to Fluenti!')
  })

  test('renders fluenti message with ICU interpolation', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('new-user')).toContainText('Current user: Alice')
  })

  test('renders fluenti ICU plural (zero)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('new-count')).toContainText('No messages')
  })

  test('renders fluenti ICU select', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('new-role')).toContainText('Administrator')
  })
})

test.describe('vue-i18n Bridge — Locale Sync', () => {
  test('switching locale updates both legacy and new messages', async ({ page }) => {
    await page.goto('/')

    // Switch to Japanese
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    // Legacy messages should be in Japanese
    await expect(page.getByTestId('legacy-greeting')).toContainText('vue-i18nからこんにちは')
    await expect(page.getByTestId('title')).toContainText('ブリッジデモアプリ')

    // New fluenti messages should also be in Japanese
    await expect(page.getByTestId('new-welcome')).toContainText('Fluentiへようこそ')
  })

  test('switching back to English restores all messages', async ({ page }) => {
    await page.goto('/')

    // Switch to Japanese then back to English
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('current-locale')).toContainText('en')

    // Both should be back in English
    await expect(page.getByTestId('legacy-greeting')).toContainText('Hello from vue-i18n!')
    await expect(page.getByTestId('new-welcome')).toContainText('Welcome to Fluenti!')
  })
})

test.describe('vue-i18n Bridge — tc() Plurals', () => {
  test('tc() handles legacy pipe-separated plurals at count 0', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('tc-result')).toContainText('no items')
  })

  test('tc() increments and shows singular form', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('count-inc').click()
    await expect(page.getByTestId('tc-result')).toContainText('one item')
  })

  test('tc() shows plural form at count 2+', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('count-inc').click()
    await page.getByTestId('count-inc').click()
    await expect(page.getByTestId('count-value')).toContainText('2')
    await expect(page.getByTestId('tc-result')).toContainText('2 items')
  })
})

test.describe('vue-i18n Bridge — te() Existence Check', () => {
  test('te() returns true for fluenti keys', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('te-fluenti')).toContainText('true')
  })

  test('te() returns true for vue-i18n keys', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('te-legacy')).toContainText('true')
  })

  test('te() returns false for missing keys', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('te-missing')).toContainText('false')
  })
})

test.describe('vue-i18n Bridge — Available Locales', () => {
  test('shows merged locales from both libraries', async ({ page }) => {
    await page.goto('/')
    const text = await page.getByTestId('available-locales').textContent()
    expect(text).toContain('en')
    expect(text).toContain('ja')
  })
})

test.describe('vue-i18n Bridge — ICU Select with Locale Switch', () => {
  test('changing role updates select output', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('role-display')).toContainText('Administrator')

    await page.getByTestId('role-select').selectOption('editor')
    await expect(page.getByTestId('role-display')).toContainText('Editor')

    await page.getByTestId('role-select').selectOption('viewer')
    await expect(page.getByTestId('role-display')).toContainText('Viewer')
  })

  test('role select updates correctly after locale switch', async ({ page }) => {
    await page.goto('/')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('role-display')).toContainText('管理者')

    await page.getByTestId('role-select').selectOption('editor')
    await expect(page.getByTestId('role-display')).toContainText('編集者')
  })
})
