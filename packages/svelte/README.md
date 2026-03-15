# @fluenti/svelte

[![npm](https://img.shields.io/npm/v/@fluenti/svelte?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/svelte)

Svelte 5 compile-time i18n — `<Trans>` / `<Plural>` / `<Select>` components, `setI18nContext()`, and `getI18n()` hook.

## Install

```bash
pnpm add @fluenti/core @fluenti/svelte @fluenti/vite-plugin
```

## Setup

```svelte
<!-- +layout.svelte (or root component) -->
<script lang="ts">
  import { setI18nContext } from '@fluenti/svelte'
  import en from './locales/compiled/en'
  import ja from './locales/compiled/ja'

  const i18n = setI18nContext({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en, ja },
  })

  let { children } = $props()
</script>

{@render children()}
```

```ts
// vite.config.ts
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [svelte(), fluenti({ framework: 'svelte' })],
}
```

## Usage

### `getI18n()` Hook

```svelte
<script lang="ts">
  import { getI18n } from '@fluenti/svelte'

  const { t, d, n, locale, setLocale } = getI18n()
</script>

<p>{t('Hello, {name}!', { name: 'World' })}</p>
<p>{d(new Date(), 'long')}</p>
<p>{n(1234.5, 'currency')}</p>
<button onclick={() => setLocale('ja')}>Japanese</button>
```

### Components

```svelte
<script lang="ts">
  import { Trans, Plural, Select } from '@fluenti/svelte'
</script>

<!-- Rich text with HTML elements -->
<Trans>Read the <a href="/docs">documentation</a></Trans>

<!-- Plurals (string props) -->
<Plural value={count} zero="No items" one="1 item" other="{count} items" />

<!-- Plurals (rich text via snippet props) -->
<Plural value={count}>
  {#snippet zeroSnippet()}No <strong>items</strong> left{/snippet}
  {#snippet oneSnippet()}<em>1</em> item remaining{/snippet}
  {#snippet otherSnippet()}<strong>{count}</strong> items remaining{/snippet}
</Plural>

<!-- Gender select (string props) -->
<Select value={gender} male="He" female="She" other="They" />

<!-- Gender select (options map) -->
<Select
  value={gender}
  options={{ male: 'He liked this', female: 'She liked this' }}
  other="They liked this"
/>
```

### Dynamic Locale Loading

```svelte
<script lang="ts">
  import { setI18nContext } from '@fluenti/svelte'

  const i18n = setI18nContext({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en },
    loadMessages: (locale) => import(`./locales/compiled/${locale}.js`),
  })
</script>

<button onclick={() => i18n.setLocale('ja')}>Switch to Japanese</button>
{#if i18n.isLoading}
  <p>Loading...</p>
{/if}
```

## API

### `setI18nContext(options)`

Initialize the i18n context in a layout or root component. Must be called during component initialization.

| Option | Type | Description |
|--------|------|-------------|
| `locale` | `string` | Active locale (required) |
| `fallbackLocale` | `string` | Fallback when translation is missing |
| `messages` | `Record<string, Messages>` | Static message catalogs |
| `loadMessages` | `(locale: string) => Promise<Messages>` | Async loader for locale messages |
| `fallbackChain` | `Record<string, string[]>` | Custom fallback chains |
| `dateFormats` | `DateFormatOptions` | Named date format styles |
| `numberFormats` | `NumberFormatOptions` | Named number format styles |

### `getI18n()`

Retrieve the i18n context from a parent component. Returns an `I18nContext` with:

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `locale` | `string` | Current locale (reactive) |
| `isLoading` | `boolean` | True during async locale load (reactive) |
| `loadedLocales` | `string[]` | All loaded locale codes (reactive) |
| `setLocale(locale)` | `Promise<void>` | Switch locale (loads messages if needed) |
| `preloadLocale(locale)` | `Promise<void>` | Preload without switching |
| `t(id, values?)` | `string` | Translate a message by ID |
| `d(value, style?)` | `string` | Format a date |
| `n(value, style?)` | `string` | Format a number |
| `format(message, values?)` | `string` | Format an ICU message string directly |
| `loadMessages(locale, messages)` | `void` | Merge additional messages at runtime |
| `getLocales()` | `string[]` | Return all locale codes with loaded messages |

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
