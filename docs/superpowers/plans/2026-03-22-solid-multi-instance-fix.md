# Solid Multi-Instance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent silent global singleton overwrite in `@fluenti/solid` when `createFluenti()` is called multiple times, with full test coverage across unit, scope-transform, and integration layers.

**Architecture:** Add a duplicate-call guard to `createFluenti()` and `setGlobalI18nContext()` that throws in production but allows HMR replacement. Write tests first (TDD), then implement the fix. Scope-transform tests verify compile-time binding preservation for multi-instance `t`.

**Tech Stack:** SolidJS, Vitest 4, @solidjs/testing-library, happy-dom

**Spec:** `docs/superpowers/specs/2026-03-22-solid-multi-instance-fix-design.md`

---

### Task 1: Solid Unit Tests — `createFluenti()` Guard

**Files:**
- Create: `packages/solid/tests/multi-instance.test.tsx`

- [ ] **Step 1: Write the failing tests for createFluenti() duplicate guard**

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createRoot } from 'solid-js'
import { createFluenti, resetGlobalI18nContext, setGlobalI18nContext, createI18nContext } from '../src/context'

const enMessages = { en: { hello: 'Hello' } }
const jaMessages = { ja: { hello: 'こんにちは' } }

describe('createFluenti() duplicate guard', () => {
  afterEach(() => {
    resetGlobalI18nContext()
    vi.unstubAllGlobals()
  })

  it('throws when called twice in non-HMR environment', () => {
    // Vitest sets import.meta.hot by default, stub it to undefined
    vi.stubGlobal('__fluenti_hmr__', false)

    createFluenti({ locale: 'en', messages: enMessages })
    expect(() => createFluenti({ locale: 'ja', messages: jaMessages })).toThrow(
      'already been called',
    )
  })

  it('succeeds after resetGlobalI18nContext()', () => {
    vi.stubGlobal('__fluenti_hmr__', false)

    createFluenti({ locale: 'en', messages: enMessages })
    resetGlobalI18nContext()
    expect(() => createFluenti({ locale: 'ja', messages: jaMessages })).not.toThrow()
  })

  it('setGlobalI18nContext() throws when globalCtx already exists', () => {
    createFluenti({ locale: 'en', messages: enMessages })
    const ctx = createRoot(() => createI18nContext({ locale: 'ja', messages: jaMessages }))
    expect(() => setGlobalI18nContext(ctx)).toThrow('already been called')
  })

  it('allows replacement in HMR mode', () => {
    vi.stubGlobal('__fluenti_hmr__', true)

    createFluenti({ locale: 'en', messages: enMessages })
    expect(() => createFluenti({ locale: 'ja', messages: jaMessages })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @fluenti/solid test -- --run -t "duplicate guard"`
Expected: FAIL — no guard logic exists yet

- [ ] **Step 3: Commit failing tests**

```bash
git add packages/solid/tests/multi-instance.test.tsx
git commit -m "test(solid): add failing tests for createFluenti() duplicate guard"
```

---

### Task 2: Solid Unit Tests — Multi-Provider Isolation

**Files:**
- Modify: `packages/solid/tests/multi-instance.test.tsx`

- [ ] **Step 1: Add imports and append multi-provider isolation tests**

Add these imports at the top of the file (after existing imports):

```tsx
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'
```

Then append the test block:

```tsx
describe('multi-provider isolation', () => {
  afterEach(() => {
    resetGlobalI18nContext()
  })

  it('two sibling providers render different locales', () => {
    const messages = {
      en: { hello: 'Hello' },
      ja: { hello: 'こんにちは' },
    }

    function EnChild() {
      const { t } = useI18n()
      return <span data-testid="en">{t('hello')}</span>
    }

    function JaChild() {
      const { t } = useI18n()
      return <span data-testid="ja">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={messages}>
          <EnChild />
        </I18nProvider>
        <I18nProvider locale="ja" messages={messages}>
          <JaChild />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('en').textContent).toBe('Hello')
    expect(getByTestId('ja').textContent).toBe('こんにちは')
  })

  it('nested providers: inner overrides outer per-subtree', () => {
    const messages = {
      en: { hello: 'Hello' },
      fr: { hello: 'Bonjour' },
    }

    function OuterChild() {
      const { t } = useI18n()
      return <span data-testid="outer">{t('hello')}</span>
    }

    function InnerChild() {
      const { t } = useI18n()
      return <span data-testid="inner">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <OuterChild />
        <I18nProvider locale="fr" messages={messages}>
          <InnerChild />
        </I18nProvider>
      </I18nProvider>
    ))

    expect(getByTestId('outer').textContent).toBe('Hello')
    expect(getByTestId('inner').textContent).toBe('Bonjour')
  })

  it('provider takes priority over globalCtx', () => {
    createFluenti({ locale: 'en', messages: { en: { hello: 'Global Hello' } } })

    function Child() {
      const { t } = useI18n()
      return <span data-testid="text">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <I18nProvider locale="ja" messages={{ ja: { hello: 'Provider こんにちは' } }}>
        <Child />
      </I18nProvider>
    ))

    expect(getByTestId('text').textContent).toBe('Provider こんにちは')
  })

  it('sibling providers with independent setLocale', async () => {
    const messages = {
      en: { hello: 'Hello' },
      fr: { hello: 'Bonjour' },
      ja: { hello: 'こんにちは' },
    }

    let setLocaleA: (l: string) => Promise<void>

    function ChildA() {
      const { t, setLocale } = useI18n()
      setLocaleA = setLocale
      return <span data-testid="a">{t('hello')}</span>
    }

    function ChildB() {
      const { t } = useI18n()
      return <span data-testid="b">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={messages}>
          <ChildA />
        </I18nProvider>
        <I18nProvider locale="ja" messages={messages}>
          <ChildB />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('a').textContent).toBe('Hello')
    expect(getByTestId('b').textContent).toBe('こんにちは')

    await setLocaleA!('fr')
    await Promise.resolve()

    expect(getByTestId('a').textContent).toBe('Bonjour')
    expect(getByTestId('b').textContent).toBe('こんにちは') // unchanged
  })
})
```

- [ ] **Step 2: Run tests to verify provider tests pass (these test existing behavior)**

Run: `pnpm --filter @fluenti/solid test -- --run -t "multi-provider"`
Expected: PASS — provider isolation already works

- [ ] **Step 3: Commit**

```bash
git add packages/solid/tests/multi-instance.test.tsx
git commit -m "test(solid): add multi-provider isolation tests"
```

---

### Task 3: Core Scope Transform Tests — Multi-Binding Preservation

**Files:**
- Modify: `packages/core/tests/scope-transform.test.ts`

- [ ] **Step 1: Append multi-instance scope transform tests**

Add these tests inside the existing `describe('scopeTransform', ...)` block, after the last existing test (before the closing `})`):

```typescript
  it('preserves separate binding names for multiple useI18n() destructures', () => {
    const code = `
import { useI18n } from '@fluenti/react'
function App() {
  const { t: t1 } = useI18n()
  const { t: t2 } = useI18n()
  const a = t1\`Hello\`
  const b = t2\`World\`
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('t1({')
    expect(result.code).toContain('t2({')
    expect(result.code).toContain("message: 'Hello'")
    expect(result.code).toContain("message: 'World'")
  })

  it('import { t } in separate functions each get own helper', () => {
    const code = `
import { t } from '@fluenti/react'
function CompA() {
  return t\`Hello\`
}
function CompB() {
  return t\`World\`
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    // Both functions should have the helper injected
    expect(result.code).toContain("message: 'Hello'")
    expect(result.code).toContain("message: 'World'")
    // The direct import `t` should be removed
    expect(result.code).not.toMatch(/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"]@fluenti\/react['"]/)
  })

  it('shadowed t in nested scope: outer transformed, inner untouched', () => {
    const code = `
import { useI18n } from '@fluenti/react'
function App() {
  const { t } = useI18n()
  const msg = t\`Outer\`
  function nested() {
    const t = (x: string) => x.toUpperCase()
    const inner = t('hello')
  }
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Outer'")
    // Inner t should remain as a plain function call
    expect(result.code).toContain("t('hello')")
  })
```

- [ ] **Step 2: Run tests to verify they pass (testing existing transform behavior)**

Run: `pnpm --filter @fluenti/core test -- --run -t "preserves separate binding" -t "separate functions" -t "shadowed t in nested"`
Expected: PASS — these test existing correct behavior

- [ ] **Step 3: Commit**

```bash
git add packages/core/tests/scope-transform.test.ts
git commit -m "test(core): add multi-instance scope transform tests"
```

---

### Task 4: Integration Tests — Full Multi-Provider Rendering

**Files:**
- Create: `packages/solid/tests/integration-multi-instance.test.tsx`

- [ ] **Step 1: Write integration tests**

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from '../src'
import { resetGlobalI18nContext } from '../src/context'

const allMessages = {
  en: { hello: 'Hello', welcome: 'Welcome {name}' },
  ja: { hello: 'こんにちは', welcome: 'ようこそ {name}' },
  fr: { hello: 'Bonjour', welcome: 'Bienvenue {name}' },
}

describe('integration: multi-provider rendering', () => {
  afterEach(() => {
    resetGlobalI18nContext()
  })

  it('full page with two providers (en + ja) renders correct translations', () => {
    function Header() {
      const { t } = useI18n()
      return <h1 data-testid="header">{t('hello')}</h1>
    }

    function Sidebar() {
      const { t } = useI18n()
      return <aside data-testid="sidebar">{t('hello')}</aside>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={allMessages}>
          <Header />
        </I18nProvider>
        <I18nProvider locale="ja" messages={allMessages}>
          <Sidebar />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('header').textContent).toBe('Hello')
    expect(getByTestId('sidebar').textContent).toBe('こんにちは')
  })

  it('locale switch in one provider does not affect the other', async () => {
    let setLocaleA: (l: string) => Promise<void>

    function CompA() {
      const { t, setLocale } = useI18n()
      setLocaleA = setLocale
      return <span data-testid="a">{t('hello')}</span>
    }

    function CompB() {
      const { t } = useI18n()
      return <span data-testid="b">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={allMessages}>
          <CompA />
        </I18nProvider>
        <I18nProvider locale="ja" messages={allMessages}>
          <CompB />
        </I18nProvider>
      </div>
    ))

    expect(getByTestId('a').textContent).toBe('Hello')
    expect(getByTestId('b').textContent).toBe('こんにちは')

    await setLocaleA!('fr')
    await Promise.resolve()

    expect(getByTestId('a').textContent).toBe('Bonjour')
    expect(getByTestId('b').textContent).toBe('こんにちは') // must remain unchanged
  })

  it('loadMessages in one provider does not leak to another', async () => {
    let loadA: (locale: string, msgs: Record<string, string>) => void
    let setLocaleA: (l: string) => Promise<void>

    function CompA() {
      const { t, loadMessages, setLocale } = useI18n()
      loadA = loadMessages
      setLocaleA = setLocale
      return <span data-testid="a">{t('hello')}</span>
    }

    function CompB() {
      const { t } = useI18n()
      return <span data-testid="b">{t('hello')}</span>
    }

    const { getByTestId } = render(() => (
      <div>
        <I18nProvider locale="en" messages={allMessages}>
          <CompA />
        </I18nProvider>
        <I18nProvider locale="ja" messages={allMessages}>
          <CompB />
        </I18nProvider>
      </div>
    ))

    // Load German into provider A only
    loadA!('de', { hello: 'Hallo' })
    await setLocaleA!('de')
    await Promise.resolve()

    expect(getByTestId('a').textContent).toBe('Hallo')
    expect(getByTestId('b').textContent).toBe('こんにちは') // provider B unaffected
  })
})
```

- [ ] **Step 2: Run integration tests to verify they pass**

Run: `pnpm --filter @fluenti/solid test -- --run -t "integration: multi-provider"`
Expected: PASS — these test existing provider isolation behavior

- [ ] **Step 3: Commit**

```bash
git add packages/solid/tests/integration-multi-instance.test.tsx
git commit -m "test(solid): add integration tests for multi-provider rendering"
```

---

### Task 5: Implement the Fix — `createFluenti()` Duplicate Guard

**Files:**
- Modify: `packages/solid/src/context.ts:368-403`

- [ ] **Step 1: Add HMR detection helper and guard to `createFluenti()`**

In `packages/solid/src/context.ts`, replace the `createFluenti` function (lines 368-383):

```typescript
function isHMR(): boolean {
  try {
    // import.meta.hot is also truthy in Vitest; use a global flag for testability
    return typeof (globalThis as Record<string, unknown>).__fluenti_hmr__ !== 'undefined'
      ? !!(globalThis as Record<string, unknown>).__fluenti_hmr__
      : typeof import.meta.hot !== 'undefined'
  } catch {
    return false
  }
}

export function createFluenti(config: FluentiRuntimeConfig | I18nConfig): I18nContext {
  if (typeof window !== 'undefined' && globalCtx !== undefined) {
    if (isHMR()) {
      console.warn('[fluenti] HMR: replacing global i18n instance')
    } else {
      throw new Error(
        '[fluenti] createFluenti() has already been called. '
        + 'Use <I18nProvider> for multiple i18n instances, '
        + 'or call resetGlobalI18nContext() first (testing only).',
      )
    }
  }

  const ctx = createRoot(() => createI18nContext(config))

  if (typeof window !== 'undefined') {
    globalCtx = ctx
  } else {
    console.warn(
      '[fluenti] createFluenti() detected SSR environment. '
      + 'Use <I18nProvider> for per-request isolation in SSR.',
    )
  }

  return ctx
}
```

- [ ] **Step 2: Add guard to `setGlobalI18nContext()`**

Replace `setGlobalI18nContext` (lines 396-398):

```typescript
/** @internal — used by I18nProvider to set context without createRoot wrapper */
export function setGlobalI18nContext(ctx: I18nContext): void {
  if (globalCtx !== undefined) {
    throw new Error(
      '[fluenti] Global i18n context has already been set via createFluenti(). '
      + 'Use <I18nProvider> for multiple i18n instances.',
    )
  }
  globalCtx = ctx
}
```

- [ ] **Step 3: Run all tests**

Run: `pnpm --filter @fluenti/solid test -- --run`
Expected: ALL PASS — guard tests now pass, existing tests unaffected (they use `afterEach(resetGlobalI18nContext)`)

- [ ] **Step 4: Run core tests to ensure no regressions**

Run: `pnpm --filter @fluenti/core test -- --run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/solid/src/context.ts
git commit -m "fix(solid): prevent silent global singleton overwrite in createFluenti()"
```

---

### Task 6: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS across all packages

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `pnpm lint`
Expected: No lint errors
