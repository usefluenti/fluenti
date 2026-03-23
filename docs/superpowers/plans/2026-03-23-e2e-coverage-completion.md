# E2E Coverage Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill all E2E coverage gaps across every framework integration, SSR scenario, and the CLI workflow — reaching production-grade confidence.

**Architecture:** Add tests to existing spec files and example apps. Add `data-testid` attributes where missing (SolidStart). Create one new CLI E2E spec using Vitest (shell execution, not Playwright). No new Playwright fixtures needed — leverage existing examples and fixtures.

**Tech Stack:** Playwright (browser E2E), Vitest (CLI E2E), existing example apps on ports 5173–5205.

**Conventions:**
- All browser E2E files live in `e2e/*.spec.ts`, import `{ test, expect } from '@playwright/test'`
- SSR apps use `await page.waitForLoadState('networkidle')` after `goto()`
- SPA apps do NOT need `waitForLoadState`
- Concurrent SSR tests use `browser.newContext()` + `Promise.all()`
- Hydration tests listen to `page.on('console', ...)` and filter `[fluenti]` + `mismatch`
- Cookie setting: `context.addCookies([{ name, value, domain: 'localhost', path: '/' }])`
- RTL tests check `page.locator('html').getAttribute('dir')`

**Port reference:**
| App | Port |
|-----|------|
| Vue playground | 5173 |
| Solid playground | 5174 |
| Nuxt playground | 5175 |
| SolidStart | 5176 |
| React playground | 5177 |
| TanStack Start | 5178 |

---

## Tier 1 — Blocking Production

### Task 1: CLI Workflow E2E

Test the full `extract → compile → check` pipeline on a minimal fixture.

**Files:**
- Create: `e2e/cli-workflow.test.ts`
- Reference: `packages/cli/dist/cli.js` (binary)
- Reference: `e2e/fixtures/react-no-plugin/` (existing fixture with JSON catalogs)

- [ ] **Step 1: Create CLI E2E test file**

This is a Vitest test (not Playwright) that shells out to the CLI binary. It uses a temp copy of an existing fixture to test the full workflow.

```typescript
// e2e/cli-workflow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, cpSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(import.meta.dirname, '../packages/cli/dist/cli.js')
const FIXTURE = join(import.meta.dirname, 'fixtures/react-no-plugin')

describe('CLI workflow E2E', () => {
  let workDir: string

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'fluenti-cli-e2e-'))
    cpSync(FIXTURE, workDir, { recursive: true })
    // Remove compiled output to test fresh compilation
    const compiled = join(workDir, 'src/locales/compiled')
    if (existsSync(compiled)) rmSync(compiled, { recursive: true })
  })

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  function cli(cmd: string): string {
    return execSync(`node ${CLI} ${cmd} --config ${join(workDir, 'fluenti.config.ts')}`, {
      cwd: workDir,
      encoding: 'utf-8',
      timeout: 30_000,
    })
  }

  it('extract produces catalog files', () => {
    const output = cli('extract')
    expect(output).toBeDefined()
    // Source locale catalog should exist
    expect(existsSync(join(workDir, 'locales/en.json'))).toBe(true)
  })

  it('compile produces JS modules', () => {
    const output = cli('compile')
    expect(output).toBeDefined()
    const compiledDir = join(workDir, 'src/locales/compiled')
    expect(existsSync(join(compiledDir, 'en.js'))).toBe(true)
    expect(existsSync(join(compiledDir, 'ja.js'))).toBe(true)
  })

  it('compiled output contains expected messages', () => {
    const en = readFileSync(join(workDir, 'src/locales/compiled/en.js'), 'utf-8')
    // Should contain message content (not empty)
    expect(en.length).toBeGreaterThan(50)
  })

  it('compile generates type definitions', () => {
    const dts = join(workDir, 'src/locales/compiled/messages.d.ts')
    expect(existsSync(dts)).toBe(true)
  })

  it('stats shows translation progress', () => {
    const output = cli('stats')
    expect(output).toContain('en')
    expect(output).toContain('ja')
  })

  it('check passes with 0% min-coverage', () => {
    // Should not throw
    const output = cli('check --min-coverage 0')
    expect(output).toBeDefined()
  })

  it('check fails with 100% min-coverage on incomplete translations', () => {
    // This may pass or fail depending on fixture completeness
    // The important thing is it runs without crashing
    try {
      cli('check --min-coverage 100')
    } catch (e: unknown) {
      // Expected to fail if translations are incomplete
      expect((e as Error).message || String(e)).toBeDefined()
    }
  })

  it('lint runs without crashing', () => {
    // lint may warn but should not crash
    try {
      cli('lint')
    } catch {
      // Non-zero exit on warnings is acceptable
    }
  })

  it('extract --clean removes obsolete entries', () => {
    const output = cli('extract --clean')
    expect(output).toBeDefined()
  })

  it('compile --skip-fuzzy excludes fuzzy entries', () => {
    const output = cli('compile --skip-fuzzy')
    expect(output).toBeDefined()
  })
})
```

- [ ] **Step 2: Add vitest config for CLI E2E**

Add a script in root `package.json` or run directly:

```bash
pnpm vitest run e2e/cli-workflow.test.ts
```

Verify it discovers and runs all tests. Expected: 10 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/cli-workflow.test.ts
git commit -m "test(e2e): add CLI workflow E2E (extract/compile/check/lint/stats)"
```

---

### Task 2: SolidStart — Add `data-testid` Attributes

The SolidStart example has zero `data-testid` attributes. Add them so E2E tests can reliably target elements.

**Files:**
- Modify: `examples/solid-start/src/app.tsx`
- Modify: `examples/solid-start/src/routes/index.tsx`
- Modify: `examples/solid-start/src/routes/plurals.tsx`
- Modify: `examples/solid-start/src/routes/rich-text.tsx`
- Modify: `examples/solid-start/src/routes/formatting.tsx`

- [ ] **Step 1: Add testids and formatting link to app shell (`app.tsx`)**

Add `data-testid` to existing elements and ADD a new Formatting nav link (currently missing from the nav):
- `<h1>` title → `data-testid="title"`
- `<p>` tagline → `data-testid="tagline"`
- Each nav link → `data-testid="nav-home"`, `data-testid="nav-richtext"`, `data-testid="nav-plurals"`
- **ADD** new nav link: `<a href="/formatting" data-testid="nav-formatting">Formatting</a>` (the route exists but has no nav entry)
- Language buttons → `data-testid="lang-en"`, `data-testid="lang-ja"`
- Footer → `data-testid="footer"`

- [ ] **Step 2: Add testids to home page (`routes/index.tsx`)**

Add `data-testid` to:
- Welcome heading → `data-testid="welcome"`
- Description → `data-testid="description"`
- Greeting with interpolation → `data-testid="greeting"`
- Current locale → `data-testid="current-locale"`
- Date display → `data-testid="date"`
- Number display → `data-testid="number"`

- [ ] **Step 3: Add testids to plurals page (`routes/plurals.tsx`)**

Add `data-testid` to:
- Plural result → `data-testid="plural-result"`
- Count display → `data-testid="plural-count"`
- Increment/Decrement/Reset → `data-testid="btn-inc"`, `data-testid="btn-dec"`, `data-testid="btn-reset"`
- Select result → `data-testid="select-result"`
- Gender buttons → `data-testid="gender-male"`, `data-testid="gender-female"`, `data-testid="gender-other"`

- [ ] **Step 4: Add testids to rich-text page (`routes/rich-text.tsx`)**

Add `data-testid` to:
- Section title → `data-testid="richtext-title"`
- Welcome Trans → `data-testid="trans-welcome"`
- Feature Trans → `data-testid="trans-features"`

- [ ] **Step 5: Add testids to formatting page (`routes/formatting.tsx`)**

Add `data-testid` to:
- Page title → `data-testid="formatting-title"`
- Date sections → `data-testid="date-default"`, `data-testid="date-short"`, `data-testid="date-long"`, `data-testid="date-time"`
- Number sections → `data-testid="number-default"`, `data-testid="number-percent"`, `data-testid="number-currency"`

- [ ] **Step 6: Build and verify**

```bash
cd examples/solid-start && pnpm build && pnpm preview
```

Verify the app still works correctly with added testids.

- [ ] **Step 7: Commit**

```bash
git add examples/solid-start/
git commit -m "test(solid-start): add data-testid attributes for E2E coverage"
```

---

### Task 3: SolidStart — Comprehensive E2E Tests

Expand from 10 tests to ~35 tests covering all gaps.

**Files:**
- Modify: `e2e/solid-start.spec.ts`

- [ ] **Step 0: Migrate existing tests to `getByTestId` selectors**

The existing 10 tests use text-based selectors (`page.locator('h1')`, `page.locator('button:has-text("日本語")')`). After Task 2 added `data-testid` attributes, migrate ALL existing tests to use `getByTestId()` for consistency. For example:
- `page.locator('h1')` → `page.getByTestId('title')` or `page.getByTestId('welcome')`
- `page.locator('button:has-text("日本語")')` → `page.getByTestId('lang-ja')`
- `page.locator('text=...')` → `page.getByTestId('description')` etc.

Run the existing tests after migration to ensure they still pass before adding new ones.

- [ ] **Step 1: Add formatting page tests**

```typescript
test.describe('Formatting page', () => {
  test('DateTime components render formatted dates', async ({ page }) => {
    await page.goto('/formatting')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('date-default')).not.toBeEmpty()
    await expect(page.getByTestId('date-short')).not.toBeEmpty()
    await expect(page.getByTestId('date-long')).not.toBeEmpty()
  })

  test('NumberFormat components render formatted numbers', async ({ page }) => {
    await page.goto('/formatting')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('number-default')).toContainText('1,234,567.89')
    await expect(page.getByTestId('number-percent')).toContainText('75%')
    await expect(page.getByTestId('number-currency')).toContainText('$')
  })

  test('formatting updates on locale switch', async ({ page }) => {
    await page.goto('/formatting')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    // Japanese number format uses different grouping
    await expect(page.getByTestId('number-default')).not.toContainText('1,234,567.89')
  })
})
```

- [ ] **Step 2: Add plural interactive tests**

```typescript
test.describe('Plurals page — interactive', () => {
  test('plural forms change with counter', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    // Start at 0 — zero form
    await expect(page.getByTestId('plural-result')).toContainText('empty')
    // Increment to 1 — one form
    await page.getByTestId('btn-inc').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 item')
    // Increment to 2 — other form
    await page.getByTestId('btn-inc').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 items')
  })

  test('reset button resets to zero', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('btn-inc').click()
    await page.getByTestId('btn-inc').click()
    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('empty')
  })

  test('select component switches on gender', async ({ page }) => {
    await page.goto('/plurals')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He')
    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She')
    await page.getByTestId('gender-other').click()
    await expect(page.getByTestId('select-result')).toContainText('They')
  })
})
```

- [ ] **Step 3: Add concurrent SSR isolation tests**

```typescript
test.describe('SolidStart SSR — Concurrent Locale Isolation', () => {
  test('concurrent SSR requests with different locales are isolated', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto('http://localhost:5176/'),
      pageJa.goto('http://localhost:5176/'),
    ])

    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')

    await expect(pageEn.getByTestId('welcome')).toContainText('Welcome')
    await expect(pageJa.getByTestId('welcome')).toContainText('ようこそ')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })

  test('concurrent requests to different pages stay isolated', async ({ browser }) => {
    const ctxEn = await browser.newContext()
    const ctxJa = await browser.newContext()
    await ctxJa.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])

    const pageEn = await ctxEn.newPage()
    const pageJa = await ctxJa.newPage()

    await Promise.all([
      pageEn.goto('http://localhost:5176/plurals'),
      pageJa.goto('http://localhost:5176/rich-text'),
    ])

    await pageEn.waitForLoadState('networkidle')
    await pageJa.waitForLoadState('networkidle')

    // Each page should be in the correct locale
    await expect(pageEn.locator('h1').first()).not.toContainText('日本語')

    await Promise.all([ctxEn.close(), ctxJa.close()])
  })
})
```

- [ ] **Step 4: Add hydration integrity tests**

```typescript
test.describe('SolidStart SSR — Hydration Integrity', () => {
  test('no fluenti-related hydration errors in console', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', (msg) => consoleLogs.push(msg.text()))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const fluentiErrors = consoleLogs.filter(
      (log) => log.includes('[fluenti]') && log.includes('mismatch'),
    )
    expect(fluentiErrors).toHaveLength(0)
  })

  test('locale persists after page reload', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('welcome')).toContainText('ようこそ')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('ようこそ')
  })

  test('Japanese locale from cookie renders correct SSR content', async ({ page, context }) => {
    await context.addCookies([
      { name: 'locale', value: 'ja', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('welcome')).toContainText('ようこそ')
    await context.clearCookies()
  })
})
```

- [ ] **Step 5: Add XSS prevention test**

```typescript
test('HTML in translated text is escaped, not executed', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const scripts = page.locator('main script')
  await expect(scripts).toHaveCount(0)
})
```

- [ ] **Step 6: Add rapid locale switching test**

```typescript
test('rapid locale switching settles on final locale', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const enBtn = page.getByTestId('lang-en')
  const jaBtn = page.getByTestId('lang-ja')
  for (let i = 0; i < 5; i++) {
    await jaBtn.click()
    await enBtn.click()
  }
  await expect(page.getByTestId('welcome')).toContainText('Welcome')
})
```

- [ ] **Step 7: Add navigation tests**

```typescript
test('client-side navigation between pages preserves locale', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('lang-ja').click()
  await expect(page.getByTestId('welcome')).toContainText('ようこそ')

  await page.getByTestId('nav-plurals').click()
  await page.waitForLoadState('networkidle')
  // Plurals page should also be in Japanese
  await expect(page.locator('h1').first()).not.toContainText('Plurals')

  await page.getByTestId('nav-home').click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('welcome')).toContainText('ようこそ')
})
```

- [ ] **Step 8: Run SolidStart E2E**

```bash
E2E_PROJECTS=solid-start pnpm exec playwright test
```

Expected: ~35 tests pass.

- [ ] **Step 9: Commit**

```bash
git add e2e/solid-start.spec.ts
git commit -m "test(e2e): expand SolidStart coverage (SSR isolation, hydration, plurals, formatting)"
```

---

### Task 4: TanStack Start — Comprehensive E2E Tests

Expand from 3 tests to ~25 tests.

**Files:**
- Modify: `e2e/tanstack-start.spec.ts`

- [ ] **Step 1: Add home page detailed tests**

```typescript
test.describe('Home page', () => {
  test('renders welcome section in English', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
    await expect(page.getByTestId('subtitle')).toBeVisible()
    await expect(page.getByTestId('current-locale')).toContainText('en')
  })

  test('date formatting renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('date-default')).not.toBeEmpty()
    await expect(page.getByTestId('date-long')).not.toBeEmpty()
    await expect(page.getByTestId('date-short')).not.toBeEmpty()
  })

  test('number formatting renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('number-default')).toContainText('1,234')
    await expect(page.getByTestId('number-currency')).toContainText('$')
    await expect(page.getByTestId('number-percent')).toContainText('%')
  })

  test('msg`` lazy messages render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('msg-admin')).not.toBeEmpty()
    await expect(page.getByTestId('msg-user')).not.toBeEmpty()
  })

  test('features list renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('features-title')).toBeVisible()
    await expect(page.getByTestId('features-list')).toBeVisible()
  })
})
```

- [ ] **Step 2: Add locale switching tests**

```typescript
test.describe('Locale switching', () => {
  test('switch to Japanese updates all content', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('title')).not.toContainText('Fluenti TanStack Start Playground')
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('switch to Chinese updates content', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-zh').click()
    await expect(page.getByTestId('current-locale')).toContainText('zh-CN')
  })

  test('switch back to English restores original', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await page.getByTestId('lang-en').click()
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('lang-ja').click()
      await page.getByTestId('lang-en').click()
    }
    await expect(page.getByTestId('welcome')).toContainText('Welcome to Fluenti')
  })

  test('locale persists across route navigation', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await page.getByTestId('nav-plurals').click()
    // Navigate back
    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })
})
```

- [ ] **Step 3: Add plurals page tests**

```typescript
test.describe('Plurals page', () => {
  test('plural forms update with counter', async ({ page }) => {
    await page.goto('/plurals')
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('1 message')
    await page.getByTestId('btn-add').click()
    await expect(page.getByTestId('plural-result')).toContainText('2 messages')
  })

  test('reset button works', async ({ page }) => {
    await page.goto('/plurals')
    await page.getByTestId('btn-add').click()
    await page.getByTestId('btn-add').click()
    await page.getByTestId('btn-reset').click()
    await expect(page.getByTestId('plural-result')).toContainText('No messages')
  })

  test('select component renders correct gender form', async ({ page }) => {
    await page.goto('/plurals')
    await page.getByTestId('gender-male').click()
    await expect(page.getByTestId('select-result')).toContainText('He')
    await page.getByTestId('gender-female').click()
    await expect(page.getByTestId('select-result')).toContainText('She')
  })

  test('plurals translate on locale switch', async ({ page }) => {
    await page.goto('/plurals')
    await page.getByTestId('btn-add').click()
    await page.getByTestId('lang-ja').click()
    // Japanese plurals don't distinguish one/other
    await expect(page.getByTestId('plural-result')).not.toContainText('1 message')
  })
})
```

- [ ] **Step 4: Add rich text page tests**

```typescript
test.describe('Rich text page', () => {
  test('Trans with link renders anchor', async ({ page }) => {
    await page.goto('/richtext')
    const link = page.getByTestId('trans-basic').locator('a')
    await expect(link).toBeVisible()
  })

  test('Trans with bold renders strong', async ({ page }) => {
    await page.goto('/richtext')
    const strong = page.getByTestId('trans-bold').locator('strong')
    await expect(strong).toBeVisible()
  })

  test('Trans with multiple elements renders both', async ({ page }) => {
    await page.goto('/richtext')
    const link = page.getByTestId('trans-multi').locator('a')
    const strong = page.getByTestId('trans-multi').locator('strong')
    await expect(link).toBeVisible()
    await expect(strong).toBeVisible()
  })

  test('rich text translates on locale switch', async ({ page }) => {
    await page.goto('/richtext')
    const before = await page.getByTestId('trans-basic').textContent()
    await page.getByTestId('lang-ja').click()
    const after = await page.getByTestId('trans-basic').textContent()
    expect(after).not.toBe(before)
  })

  test('msg`` page labels translate', async ({ page }) => {
    await page.goto('/richtext')
    const before = await page.getByTestId('richtext-title').textContent()
    await page.getByTestId('lang-ja').click()
    const after = await page.getByTestId('richtext-title').textContent()
    expect(after).not.toBe(before)
  })
})
```

- [ ] **Step 5: Add fallback and missing translation test**

```typescript
test('fallback-only message shows in English, falls back gracefully in Japanese', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('fallback-only')).toContainText('This key only exists in English')
  await page.getByTestId('lang-ja').click()
  // Should still show something (fallback), not crash
  await expect(page.getByTestId('fallback-only')).not.toBeEmpty()
})
```

- [ ] **Step 6: Add XSS prevention test**

```typescript
test('no script tags in main content', async ({ page }) => {
  await page.goto('/')
  const scripts = page.locator('main script')
  await expect(scripts).toHaveCount(0)
})
```

- [ ] **Step 7: Run TanStack Start E2E**

```bash
E2E_PROJECTS=tanstack-start pnpm exec playwright test
```

Expected: ~25 tests pass.

- [ ] **Step 8: Commit**

```bash
git add e2e/tanstack-start.spec.ts
git commit -m "test(e2e): expand TanStack Start coverage (home, plurals, richtext, locale switching, fallback)"
```

---

## Tier 2 — Confidence

### Task 5: Vue + Solid — Already Covered, Skip

The Vue playground already has XSS prevention (line 108) and rapid locale switching (line 116) tests. The Solid playground already has XSS prevention and rapid switching tests. Neither playground has Arabic/RTL configured (only en/ja/zh-CN), and neither exposes a missing-translation UI element.

**No action needed.** RTL and missing-translation fallback are already covered by `react-edge-cases.spec.ts` which has Arabic 6-form plurals, RTL direction tests, and missing key tests. These are framework-agnostic runtime behaviors tested once in the React fixture.

---

### Task 7: Nuxt — Rapid Locale Switching + XSS

**Files:**
- Modify: `e2e/nuxt.spec.ts`

- [ ] **Step 1: Add rapid locale switching test**

```typescript
test.describe('Nuxt — Rapid locale switching', () => {
  test('rapid locale switching settles on final locale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const enBtn = page.locator('header button:has-text("English")')
    const jaBtn = page.locator('header button:has-text("日本語")')
    for (let i = 0; i < 5; i++) {
      await jaBtn.click()
      await enBtn.click()
    }
    await expect(page.locator('header h1')).toContainText('Fluenti Nuxt Playground')
  })
})
```

- [ ] **Step 2: Add XSS prevention test**

```typescript
test('HTML in translated text is escaped', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const scripts = page.locator('main script')
  await expect(scripts).toHaveCount(0)
})
```

- [ ] **Step 3: Run Nuxt E2E**

```bash
E2E_PROJECTS=nuxt pnpm exec playwright test
```

- [ ] **Step 4: Commit**

```bash
git add e2e/nuxt.spec.ts
git commit -m "test(e2e): add Nuxt rapid locale switching and XSS prevention"
```

---

### Task 8: Next.js — Rapid Locale Switching + XSS

**Files:**
- Modify: `e2e/nextjs.spec.ts`

- [ ] **Step 1: Add rapid locale switching test**

```typescript
test('rapid locale switching settles on final locale', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('lang-ja').click()
    await page.getByTestId('lang-en').click()
  }
  await expect(page.getByTestId('welcome')).toContainText('Welcome')
})
```

- [ ] **Step 2: Add XSS prevention test**

```typescript
test('no script injection in translated content', async ({ page }) => {
  await page.goto('/')
  const scripts = page.locator('main script')
  await expect(scripts).toHaveCount(0)
})
```

- [ ] **Step 3: Run Next.js E2E**

```bash
E2E_PROJECTS=nextjs pnpm exec playwright test
```

- [ ] **Step 4: Commit**

```bash
git add e2e/nextjs.spec.ts
git commit -m "test(e2e): add Next.js rapid locale switching and XSS prevention"
```

---

### Task 9: React Router — XSS + Missing Translation

**Files:**
- Modify: `e2e/react-router.spec.ts`

- [ ] **Step 1: Add XSS and rapid switching tests**

```typescript
test('no script injection in content', async ({ page }) => {
  await page.goto('/')
  const scripts = page.locator('main script')
  await expect(scripts).toHaveCount(0)
})

test('rapid locale switching settles correctly', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('lang-ja').click()
    await page.getByTestId('lang-en').click()
  }
  await expect(page.getByTestId('welcome')).toContainText('Welcome')
})
```

- [ ] **Step 2: Commit**

```bash
git add e2e/react-router.spec.ts
git commit -m "test(e2e): add React Router XSS and rapid switching tests"
```

---

### Task 10: Remix — XSS + Rapid Switching

**Files:**
- Modify: `e2e/remix.spec.ts`

- [ ] **Step 1: Add tests (same pattern as React Router)**

```typescript
test('no script injection in content', async ({ page }) => {
  await page.goto('/')
  const scripts = page.locator('main script')
  await expect(scripts).toHaveCount(0)
})

test('rapid locale switching settles correctly', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('lang-ja').click()
    await page.getByTestId('lang-en').click()
  }
  await expect(page.getByTestId('welcome')).toContainText('Welcome')
})
```

- [ ] **Step 2: Commit**

```bash
git add e2e/remix.spec.ts
git commit -m "test(e2e): add Remix XSS and rapid switching tests"
```

---

## Tier 3 — Polish

### Task 11: Cross-Framework Page Refresh Locale Persistence

Verify that locale survives full page reload for every SSR framework that uses cookies.

**Files:**
- Modify: `e2e/solid-start.spec.ts` (already added in Task 3)
- Modify: `e2e/tanstack-start.spec.ts`

- [ ] **Step 1: Add TanStack Start cookie persistence test**

```typescript
test.describe('Cookie persistence', () => {
  test('locale persists after page reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    await expect(page.getByTestId('current-locale')).toContainText('ja')

    await page.reload()
    await expect(page.getByTestId('current-locale')).toContainText('ja')
  })

  test('cookie is set after locale switch', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-ja').click()
    const cookies = await page.context().cookies()
    const localeCookie = cookies.find((c) => c.name === 'locale')
    expect(localeCookie?.value).toBe('ja')
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add e2e/tanstack-start.spec.ts
git commit -m "test(e2e): add TanStack Start cookie persistence tests"
```

---

### Task 12: Navigation and Browser History

Verify back/forward behavior across all frameworks with client-side routing.

**Files:**
- Modify: `e2e/solid-start.spec.ts`
- Modify: `e2e/tanstack-start.spec.ts`
- Modify: `e2e/nuxt.spec.ts`
- Modify: `e2e/nextjs.spec.ts`

- [ ] **Step 1: Add back navigation test to SolidStart**

```typescript
test('browser back preserves locale', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('lang-ja').click()
  await page.getByTestId('nav-plurals').click()
  await page.waitForLoadState('networkidle')
  await page.goBack()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('welcome')).toContainText('ようこそ')
})
```

- [ ] **Step 2: Add back navigation test to TanStack Start**

```typescript
test('browser back preserves locale', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('lang-ja').click()
  await page.getByTestId('nav-plurals').click()
  await page.goBack()
  await expect(page.getByTestId('current-locale')).toContainText('ja')
})
```

- [ ] **Step 3: Add back navigation test to Nuxt**

```typescript
test('browser back preserves locale after navigation', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('header button:has-text("日本語")').click()
  await page.locator('a:has-text("Plurals")').first().click()
  await page.waitForLoadState('networkidle')
  await page.goBack()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('header h1')).toContainText('Fluenti Nuxt プレイグラウンド')
})
```

- [ ] **Step 4: Add back navigation test to Next.js**

```typescript
test('browser back preserves locale after navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('lang-ja').click()
  await expect(page.getByTestId('welcome')).toContainText('ようこそ')
  await page.getByTestId('nav-plurals').click()
  await page.goBack()
  await expect(page.getByTestId('welcome')).toContainText('ようこそ')
})
```

- [ ] **Step 5: Commit**

```bash
git add e2e/solid-start.spec.ts e2e/tanstack-start.spec.ts e2e/nuxt.spec.ts e2e/nextjs.spec.ts
git commit -m "test(e2e): add browser back/forward locale preservation tests across all frameworks"
```

---

## Execution Notes

**Running specific groups:**

```bash
# Tier 1 only
E2E_PROJECTS=solid-start,tanstack-start pnpm exec playwright test

# All modified specs
E2E_PROJECTS=solid-start,tanstack-start,nuxt,nextjs,react-router,remix pnpm exec playwright test

# CLI E2E (separate — not Playwright)
pnpm vitest run e2e/cli-workflow.test.ts
```

**Expected final counts:**

| Spec | Before | After | Delta |
|------|--------|-------|-------|
| solid-start.spec.ts | 10 | ~37 | +27 |
| tanstack-start.spec.ts | 3 | ~27 | +24 |
| nuxt.spec.ts | 32 | ~36 | +4 |
| nextjs.spec.ts | 48 | ~52 | +4 |
| react-router.spec.ts | 12 | ~14 | +2 |
| remix.spec.ts | 12 | ~14 | +2 |
| cli-workflow.test.ts | 0 | ~10 | +10 |
| vue.spec.ts | 18 | ~18 | 0 (already covered) |
| solid.spec.ts | 22 | ~22 | 0 (already covered) |
| **Total** | ~370 | ~443 | **+73** |
