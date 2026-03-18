import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = resolve(__dirname, 'fixtures/solid-splitting')
const DIST_DIR = resolve(FIXTURE_DIR, 'dist')
const ASSETS_DIR = resolve(DIST_DIR, 'assets')

test.describe('Build output verification', () => {
  test('keeps the default locale in the entry chunk and emits lazy locale assets', () => {
    const files = readdirSync(ASSETS_DIR)

    expect(files.find((file) => file.startsWith('en-') && file.endsWith('.js'))).toBeUndefined()
    expect(files.find((file) => file.startsWith('ja-') && file.endsWith('.js'))).toBeDefined()
  })

  test('main bundle references catalog hashes instead of raw t() calls', () => {
    const files = readdirSync(ASSETS_DIR)
    const indexChunk = files.find((file) => file.startsWith('index-') && file.endsWith('.js'))!
    const code = readFileSync(resolve(ASSETS_DIR, indexChunk), 'utf-8')

    expect(code).toContain('1kjapm1')
    expect(code).toContain('yvn7bx')
    expect(code).toContain('147gn91')
    expect(code).not.toMatch(/\bt\(\s*['"`]Welcome to Fluenti/)
  })
})

test.describe('Solid splitting — runtime', () => {
  test('renders English copy by default', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('switch-label')).toContainText('Switch Language')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('greeting')).toContainText('Hello, World!')
    await expect(page.getByTestId('plural')).toContainText('2 items')
    await expect(page.getByTestId('select')).toContainText('Administrator')
  })

  test('switches to Japanese and loads the locale chunk on demand', async ({ page }) => {
    const loadedChunks: string[] = []

    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('/assets/') && url.endsWith('.js')) {
        loadedChunks.push(url.split('/').pop()!)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()

    await expect(page.getByTestId('switch-label')).toContainText('言語を切り替え')
    await expect(page.getByTestId('welcome')).toContainText('Fluentiへようこそ')
    await expect(page.getByTestId('greeting')).toContainText('こんにちは、Worldさん！')
    await expect(page.getByTestId('plural')).toContainText('2 件')
    await expect(page.getByTestId('select')).toContainText('管理者')

    expect(loadedChunks.some((file) => file.startsWith('ja-'))).toBe(true)
  })
})
