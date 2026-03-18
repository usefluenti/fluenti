# @fluenti/next

[![npm](https://img.shields.io/npm/v/@fluenti/next?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/next)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/next?color=22c55e&label=size)](https://bundlephobia.com/package/@fluenti/next)
[![license](https://img.shields.io/npm/l/@fluenti/next?color=gray)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Compile-time i18n for Next.js.** App Router native. RSC + streaming + server actions out of the box.

```tsx
// Server Component — zero client JS
import { t } from '@fluenti/react'

export default async function Page() {
  return <h1>{t`Welcome, ${user.name}!`}</h1>
}
```

```tsx
// Client Component — same syntax
'use client'
import { t } from '@fluenti/react'

export default function Counter() {
  return <p>{t`You have ${count} items in your cart.`}</p>
}
```

No runtime parsing. No bundle bloat. Messages are compiled at build time and tree-shaken per locale.

## Features

- **App Router native** — first-class RSC, streaming SSR, and server actions support
- **Next.js 14 & 15** compatible (`next >= 14.0.0`)
- **`t\`\`` tagged templates** — write messages inline, extract them with the CLI
- **Binding-aware transforms** — the webpack loader rewrites tagged templates only for proven Fluenti bindings
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

`withFluenti()` adds a webpack loader that rewrites direct-import authoring APIs in supported client/server scopes and generates a server module for RSC i18n. It reads your `fluenti.config.ts` automatically.

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
import { t } from '@fluenti/react'

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
import { t, useI18n } from '@fluenti/react'

export default function Home() {
  const { setLocale, preloadLocale } = useI18n()
  const name = 'World'
  return <h1>{t`Hello, ${name}!`}</h1>
}
```

`import { t }` is the primary compile-time API. It supports tagged templates and descriptor calls, but not `t('message.id')` lookup. In Next apps using `withFluenti()`, ordinary authoring imports come from `@fluenti/react` on both the client and the server. For runtime lookup or full imperative access, use `await getI18n()` on the server or `useI18n()` on the client.

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

  const { t, locale } = await getI18n()
  return <p>{t`Current server locale: ${locale}`}</p>
}
```

### Streaming SSR

Works with `Suspense` boundaries — streamed content is translated on the server:

```tsx
import { Suspense } from 'react'

async function SlowContent() {
  const { getI18n } = await import('@fluenti/next/__generated')
  const { t } = await getI18n()
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

Direct-import `t` works in `'use server'` functions:

```ts
'use server'

import { t } from '@fluenti/react'

export async function greetAction(): Promise<string> {
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
| `t` | Compile-time translation API, preserved for advanced/server-specific imports |
| `Trans` | Server component for rich text |
| `Plural` | Server component for plurals |
| `Select` | Server component for categorical selection |
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
