import { test, expect } from '@playwright/test'

test.describe('Next.js Multi-Layout — Route Group Isolation', () => {
  test('marketing layout renders on home page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('layout-marketing')).toBeVisible()
    await expect(page.getByTestId('marketing-nav-title')).toContainText('Marketing')
    await expect(page.getByTestId('page-title')).toContainText('Welcome')
  })

  test('dashboard layout renders on dashboard page', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('layout-dashboard')).toBeVisible()
    await expect(page.getByTestId('dashboard-nav-title')).toContainText('Dashboard')
    await expect(page.getByTestId('dashboard-title')).toContainText('Dashboard Overview')
  })

  test('dashboard layout renders on settings page', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByTestId('layout-dashboard')).toBeVisible()
    await expect(page.getByTestId('settings-title')).toContainText('Settings')
  })

  test('Japanese locale works in marketing layout', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5201' },
    ])
    await page.goto('/')
    await expect(page.getByTestId('marketing-nav-title')).toContainText('マーケティング')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })

  test('Japanese locale works in dashboard layout', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5201' },
    ])
    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-nav-title')).toContainText('ダッシュボード')
    await expect(page.getByTestId('dashboard-title')).toContainText('ダッシュボード概要')
  })

  test('locale is consistent across different route groups', async ({ page }) => {
    await page.context().addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5201' },
    ])

    // Visit marketing layout
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')

    // Navigate to dashboard layout
    await page.goto('/dashboard')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('dashboard-title')).toContainText('ダッシュボード概要')

    // Navigate to settings (same dashboard layout)
    await page.goto('/settings')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('settings-title')).toContainText('設定')
  })

  test('concurrent requests to different layouts with different locales', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', url: 'http://localhost:5201' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    // User A: English, marketing layout
    // User B: Japanese, dashboard layout
    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/dashboard'),
    ])

    await expect(pageEn.getByTestId('marketing-nav-title')).toContainText('Marketing')
    await expect(pageEn.getByTestId('page-title')).toContainText('Welcome')

    await expect(pageJa.getByTestId('dashboard-nav-title')).toContainText('ダッシュボード')
    await expect(pageJa.getByTestId('dashboard-title')).toContainText('ダッシュボード概要')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })

  test('SSR HTML contains translated layout content', async ({ page }) => {
    // Verify marketing layout SSR
    const marketingHtml = await page.request.get('/')
    expect(await marketingHtml.text()).toContain('Marketing')
    expect(await marketingHtml.text()).toContain('Welcome')

    // Verify dashboard layout SSR
    const dashboardHtml = await page.request.get('/dashboard')
    expect(await dashboardHtml.text()).toContain('Dashboard')
  })
})
