import { test, expect } from '@playwright/test'

test.describe('Nuxt SSG — Static Pre-rendered Content', () => {
  test('home page (en) is pre-rendered with correct content', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
    await expect(page.getByTestId('page-description')).toContainText('This is the home page')
    await expect(page.getByTestId('current-locale')).toContainText('en')
  })

  test('Japanese home page is pre-rendered at /ja', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await expect(page.getByTestId('page-description')).toContainText('これはホームページです')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('Chinese home page is pre-rendered at /zh', async ({ page }) => {
    await page.goto('/zh')
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')
    await expect(page.getByTestId('page-description')).toContainText('这是首页')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
  })

  test('about page (en) is pre-rendered at /about', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
    await expect(page.getByTestId('page-description')).toContainText('Learn more about our project')
  })

  test('Japanese about page is pre-rendered at /ja/about', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
    await expect(page.getByTestId('page-description')).toContainText('プロジェクトの詳細')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('Chinese about page is pre-rendered at /zh/about', async ({ page }) => {
    await page.goto('/zh/about')
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('关于我们')
    await expect(page.getByTestId('page-description')).toContainText('了解更多')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
  })
})

test.describe('Nuxt SSG — Client-side Navigation', () => {
  test('navigates from home to about without full reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-home')).toBeVisible()

    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('page-about')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
    await expect(page.getByTestId('current-path')).toContainText('/about')
  })

  test('navigates from about back to home', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('page-about')).toBeVisible()

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('page-home')).toBeVisible()
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')
  })
})

test.describe('Nuxt SSG — Locale Switching', () => {
  test('switches from en to ja via locale switcher', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('page-title')).toContainText('Welcome Home')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
    await expect(page.getByTestId('page-title')).toContainText('ようこそ')
    await expect(page.getByTestId('current-path')).toContainText('/ja')
  })

  test('switches from en to zh via locale switcher', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('欢迎回家')
    await expect(page.getByTestId('current-path')).toContainText('/zh')
  })

  test('round-trip locale switching preserves page: en → ja → zh → en', async ({ page }) => {
    await page.goto('/')

    // Navigate to about first
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('page-title')).toContainText('About Us')

    // Switch to ja
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('page-title')).toContainText('私たちについて')
    await expect(page.getByTestId('current-path')).toContainText('/ja/about')

    // Switch to zh
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('page-title')).toContainText('关于我们')
    await expect(page.getByTestId('current-path')).toContainText('/zh/about')

    // Switch back to en
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('page-title')).toContainText('About Us')
    await expect(page.getByTestId('current-path')).toContainText('/about')
  })
})

test.describe('Nuxt SSG — SEO Head Data', () => {
  test('html lang reflects current locale', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('html-lang')).toContainText('en')

    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('html-lang')).toContainText('ja')
  })

  test('hreflang links are generated for all locales on home', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('hreflang-en')).toContainText('https://example.com/')
    await expect(page.getByTestId('hreflang-ja')).toContainText('https://example.com/ja')
    await expect(page.getByTestId('hreflang-zh')).toContainText('https://example.com/zh')
    await expect(page.getByTestId('hreflang-x-default')).toContainText('https://example.com/')
  })

  test('hreflang updates on subpage navigation', async ({ page }) => {
    await page.goto('/ja/about')
    await expect(page.getByTestId('hreflang-en')).toContainText('https://example.com/about')
    await expect(page.getByTestId('hreflang-ja')).toContainText('https://example.com/ja/about')
    await expect(page.getByTestId('hreflang-zh')).toContainText('https://example.com/zh/about')
  })
})

test.describe('Nuxt SSG — Path-based Locale Detection', () => {
  test('default locale has no prefix', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('current-locale')).toContainText('en')
    await expect(page.getByTestId('current-path')).toContainText('/')
  })

  test('direct navigation to /ja detects Japanese locale', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('direct navigation to /zh/about detects Chinese locale', async ({ page }) => {
    await page.goto('/zh/about')
    await expect(page.getByTestId('current-locale')).toContainText('zh')
    await expect(page.getByTestId('page-title')).toContainText('关于我们')
  })
})

test.describe('Nuxt SSG — Cookie Locale Persistence', () => {
  test('locale switch sets cookie', async ({ page, context }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    const cookies = await context.cookies()
    const localeCookie = cookies.find(c => c.name === 'fluenti_locale')
    expect(localeCookie).toBeDefined()
    expect(localeCookie!.value).toBe('ja')
  })

  test('cookie updates on subsequent locale switches', async ({ page, context }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('current-locale')).toContainText('zh')

    const cookies = await context.cookies()
    const localeCookie = cookies.find(c => c.name === 'fluenti_locale')
    expect(localeCookie!.value).toBe('zh')
  })
})
