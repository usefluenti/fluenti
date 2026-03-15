# @fluenti/react

[![npm](https://img.shields.io/npm/v/@fluenti/react?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/react)

React bindings for Fluenti — compile-time i18n with zero runtime overhead.

## Install

```bash
pnpm add @fluenti/core @fluenti/react
pnpm add -D @fluenti/cli @fluenti/vite-plugin
```

## Setup

```tsx
import { I18nProvider } from '@fluenti/react'
import en from './locales/compiled/en'
import zhCN from './locales/compiled/zh-CN'

function App() {
  return (
    <I18nProvider locale="en" fallbackLocale="en" messages={{ en, 'zh-CN': zhCN }}>
      <MyApp />
    </I18nProvider>
  )
}
```

## Usage

```tsx
import { useI18n, Trans, Plural, Select } from '@fluenti/react'

function Home() {
  const { i18n, locale, setLocale } = useI18n()

  return (
    <div>
      <h1>{i18n.t('Welcome to my app')}</h1>
      <p>{i18n.t('Hello, {name}!', { name: 'World' })}</p>

      <Trans>Read the <a href="/docs">documentation</a></Trans>

      <Plural value={count} one="# item" other="# items" />

      <Select value={gender} male="He" female="She" other="They" />

      <p>{i18n.d(new Date(), 'long')}</p>
      <p>{i18n.n(1234.5, 'decimal')}</p>

      <button onClick={() => setLocale('en')}>English</button>
      <button onClick={() => setLocale('zh-CN')}>中文</button>
    </div>
  )
}
```

## Vite Plugin

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

## Components

| Component | Description |
|-----------|-------------|
| `I18nProvider` | Provides i18n context to the component tree |
| `Trans` | Rich text with component interpolation |
| `Plural` | Locale-aware pluralization via `Intl.PluralRules` |
| `Select` | Categorical value selection (gender, role, etc.) |
| `DateTime` | Date formatting via `Intl.DateTimeFormat` |
| `NumberFormat` | Number formatting via `Intl.NumberFormat` |

## Hooks

| Hook | Description |
|------|-------------|
| `useI18n()` | Full i18n context: `i18n`, `locale`, `setLocale`, `isLoading`, etc. |

## Framework Compatibility

Works with any React-based framework:

- React SPA (Vite)
- React Router
- Remix
- Next.js (App Router / Pages Router)

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
