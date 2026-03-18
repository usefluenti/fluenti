# @fluenti/react

[![npm version](https://img.shields.io/npm/v/@fluenti/react?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/react)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/react?color=16a34a&label=size)](https://bundlephobia.com/package/@fluenti/react)
[![license](https://img.shields.io/npm/l/@fluenti/react?color=64748b)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Compile-time i18n for React.** Zero runtime parsing. RSC-ready. React 19 compatible.

Fluenti compiles your translations at build time so your production bundle ships pre-resolved messages instead of an ICU parser. The result: smaller bundles, faster renders, and a DX that feels native to React.

---

## Features

- **Zero runtime parsing** -- ICU MessageFormat compiled away at build time
- **React Server Components** -- first-class RSC support via `@fluenti/react/server`
- **Streaming SSR & Suspense** -- works with `React.Suspense` and streamed responses out of the box
- **React 19 compatible** -- tested against React 19, works with 18+
- **Tagged template literals** -- write `t`\`Hello, {name}!\`` directly in JSX
- **Rich text components** -- `<Trans>`, `<Plural>`, `<Select>`, `<DateTime>`, `<NumberFormat>`
- **Lazy loading** -- load locale catalogs on demand with dynamic imports
- **Type-safe** -- full TypeScript support with strict types

---

## Quick Start

### 1. Install

```bash
pnpm add @fluenti/core @fluenti/react
pnpm add -D @fluenti/cli @fluenti/vite-plugin
```

### 2. Configure Vite

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [
    fluenti({ framework: 'react' }),
    react(),
  ],
}
```

### 3. Wrap your app with `I18nProvider`

```tsx
import { I18nProvider } from '@fluenti/react'
import en from './locales/compiled/en'

function App() {
  return (
    <I18nProvider
      locale="en"
      fallbackLocale="en"
      messages={{ en }}
      loadMessages={(locale) => import(`./locales/compiled/${locale}.js`)}
    >
      <MyApp />
    </I18nProvider>
  )
}
```

### 4. Translate

```tsx
import { t, useI18n, Trans, Plural, Select } from '@fluenti/react'

function Dashboard() {
  const { d, n, locale, setLocale } = useI18n()
  const name = 'Alice'

  return (
    <div>
      {/* Compile-time tagged template */}
      <h1>{t`Welcome back, ${name}!`}</h1>

      {/* Rich text with embedded components */}
      <Trans>Read the <a href="/docs">documentation</a></Trans>

      {/* Locale-aware pluralization */}
      <Plural value={count} one="# item in cart" other="# items in cart" />

      {/* Gender / categorical selection */}
      <Select value={role} admin="Full access" editor="Edit access" other="Read only" />

      {/* Date & number formatting */}
      <p>{d(new Date(), 'long')}</p>
      <p>{n(9999.99, 'currency')}</p>

      {/* Switch locale at runtime */}
      <button onClick={() => setLocale('ja')}>日本語</button>
    </div>
  )
}
```

---

## Compile-Time Transform

Fluenti transforms your source code at build time. What you write:

```tsx
<Trans>Read the <a href="/docs">documentation</a></Trans>
```

What ships to production:

```tsx
// Pre-resolved message, no parser needed at runtime
<>Read the <a href="/docs">ドキュメント</a></>
```

The ICU parser is a dev dependency only -- it never reaches your users.

## Direct-Import `t`

`import { t } from '@fluenti/react'` is Fluenti's primary compile-time API.

It supports:

- `` t`Hello ${name}` ``
- `t({ message: 'Hello {name}', context: 'hero' }, { name })`

It does not support ID lookup. For `t('message.id')`, locale switching, formatting helpers, or other imperative runtime APIs, use `useI18n()`.

---

## React Server Components (RSC)

For Next.js App Router and other RSC-capable frameworks, use `@fluenti/react/server`:

```ts
// lib/i18n.server.ts
import { createServerI18n } from '@fluenti/react/server'

export const { setLocale, getI18n, Trans, Plural, DateTime, NumberFormat } =
  createServerI18n({
    loadMessages: (locale) => import(`../locales/compiled/${locale}.js`),
    fallbackLocale: 'en',
    resolveLocale: async () => {
      const { cookies } = await import('next/headers')
      return (await cookies()).get('locale')?.value ?? 'en'
    },
  })
```

```tsx
// app/layout.tsx -- set locale once per request
import { setLocale } from '@/lib/i18n.server'

export default async function Layout({ params, children }) {
  const { locale } = await params
  setLocale(locale)
  return <html lang={locale}><body>{children}</body></html>
}
```

```tsx
// app/page.tsx -- use components directly, no prop drilling
import { Trans, Plural, DateTime, NumberFormat } from '@/lib/i18n.server'

export default async function Page() {
  return (
    <div>
      <Trans>Read the <a href="/docs">documentation</a>.</Trans>
      <Plural value={5} one="# item" other="# items" />
      <DateTime value={new Date()} style="long" />
      <NumberFormat value={1234.56} />
    </div>
  )
}
```

Server components are async and use `React.cache()` for request-scoped state -- no Context needed. The API mirrors client components exactly.

---

## API Reference

### Components

| Component | Description |
|-----------|-------------|
| `I18nProvider` | Provides i18n context to the component tree |
| `Trans` | Rich text with embedded component interpolation |
| `Plural` | Locale-aware pluralization via `Intl.PluralRules` |
| `Select` | Categorical value selection (gender, role, status) |
| `DateTime` | Date formatting via `Intl.DateTimeFormat` |
| `NumberFormat` | Number formatting via `Intl.NumberFormat` |

### Hooks

| Hook | Returns |
|------|---------|
| `useI18n()` | `{ t, d, n, format, loadMessages, getLocales, i18n, locale, setLocale, ... }` |

`useI18n().t` remains the full runtime API for ID lookup, descriptor lookup, and imperative usage. Convenience methods `d()`, `n()`, `format()`, `loadMessages()`, `getLocales()` are also available directly. The `i18n` object is retained as an escape hatch.

### Server API (`@fluenti/react/server`)

| Export | Description |
|--------|-------------|
| `createServerI18n(config)` | Create request-scoped i18n for RSC |
| `setLocale(locale)` | Set locale for the current request |
| `getI18n()` | Get the i18n instance (async) |
| `Trans`, `Plural`, `DateTime`, `NumberFormat` | Async server components |

### Utilities

| Export | Entry point | Description |
|--------|-------------|-------------|
| `msg` | `@fluenti/react` | Tag for lazy message definitions outside the component tree |
| `detectLocale(options)` | `@fluenti/react/server` | SSR locale detection (cookie, query, path, headers) |
| `getSSRLocaleScript()` | `@fluenti/react/server` | Inline `<script>` for hydration without flash |
| `isRTL(locale)` | `@fluenti/react/server` | Check if a locale is right-to-left |

---

## Framework Compatibility

Works with any React-based framework:

- **React SPA** (Vite)
- **Next.js** (App Router + Pages Router)
- **React Router** / Remix
- **TanStack Start**

---

## Documentation

Full docs, guides, and examples at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
