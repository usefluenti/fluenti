# @fluenti/next

[![npm](https://img.shields.io/npm/v/@fluenti/next?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/next)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/next?color=22c55e&label=size)](https://bundlephobia.com/package/@fluenti/next)
[![license](https://img.shields.io/npm/l/@fluenti/next?color=gray)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Compile-time i18n for Next.js.** App Router native. RSC + streaming + server actions out of the box.

```tsx
// Server Component — zero client JS
export default async function Page() {
  return <h1>{t`Welcome, ${user.name}!`}</h1>
}
```

```tsx
// Client Component — same syntax
'use client'
export default function Counter() {
  return <p>{t`You have ${count} items in your cart.`}</p>
}
```

No runtime parsing. No bundle bloat. Messages are compiled at build time and tree-shaken per locale.

## Features

- **App Router native** — first-class RSC, streaming SSR, and server actions support
- **Next.js 14 & 15** compatible (`next >= 14.0.0`)
- **`t\`\`` tagged templates** — write messages inline, extract them with the CLI
- **Automatic server/client detection** — the webpack loader injects the right import based on file context
- **`FluentProvider`** — async server component that sets up both server and client i18n in one place
- **`withLocale()`** — per-component locale isolation in RSC
- **ICU MessageFormat** — plurals, selects, nested arguments, custom formatters
- **Code splitting** — messages split per locale, loaded on demand
- **Cookie-based locale detection** — reads `locale` cookie in server components by default

## Quick Start

### 1. Install

```bash
pnpm add @fluenti/next @fluenti/core @fluenti/react
pnpm add -D @fluenti/cli
```

### 2. Configure `next.config.ts`

```ts
import type { NextConfig } from 'next'
import { withFluenti } from '@fluenti/next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default withFluenti()(nextConfig)
```

`withFluenti()` adds a webpack loader that transforms `t\`\`` calls and generates a server module for RSC i18n. It reads your `fluenti.config.ts` automatically.

You can pass overrides directly:

```ts
export default withFluenti({
  locales: ['en', 'ja', 'zh-CN'],
  defaultLocale: 'en',
})(nextConfig)
```

### 3. Set up `FluentProvider` in your root layout

```tsx
// app/layout.tsx
import { cookies } from 'next/headers'
import { FluentProvider } from '@fluenti/next/__generated'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'en'

  return (
    <html lang={locale}>
      <body>
        <FluentProvider locale={locale}>
          {children}
        </FluentProvider>
      </body>
    </html>
  )
}
```

`FluentProvider` is an async server component. It initializes the server-side i18n instance (via `React.cache`) and wraps children in a client-side `I18nProvider` for hydration.

### 4. Use `t\`\`` in your pages

**Server Component** (default in `app/`):

```tsx
// app/rsc/page.tsx
export default async function RSCPage() {
  return (
    <div>
      <h1>{t`Server rendered`}</h1>
      <p>{t`This page is a React Server Component.`}</p>
    </div>
  )
}
```

**Client Component**:

```tsx
// app/page.tsx
'use client'
import { useI18n } from '@fluenti/react'

export default function Home() {
  const { t } = useI18n()
  const name = 'World'
  return <h1>{t`Hello, ${name}!`}</h1>
}
```

The `t` function supports dual-mode usage: `t('message.id', { values })` for catalog lookup and `` t`Hello ${name}` `` as a tagged template literal. The webpack loader uses **AST scope analysis** to detect `t` bindings from `useI18n()` destructuring and transforms only those calls.

> **Deprecated**: The magic global `t` (auto-injected without an explicit import) still works via a legacy fallback but is deprecated. Prefer `const { t } = useI18n()` for scope-safe transforms.

### 5. Extract and compile messages

```bash
# Extract messages from source files
pnpm fluenti extract

# Translate your PO files, then compile
pnpm fluenti compile
```

## Next.js-Specific Features

### React Server Components

Server components use `t\`\`` with zero client-side JavaScript. The loader detects server context automatically (files in `app/` without `'use client'`).

For direct access to the i18n instance in RSC:

```tsx
import { setLocale, getI18n } from '@fluenti/next/__generated'

export default async function Page({ searchParams }) {
  const params = await searchParams
  if (params.lang) setLocale(params.lang)

  const i18n = await getI18n()
  return <p>{t`Current server locale: ${i18n.locale}`}</p>
}
```

### Streaming SSR

Works with `Suspense` boundaries — streamed content is translated on the server:

```tsx
import { Suspense } from 'react'

async function SlowContent() {
  await fetchData()
  return <p>{t`Streamed content loaded!`}</p>
}

export default async function StreamingPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SlowContent />
    </Suspense>
  )
}
```

### Server Actions

`t\`\`` works in `'use server'` functions:

```ts
'use server'

import { getI18n } from '@fluenti/next/__generated'

export async function greetAction(): Promise<string> {
  const i18n = await getI18n()
  return t`Hello from server action`
}
```

### Metadata i18n

Translate Next.js metadata using the server i18n instance:

```tsx
import { getI18n } from '@fluenti/next/__generated'

export async function generateMetadata() {
  const i18n = await getI18n()
  return {
    title: i18n.t('My App — Internationalized'),
    description: i18n.t('A fully localized Next.js application'),
  }
}
```

### Middleware Locale Detection

Detect locale from headers, cookies, or URL and set it via cookie:

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPPORTED_LOCALES = ['en', 'ja', 'zh-CN']
const DEFAULT_LOCALE = 'en'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Already has a locale cookie
  if (request.cookies.get('locale')?.value) {
    return response
  }

  // Detect from Accept-Language header
  const acceptLang = request.headers.get('accept-language') ?? ''
  const detected = acceptLang
    .split(',')
    .map((s) => s.split(';')[0]!.trim())
    .find((lang) => SUPPORTED_LOCALES.includes(lang))

  response.cookies.set('locale', detected ?? DEFAULT_LOCALE)
  return response
}
```

### Per-Component Locale Isolation

Render a subtree in a different locale using `withLocale()`:

```tsx
import { withLocale } from '@fluenti/next/server'

export default async function Page() {
  return (
    <div>
      <h1>{t`Main content`}</h1>
      {await withLocale('ja', async () => (
        <JapaneseWidget />
      ))}
    </div>
  )
}
```

## API Reference

### `withFluenti(config?)`

Wraps your Next.js config with Fluenti support. Accepts an optional `WithFluentConfig`:

| Option | Type | Description |
|--------|------|-------------|
| `locales` | `string[]` | Override locales from `fluenti.config.ts` |
| `defaultLocale` | `string` | Override source locale |
| `compiledDir` | `string` | Override compiled messages directory |
| `serverModule` | `string` | Custom server module path (skip auto-generation) |
| `resolveLocale` | `() => string \| Promise<string>` | Custom locale resolver for server actions |
| `dateFormats` | `DateFormatOptions` | Custom date format styles |
| `numberFormats` | `NumberFormatOptions` | Custom number format styles |
| `fallbackChain` | `Record<string, Locale[]>` | Fallback chain per locale |

### `FluentProvider`

Async server component (imported from `@fluenti/next/__generated`). Place in your root layout.

| Prop | Type | Description |
|------|------|-------------|
| `locale` | `string?` | Active locale. Defaults to `defaultLocale` from config. |
| `children` | `ReactNode` | Application tree |

### `withLocale(locale, fn)`

Server utility (imported from `@fluenti/next/server`). Executes `fn` with a temporarily switched locale.

### Generated Server Module

`@fluenti/next/__generated` exports:

| Export | Description |
|--------|-------------|
| `FluentProvider` | Async server component for layouts |
| `setLocale(locale)` | Set the request-scoped locale |
| `getI18n()` | Get the i18n instance (async) |
| `Trans` | Server component for rich text |
| `Plural` | Server component for plurals |
| `DateTime` | Server component for date formatting |
| `NumberFormat` | Server component for number formatting |

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

- [Next.js Quick Start](https://fluenti.dev/start/quick-start-nextjs/)
- [Next.js Guide](https://fluenti.dev/frameworks/react/nextjs/)
- [Server Components](https://fluenti.dev/frameworks/react/server-components/)
- [API Reference](https://fluenti.dev/api/next/)

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
