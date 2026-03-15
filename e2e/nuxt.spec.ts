import { test, expect } from '@playwright/test'

test.describe('Nuxt Playground (SSR)', () => {
  test('renders server-side translated content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
    await expect(page.locator('header p')).toContainText('Server-rendered i18n with Nuxt 3 and Fluenti')
  })

  test('renders homepage with v-t directive and $t() interpolation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()
    await expect(page.locator('text=Hello, World!')).toBeVisible()
    await expect(page.locator('text=Current locale: en')).toBeVisible()
    await expect(page.locator('text=You have 5 items in your cart.')).toBeVisible()
  })

  test('$d() date formatting renders output', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=$d() — Date Formatting')).toBeVisible()
    const dateSection = page.locator('.demo-label:has-text("$d(Date.now())") + div')
    await expect(dateSection).not.toBeEmpty()
  })

  test('$n() number formatting renders locale-aware numbers', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=1,234,567.89').first()).toBeVisible()
  })

  test('locale switching updates all translations to Japanese', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const jaButton = page.locator('header button:has-text("日本語")')
    await expect(jaButton).toBeVisible()
    await jaButton.click()
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await expect(page.locator('h2:has-text("Fluenti へようこそ")')).toBeVisible()
  })

  test('SSR hydration preserves locale from cookie', async ({ page, context }) => {
    await context.addCookies([
      { name: 'fluenti_locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
    await context.clearCookies()
  })

  test('rich text page renders correctly with SSR', async ({ page }) => {
    await page.goto('/rich-text')
    await page.waitForLoadState('networkidle')
    const docLink = page.locator('a[href="https://github.com"][target="_blank"]')
    await expect(docLink).toBeVisible()
    await expect(docLink).toContainText('documentation')
    await expect(page.locator('strong:has-text("important")').first()).toBeVisible()
  })

  test('plurals page works with SSR', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=No apples').first()).toBeVisible()

    const addButtons = page.locator('button:has-text("Add")')
    await addButtons.first().click()
    await expect(page.locator('text=1 apple').first()).toBeVisible()

    await addButtons.first().click()
    await expect(page.locator('text=2 apples')).toBeVisible()
  })

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()

    await page.locator('nav a[href="/rich-text"]').click()
    await expect(page.locator('h2:has-text("Rich Text Demos")')).toBeVisible()

    await page.locator('nav a[href="/plurals"]').click()
    await expect(page.locator('h2:has-text("Plural Demos")')).toBeVisible()

    await page.locator('nav a[href="/"]').click()
    await expect(page.locator('h2:has-text("Welcome to Fluenti")')).toBeVisible()
  })

  test('footer renders attribution text', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('footer')).toContainText('Built with Fluenti and Nuxt 3')
  })

  test('features list is rendered on homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Server-side rendering')).toBeVisible()
    await expect(page.locator('text=Locale detection from cookies')).toBeVisible()
    await expect(page.locator('text=Hydration without flash')).toBeVisible()
    await expect(page.locator('text=Reactive locale switching')).toBeVisible()
  })
})
