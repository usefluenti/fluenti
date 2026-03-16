# @fluenti/next

[![npm](https://img.shields.io/npm/v/@fluenti/next?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/next)

Next.js plugin for Fluenti — webpack/turbopack loader for compile-time `t`` ` `` transforms, auto-compilation of catalogs, and dev-mode file watching.

## Install

```bash
pnpm add @fluenti/core @fluenti/react @fluenti/next
pnpm add -D @fluenti/cli
```

## Setup

```ts
// next.config.ts
import { withFluenti } from '@fluenti/next'

export default withFluenti({
  locales: ['en', 'ja', 'ar'],
  catalogDir: './locales',
  format: 'po',
})({
  reactStrictMode: true,
})
```

## What it does

### 1. Webpack loader — `t`` ` `` tagged template transform

Transforms `t`` ` `` tagged templates and `t()` calls into `__i18n.t()` with auto-injected `useI18n` hook:

```tsx
// Before (your code)
const msg = t`Hello ${name}`
const greeting = t('Welcome to {app}', { app: 'MyApp' })

// After (compiled output)
import { __useI18n } from '@fluenti/react'
const __i18n = __useI18n()
const msg = __i18n.t('Hello {name}', { name: name })
const greeting = __i18n.t('Welcome to {app}', { app: 'MyApp' })
```

This is the same transform that `@fluenti/vite-plugin` provides — now available in Next.js.

### 2. Auto-compile catalogs (dev mode)

In `next dev`, the plugin:
- Runs `fluenti compile` automatically on startup
- Watches your catalog directory (e.g., `./locales/*.po`) for changes
- Re-compiles on save → Next.js detects the output change → HMR

No more running `fluenti compile` manually during development.

### 3. Turbopack support

The loader is registered for both webpack and turbopack via the `turbopack.rules` config (Next.js 15.3+ format).

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `catalogDir` | `string` | `'./locales'` | Directory containing source catalogs (PO/JSON) |
| `compileOutDir` | `string` | `'./src/locales/compiled'` | Output directory for compiled JS catalogs |
| `sourceLocale` | `string` | `'en'` | Source locale code |
| `locales` | `string[]` | `[sourceLocale]` | List of locale codes to compile |
| `format` | `'json' \| 'po'` | `'po'` | Catalog format |
| `autoCompile` | `boolean` | `true` | Auto-compile catalogs in dev mode |

## Usage with RSC (Server Components)

For React Server Components, use `@fluenti/react/server` as before:

```ts
// lib/i18n.server.ts
import { createServerI18n } from '@fluenti/react/server'

export const { setLocale, getI18n, Trans, Plural } = createServerI18n({
  loadMessages: async (locale) => {
    switch (locale) {
      case 'ja': return import('@/locales/compiled/ja')
      default: return import('@/locales/compiled/en')
    }
  },
  fallbackLocale: 'en',
  resolveLocale: async () => {
    const { cookies } = await import('next/headers')
    return (await cookies()).get('locale')?.value ?? 'en'
  },
})
```

## Usage with Client Components

The `t`` ` `` transform works in client components inside an `<I18nProvider>`:

```tsx
'use client'

function SearchBar() {
  // t`` is compiled to __i18n.t() at build time
  const placeholder = t`Search...`
  const label = t`Enter your query`

  return <input placeholder={placeholder} aria-label={label} />
}
```

## Chaining with existing webpack config

`withFluenti` preserves your existing webpack config:

```ts
export default withFluenti({ locales: ['en', 'ja'] })({
  reactStrictMode: true,
  webpack(config, options) {
    // Your custom webpack config — runs AFTER the fluenti loader is added
    config.resolve.alias['@custom'] = './src/custom'
    return config
  },
})
```

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
