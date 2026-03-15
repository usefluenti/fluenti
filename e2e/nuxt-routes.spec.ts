import { test, expect } from '@playwright/test'

test.describe('Nuxt Routes — Default Locale (no prefix)', () => {
  test('renders home page at root path', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('current-path')).toContainText('/')
  })

  test('navigates to /about without locale prefix', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
    await expect(page.getByTestId('current-path')).toContainText('/about')
  })

  test('navigates to /contact without locale prefix', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-contact').click()
    await expect(page.getByTestId('page-contact')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('Contact Us')
  })
})

test.describe('Nuxt Routes — Locale Prefix Navigation', () => {
  test('switches to Japanese and navigates to /ja prefixed routes', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()

    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('current-path')).toContainText('/ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
  })

  test('nav links update to prefixed paths after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()

    // Nav links should now point to /ja/about, /ja/contact
    const aboutLink = page.getByTestId('nav-about')
    await expect(aboutLink).toHaveAttribute('href', '/ja/about')

    await aboutLink.click()
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
    await expect(page.getByTestId('current-path')).toContainText('/ja/about')
  })

  test('switches to Chinese and renders zh-prefixed content', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()

    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('欢迎')
  })

  test('direct navigation to /ja/about renders Japanese', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('direct navigation to /zh/contact renders Chinese', async ({ page }) => {
    await page.goto('/zh/contact')
    await expect(page.getByTestId('page-contact')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('联系我们')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
  })
})

test.describe('Nuxt Routes — Switch Locale Paths', () => {
  test('shows correct switch paths from home (default locale)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('switch-en')).toContainText('/')
    await expect(page.getByTestId('switch-ja')).toContainText('/ja')
    await expect(page.getByTestId('switch-zh')).toContainText('/zh')
  })

  test('shows correct switch paths from /ja/about', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('switch-en')).toContainText('/about')
    await expect(page.getByTestId('switch-ja')).toContainText('/ja/about')
    await expect(page.getByTestId('switch-zh')).toContainText('/zh/about')
  })
})

test.describe('Nuxt Routes — SEO Head Data', () => {
  test('html lang reflects current locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('html-lang')).toContainText('en')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('html-lang')).toContainText('ja')
  })

  test('hreflang links are generated for all locales', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('hreflang-en')).toContainText('https://example.com/')
    await expect(page.getByTestId('hreflang-ja')).toContainText('https://example.com/ja')
    await expect(page.getByTestId('hreflang-zh')).toContainText('https://example.com/zh')
    await expect(page.getByTestId('hreflang-x-default')).toContainText('https://example.com/')
  })

  test('hreflang updates when navigating to a subpage', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('hreflang-en')).toContainText('https://example.com/about')
    await expect(page.getByTestId('hreflang-ja')).toContainText('https://example.com/ja/about')
    await expect(page.getByTestId('hreflang-zh')).toContainText('https://example.com/zh/about')
  })

  test('og:locale reflects current locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('og-locale')).toContainText('en')

    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('og-locale')).toContainText('zh')
  })
})

test.describe('Nuxt Routes — Round-trip Locale Switching', () => {
  test('switching en -> ja -> zh -> en preserves page content', async ({ page }) => {
    await page.goto('/')

    // Start on home, en
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')

    // Navigate to about
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('page-title')).toContainText('About Us')

    // Switch to ja
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')

    // Switch to zh
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('page-title')).toContainText('关于我们')

    // Switch back to en
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
  })
})
