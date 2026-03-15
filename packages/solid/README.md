# @fluenti/solid

[![npm](https://img.shields.io/npm/v/@fluenti/solid?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/solid)

SolidJS compile-time i18n — `<Trans>` / `<Plural>` / `<Select>` components, `I18nProvider`, and `useI18n()` hook.

## Install

```bash
pnpm add @fluenti/core @fluenti/solid @fluenti/vite-plugin
```

## Setup

```tsx
// index.tsx
import { render } from 'solid-js/web'
import { I18nProvider, createI18n } from '@fluenti/solid'
import App from './App'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ja },
})

render(
  () => (
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>
  ),
  document.getElementById('root')!,
)
```

```ts
// vite.config.ts
import solidPlugin from 'vite-plugin-solid'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [solidPlugin(), fluenti({ framework: 'solid' })],
}
```

## Usage

### `useI18n()` Hook

```tsx
import { useI18n } from '@fluenti/solid'

function Greeting() {
  const { t, d, n, locale, setLocale } = useI18n()

  return (
    <div>
      <p>{t('Hello, {name}!', { name: 'World' })}</p>
      <p>{d(new Date(), 'long')}</p>
      <p>{n(1234.5, 'currency')}</p>
      <button onClick={() => setLocale('ja')}>Japanese</button>
    </div>
  )
}
```

### Components

```tsx
import { Trans, Plural, Select } from '@fluenti/solid'

function Demo(props) {
  return (
    <>
      {/* Rich text with JSX elements */}
      <Trans>Read the <a href="/docs">documentation</a></Trans>

      {/* Plurals (string props) */}
      <Plural value={props.count} zero="No items" one="1 item" other="{count} items" />

      {/* Plurals (rich text via JSX element props) */}
      <Plural
        value={props.count}
        zero={<>No <strong>items</strong> left</>}
        one={<><em>1</em> item remaining</>}
        other={<><strong>{props.count}</strong> items remaining</>}
      />

      {/* Gender select (string props) */}
      <Select value={props.gender} male="He" female="She" other="They" />

      {/* Gender select (rich text via JSX element props) */}
      <Select
        value={props.gender}
        options={{
          male: <><strong>He</strong> liked this</>,
          female: <><strong>She</strong> liked this</>,
        }}
        other={<><em>They</em> liked this</>}
      />
    </>
  )
}
```

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
