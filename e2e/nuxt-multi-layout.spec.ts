import { test, expect } from '@playwright/test'

test.describe('Nuxt Multi-Layout — Layout Isolation', () => {
  test('home page uses default layout', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('layout-default')).toBeVisible()
    await expect(page.getByTestId('layout-name')).toContainText('default')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })

  test('admin page uses admin layout', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByTestId('layout-admin')).toBeVisible()
    await expect(page.getByTestId('layout-name')).toContainText('admin')
    await expect(page.getByTestId('admin-title')).toContainText('Admin Panel')
  })

  test('locale is consistent across layout switch (default → admin)', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')

    // Navigate to admin (different layout)
    await page.goto('/ja/admin')
    await expect(page.getByTestId('layout-admin')).toBeVisible()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('admin-title')).toContainText('管理パネル')
  })

  test('locale is consistent across layout switch (admin → default)', async ({ page }) => {
    await page.goto('/ja/admin')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('admin-title')).toContainText('管理パネル')

    await page.goto('/ja')
    await expect(page.getByTestId('layout-default')).toBeVisible()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })

  test('concurrent users see correct locale in different layouts', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    // User A visits home (default layout, en)
    // User B visits admin (admin layout, ja)
    await Promise.all([
      pageEn.goto('/'),
      pageJa.goto('/ja/admin'),
    ])

    await expect(pageEn.getByTestId('layout-default')).toBeVisible()
    await expect(pageEn.getByTestId('page-title')).toContainText('Welcome Home')

    await expect(pageJa.getByTestId('layout-admin')).toBeVisible()
    await expect(pageJa.getByTestId('admin-title')).toContainText('管理パネル')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })

  test('SSR HTML contains correct translations per layout and locale', async ({ page }) => {
    const defaultHtml = await page.request.get('/')
    expect(await defaultHtml.text()).toContain('Welcome Home')

    const adminHtml = await page.request.get('/ja/admin')
    expect(await adminHtml.text()).toContain('管理パネル')
  })
})
