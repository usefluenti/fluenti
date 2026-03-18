import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = resolve(__dirname, 'fixtures/react-splitting')
const DIST_DIR = resolve(FIXTURE_DIR, 'dist')
const ASSETS_DIR = resolve(DIST_DIR, 'assets')

// ─── Build output verification ──────────────────────────────────────────────

test.describe('Build output verification', () => {
  test('produces separate route chunks for lazy-loaded pages', () => {
    const files = readdirSync(ASSETS_DIR)

    const homeChunk = files.find((f) => f.startsWith('Home-') && f.endsWith('.js'))
    const aboutChunk = files.find((f) => f.startsWith('About-') && f.endsWith('.js'))

    expect(homeChunk).toBeDefined()
    expect(aboutChunk).toBeDefined()
  })

  test('route chunks contain catalog hash references, not $t() calls', () => {
    const files = readdirSync(ASSETS_DIR)
    const homeChunk = files.find((f) => f.startsWith('Home-') && f.endsWith('.js'))!
    const aboutChunk = files.find((f) => f.startsWith('About-') && f.endsWith('.js'))!

    const homeCode = readFileSync(resolve(ASSETS_DIR, homeChunk), 'utf-8')
    const aboutCode = readFileSync(resolve(ASSETS_DIR, aboutChunk), 'utf-8')

    // Home page should reference catalog hashes (not raw $t calls)
    expect(homeCode).toContain('1kjapm1') // "Welcome to Fluenti"
    expect(homeCode).toContain('1wavrgs') // "This is the home page."
    expect(homeCode).toContain('yvn7bx')  // "Hello, {name}!"
    expect(homeCode).not.toMatch(/\$t\s*\(\s*['"`]Welcome/)

    // About page should reference different hashes
    expect(aboutCode).toContain('1rfbb9t') // "About our project"
    expect(aboutCode).toContain('1r2eyjs') // "Learn more about Fluenti."
    expect(aboutCode).toContain('8ihuw0')  // "Contact us at {email}"
    expect(aboutCode).not.toMatch(/\$t\s*\(\s*['"`]About our/)
  })

  test('main bundle contains shared nav label hashes', () => {
    const files = readdirSync(ASSETS_DIR)
    const indexChunk = files.find((f) => f.startsWith('index-') && f.endsWith('.js'))!
    const indexCode = readFileSync(resolve(ASSETS_DIR, indexChunk), 'utf-8')

    // Nav labels from App.tsx are in the main chunk
    expect(indexCode).toContain('n0mxf2') // "Home"
    expect(indexCode).toContain('onrqou') // "About"
  })

  test('home and about chunks reference different messages', () => {
    const files = readdirSync(ASSETS_DIR)
    const homeChunk = files.find((f) => f.startsWith('Home-') && f.endsWith('.js'))!
    const aboutChunk = files.find((f) => f.startsWith('About-') && f.endsWith('.js'))!

    const homeCode = readFileSync(resolve(ASSETS_DIR, homeChunk), 'utf-8')
    const aboutCode = readFileSync(resolve(ASSETS_DIR, aboutChunk), 'utf-8')

    // Home-specific messages should NOT be in About chunk
    expect(aboutCode).not.toContain('1kjapm1') // "Welcome to Fluenti"
    expect(aboutCode).not.toContain('1wavrgs') // "This is the home page."

    // About-specific messages should NOT be in Home chunk
    expect(homeCode).not.toContain('1rfbb9t') // "About our project"
    expect(homeCode).not.toContain('1r2eyjs') // "Learn more about Fluenti."
  })

  test('compiled locale catalogs are separate chunks', () => {
    const files = readdirSync(ASSETS_DIR)

    // Default locale stays in the initial graph; only non-default locales are lazy chunks
    const enChunk = files.find((f) => f.startsWith('en-') && f.endsWith('.js'))
    expect(enChunk).toBeUndefined()

    // Japanese locale should be emitted as a separate dynamically loaded chunk
    const jaChunk = files.find((f) => f.startsWith('ja-') && f.endsWith('.js'))
    expect(jaChunk).toBeDefined()
  })
})

// ─── Runtime rendering tests ────────────────────────────────────────────────

test.describe('React splitting — runtime', () => {
  test('renders home page with English translations', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('home-desc')).toContainText('This is the home page.')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
  })

  test('renders nav labels from shared messages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('nav-home')).toContainText('Home')
    await expect(page.getByTestId('nav-about')).toContainText('About')
  })

  test('navigates to about page and renders its translations', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-title')).toContainText('About our project')
    await expect(page.getByTestId('about-desc')).toContainText('Learn more about Fluenti.')
    await expect(page.getByTestId('contact')).toContainText('Contact us at hello@fluenti.dev')
  })

  test('navigates back to home page after visiting about', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('about-title')).toContainText('About our project')

    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('home and about are separate route chunks loaded independently', async ({ page }) => {
    const loadedChunks: string[] = []

    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('/assets/') && url.endsWith('.js')) {
        const filename = url.split('/').pop()!
        loadedChunks.push(filename)
      }
    })

    // Load home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Home chunk should be loaded
    const homeLoaded = loadedChunks.some((f) => f.startsWith('Home-'))
    expect(homeLoaded).toBe(true)

    // Navigate to About and verify it renders
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-title')).toContainText('About our project')

    // About chunk should now be loaded (either on navigation or via prefetch)
    const aboutLoaded = loadedChunks.some((f) => f.startsWith('About-'))
    expect(aboutLoaded).toBe(true)
  })

  test('locale switching loads Japanese catalog dynamically', async ({ page }) => {
    const loadedChunks: string[] = []

    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('/assets/') && url.endsWith('.js')) {
        loadedChunks.push(url.split('/').pop()!)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')

    // Switch to Japanese
    await page.getByTestId('lang-ja').click()

    // Japanese translations should be loaded
    await expect(page.getByTestId('welcome')).toContainText('Fluentiへようこそ')
    await expect(page.getByTestId('home-desc')).toContainText('これはホームページです。')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')

    // Japanese locale chunk should have been fetched
    const jaLoaded = loadedChunks.some((f) => f.startsWith('ja-'))
    expect(jaLoaded).toBe(true)
  })

  test('locale switching updates nav labels', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('nav-home')).toContainText('Home')

    await page.getByTestId('lang-ja').click()

    await expect(page.getByTestId('nav-home')).toContainText('ホーム')
    await expect(page.getByTestId('nav-about')).toContainText('概要')
  })

  test('locale switching works on about page', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('about-title')).toContainText('About our project')

    await page.getByTestId('lang-ja').click()

    await expect(page.getByTestId('about-title')).toContainText('プロジェクトについて')
    await expect(page.getByTestId('about-desc')).toContainText('Fluentiの詳細をご覧ください。')
  })

  test('switching back to English is instant (cached)', async ({ page }) => {
    await page.goto('/')

    // Switch to Japanese
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluentiへようこそ')

    // Track network requests after switching back
    const requestsAfterSwitch: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/assets/') && req.url().endsWith('.js')) {
        requestsAfterSwitch.push(req.url())
      }
    })

    // Switch back to English
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')

    // No additional chunk requests should be made (English is the default locale, already loaded)
    expect(requestsAfterSwitch.filter((u) => u.includes('/en-'))).toHaveLength(0)
  })

  test('locale switching persists across route navigation', async ({ page }) => {
    await page.goto('/')

    // Switch to Japanese
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('nav-home')).toContainText('ホーム')

    // Navigate to About — should still be in Japanese
    await page.getByTestId('nav-about').click()
    await expect(page.getByTestId('about-title')).toContainText('プロジェクトについて')

    // Navigate back to Home — should still be in Japanese
    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('welcome')).toContainText('Fluentiへようこそ')
  })
})
