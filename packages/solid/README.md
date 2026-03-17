# @fluenti/solid

[![npm](https://img.shields.io/npm/v/@fluenti/solid?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/solid)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/solid?color=22c55e&label=size)](https://bundlephobia.com/package/@fluenti/solid)
[![license](https://img.shields.io/npm/l/@fluenti/solid?color=gray)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Compile-time i18n for SolidJS** -- reactive by design, zero runtime overhead.

Fluenti compiles your messages at build time and pairs them with Solid's fine-grained reactivity. When the locale changes, only the text nodes that depend on it re-render. No virtual DOM diffing, no wasted work.

## Features

- **Compile-time transforms** -- messages are resolved during the build; the runtime ships precompiled functions, not an ICU parser.
- **Signal-driven locale** -- `locale()` is a Solid signal; any computation that reads it re-runs automatically.
- **`<Trans>`, `<Plural>`, `<Select>`, `<DateTime>`, `<NumberFormat>`** -- declarative components that map directly to ICU MessageFormat.
- **`t()` / `d()` / `n()` / `msg()`** -- imperative API for strings, dates, numbers, and lazy message definitions.
- **Code splitting** -- load locale chunks on demand with a single `chunkLoader` option.
- **SSR-ready** -- first-class SolidStart support with per-request isolation.

## Quick Start

### 1. Install

```bash
pnpm add @fluenti/core @fluenti/solid
pnpm add -D @fluenti/cli @fluenti/vite-plugin
```

### 2. Configure Vite

```ts
// vite.config.ts
import solidPlugin from 'vite-plugin-solid'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [solidPlugin(), fluenti({ framework: 'solid' })],
}
```

### 3. Wrap your app

```tsx
// index.tsx
import { render } from 'solid-js/web'
import { I18nProvider } from '@fluenti/solid'
import en from './locales/compiled/en'
import ja from './locales/compiled/ja'
import App from './App'

render(
  () => (
    <I18nProvider locale="en" fallbackLocale="en" messages={{ en, ja }}>
      <App />
    </I18nProvider>
  ),
  document.getElementById('root')!,
)
```

### 4. Translate

```tsx
import { useI18n, Trans, Plural, Select } from '@fluenti/solid'

function Demo(props) {
  const { t, d, n, locale, setLocale } = useI18n()

  return (
    <div>
      {/* Function call with catalog lookup */}
      <h1>{t('Hello, {name}!', { name: 'World' })}</h1>

      {/* Tagged template literal */}
      <h1>{t`Hello, ${name}!`}</h1>

      <Trans>Read the <a href="/docs">documentation</a></Trans>

      <Plural value={props.count} one="# item" other="# items" />

      <Select value={props.gender} male="He" female="She" other="They" />

      <p>{d(new Date(), 'long')}</p>
      <p>{n(1234.5, 'currency')}</p>

      <button onClick={() => setLocale('ja')}>日本語</button>
    </div>
  )
}
```

## What the compiler does

Write natural-language JSX. The Vite plugin extracts messages, generates deterministic IDs, and replaces the source with precompiled lookups -- all at build time.

```tsx
// You write:
<Plural value={count} one="# item" other="# items" />

// The compiler emits (conceptually):
t('abc123', { count })   // hash-based lookup, no ICU parsing at runtime
```

## API Reference

### `useI18n()`

Returns the reactive i18n context. Works inside any component that is a descendant of `<I18nProvider>`, or after a top-level `createI18n()` call.

```tsx
const { t, d, n, format, locale, setLocale, isLoading } = useI18n()
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `t` | `(id: string \| MessageDescriptor, values?) => string` or `` t`Hello ${name}` `` | Dual-mode: function call for catalog lookup, or tagged template literal |
| `d` | `(value: Date \| number, style?) => string` | Format a date using named presets or Intl defaults |
| `n` | `(value: number, style?) => string` | Format a number using named presets or Intl defaults |
| `format` | `(message: string, values?) => string` | Format an ICU message string directly (no catalog lookup) |
| `locale` | `Accessor<string>` | Reactive signal for the current locale |
| `setLocale` | `(locale: string) => Promise<void>` | Change locale (async when code splitting is enabled) |
| `loadMessages` | `(locale: string, messages) => void` | Merge additional messages into a locale catalog at runtime |
| `getLocales` | `() => string[]` | List all locales that have loaded messages |
| `preloadLocale` | `(locale: string) => void` | Preload a locale chunk in the background without switching |
| `isLoading` | `Accessor<boolean>` | Whether a locale chunk is currently being loaded |
| `loadedLocales` | `Accessor<Set<string>>` | Set of locales whose messages have been loaded |

### `createI18n(config)`

Module-level singleton alternative to `<I18nProvider>`. Call once at startup; `useI18n()` will find it automatically.

```tsx
import { createI18n } from '@fluenti/solid'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ja },

  // Optional: post-translation transform, locale change callback, custom formatters
  transform: (result, id, locale) => result,
  onLocaleChange: (newLocale, prevLocale) => { /* ... */ },
  formatters: { /* custom ICU function formatters */ },
})
```

The config accepts all `FluentConfigExtended` options from `@fluenti/core`, including `transform`, `onLocaleChange`, and `formatters`. See the [core README](https://github.com/usefluenti/fluenti/tree/main/packages/core#advanced-configuration) for details.

### Components

#### `<Trans>` -- Rich text

Render translated content containing inline JSX elements:

```tsx
<Trans>Click <a href="/next">here</a> to continue</Trans>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tag` | `string` | `'span'` | Wrapper element for multiple children |

#### `<Plural>` -- Plural forms

ICU plural rules as a component. Supports string props or rich-text JSX element props:

```tsx
{/* String props */}
<Plural value={count} zero="No items" one="1 item" other="{count} items" />

{/* Rich text via JSX element props */}
<Plural
  value={count}
  zero={<>No <strong>items</strong> left</>}
  one={<><em>1</em> item remaining</>}
  other={<><strong>{count}</strong> items remaining</>}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | -- | The count to pluralize on (required) |
| `zero` | `string \| JSX.Element` | -- | Text for zero items |
| `one` | `string \| JSX.Element` | -- | Singular form |
| `two` | `string \| JSX.Element` | -- | Dual form |
| `few` | `string \| JSX.Element` | -- | Few form |
| `many` | `string \| JSX.Element` | -- | Many form |
| `other` | `string \| JSX.Element` | `''` | Default/fallback form |

#### `<Select>` -- Option selection

ICU select patterns as a component:

```tsx
{/* String props */}
<Select value={gender} male="He" female="She" other="They" />

{/* Rich text via options + other */}
<Select
  value={gender}
  options={{
    male: <><strong>He</strong> liked this</>,
    female: <><strong>She</strong> liked this</>,
  }}
  other={<><em>They</em> liked this</>}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | -- | The value to match (required) |
| `options` | `Record<string, string \| JSX.Element>` | -- | Named options map |
| `other` | `string \| JSX.Element` | `''` | Fallback when no option matches |

#### `<DateTime>` -- Date formatting

```tsx
import { DateTime } from '@fluenti/solid'

<DateTime value={new Date()} style="long" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Date \| number` | -- | The date value to format (required) |
| `style` | `string` | -- | Named date format style |

#### `<NumberFormat>` -- Number formatting

```tsx
import { NumberFormat } from '@fluenti/solid'

<NumberFormat value={1234.56} style="currency" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | -- | The number to format (required) |
| `style` | `string` | -- | Named number format style |

### Utilities

| Export | Description |
|--------|-------------|
| `msg` | Tag for lazy message definitions outside the component tree |

## Code Splitting

Load locale messages on demand instead of bundling everything upfront:

```tsx
<I18nProvider
  locale="en"
  messages={{ en }}
  splitting
  chunkLoader={(locale) => import(`./locales/compiled/${locale}.js`)}
>
  <App />
</I18nProvider>
```

```tsx
const { setLocale, isLoading, preloadLocale } = useI18n()

// Preload on hover
onMount(() => preloadLocale('ja'))

// Switch locale -- instant if preloaded, async otherwise
await setLocale('ja')
```

## SSR with SolidStart

### Server-side i18n

Create a server-side i18n instance with per-request locale resolution:

```ts
// lib/i18n.server.ts
import { createServerI18n } from '@fluenti/solid/server'

export const { setLocale, getI18n } = createServerI18n({
  loadMessages: (locale) => import(`../locales/compiled/${locale}.js`),
  fallbackLocale: 'en',
  resolveLocale: () => {
    // Read locale from cookie, header, or URL
    const event = getRequestEvent()
    return event?.request.headers.get('accept-language')?.split(',')[0] ?? 'en'
  },
})
```

### Hydration helper

The `getSSRLocaleScript` utility injects a tiny inline script that makes the server-detected locale available to the client before hydration, preventing a locale flash:

```tsx
import { getSSRLocaleScript } from '@fluenti/solid/server'
```

### SSR utilities re-exported from `@fluenti/solid/server`

| Export | Description |
|--------|-------------|
| `createServerI18n` | Create server-side i18n with lazy message loading |
| `detectLocale` | Detect locale from headers, cookies, URL path, or query |
| `getSSRLocaleScript` | Inline script for hydrating the locale on the client |
| `getHydratedLocale` | Read the locale set by the SSR script on the client |
| `isRTL` / `getDirection` | RTL detection helpers |

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
