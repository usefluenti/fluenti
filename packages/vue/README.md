# @fluenti/vue

[![npm](https://img.shields.io/npm/v/@fluenti/vue?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vue)

Vue 3 compile-time i18n — `v-t` directive, `<Trans>` / `<Plural>` / `<Select>` components, and `useI18n()` composable.

## Install

```bash
pnpm add @fluenti/core @fluenti/vue @fluenti/vite-plugin
```

## Setup

```ts
// main.ts
import { createApp } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import App from './App.vue'

const fluent = createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ja },
})

const app = createApp(App)
app.use(fluent)
app.mount('#app')
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [vue(), fluenti({ framework: 'vue' })],
}
```

## Plugin Options

`createFluentVue()` accepts the following options:

```ts
const fluent = createFluentVue({
  // Required
  locale: 'en',
  messages: { en, ja, zh },

  // Optional
  fallbackLocale: 'en',
  fallbackChain: { 'zh-TW': ['zh', 'en'], '*': ['en'] },
  dateFormats: {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    relative: 'relative',
  },
  numberFormats: {
    currency: { style: 'currency', currency: 'USD' },
    percent: { style: 'percent', minimumFractionDigits: 1 },
  },
  missing: (locale, id) => `[missing: ${id}]`,
  componentPrefix: 'I18n',   // registers I18nTrans, I18nPlural, I18nSelect
  splitting: true,            // enable code-splitting mode
  chunkLoader: (locale) => import(`./locales/${locale}.js`),
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | `string` | — | Active locale code (required) |
| `messages` | `Record<string, Messages>` | — | Pre-loaded message catalogs (required) |
| `fallbackLocale` | `string` | — | Locale to try when a key is missing in the active locale |
| `fallbackChain` | `Record<string, string[]>` | — | Locale-specific fallback chains. Use `'*'` for a default chain |
| `dateFormats` | `Record<string, DateTimeFormatOptions \| 'relative'>` | — | Named date format presets for `d()` |
| `numberFormats` | `Record<string, NumberFormatOptions>` | — | Named number format presets for `n()` |
| `missing` | `(locale, id) => string \| undefined` | — | Handler called when a translation key is not found |
| `componentPrefix` | `string` | `''` | Prefix for globally registered components |
| `splitting` | `boolean` | `false` | Enable async code-splitting mode |
| `chunkLoader` | `(locale) => Promise<Messages>` | — | Async loader for locale chunks (requires `splitting: true`) |

### Fallback Chain

When `t()` cannot find a key in the current locale, it tries each locale in the chain:

```ts
createFluentVue({
  locale: 'zh-TW',
  fallbackChain: {
    'zh-TW': ['zh', 'en'],  // zh-TW → zh → en
    'ja': ['en'],            // ja → en
    '*': ['en'],             // all others → en
  },
  // ...
})
```

Resolution order: current locale → `fallbackChain[locale]` → `fallbackLocale` → key ID as-is.

### Code Splitting

For large apps, load locale messages on demand instead of bundling all upfront:

```ts
const fluent = createFluentVue({
  locale: 'en',
  messages: { en },           // only default locale bundled
  splitting: true,
  chunkLoader: (locale) => import(`./locales/compiled/${locale}.js`),
})

// Later: switching locale triggers async loading
await fluent.global.setLocale('ja')  // loads ja chunk, then switches
```

## Usage

### `v-t` Directive (compiled away at build time)

```vue
<template>
  <h1 v-t>Hello, world!</h1>
  <p v-t.plural="count">one apple | {count} apples</p>
  <img v-t.alt alt="Welcome banner" src="banner.png" />
  <input v-t.placeholder placeholder="Search..." />
</template>
```

| Modifier | Effect |
|----------|--------|
| _(none)_ | Translates text content |
| `.plural` | Enables plural forms with pipe syntax |
| `.alt` | Translates the `alt` attribute |
| `.placeholder` | Translates the `placeholder` attribute |
| `.title` | Translates the `title` attribute |
| `.{attr}` | Translates any named attribute |

### `useI18n()` Composable

Returns the full Fluenti context. Must be called inside a component that has the plugin installed.

```vue
<script setup>
import { useI18n } from '@fluenti/vue'

const { t, d, n, locale, setLocale } = useI18n()
</script>

<template>
  <p>{{ t('Hello, {name}!', { name: 'World' }) }}</p>
  <p>{{ d(new Date(), 'long') }}</p>
  <p>{{ n(1234.5, 'currency') }}</p>
  <button @click="setLocale('ja')">Japanese</button>
</template>
```

#### Full API Reference

| Method | Signature | Description |
|--------|-----------|-------------|
| `t` | `(id: string \| MessageDescriptor, values?) => string` | Translate a key with optional interpolation |
| `d` | `(value: Date \| number, style?) => string` | Format a date (uses `dateFormats` presets or Intl defaults) |
| `n` | `(value: number, style?) => string` | Format a number (uses `numberFormats` presets or Intl defaults) |
| `format` | `(message: string, values?) => string` | Format an ICU message string directly (no catalog lookup) |
| `te` | `(key: string, locale?) => boolean` | Check if a translation key exists |
| `tm` | `(key: string, locale?) => CompiledMessage \| undefined` | Get the raw compiled message without interpolation |
| `locale` | `Ref<string>` (readonly) | Reactive ref for the current locale |
| `setLocale` | `(locale: string) => Promise<void>` | Change locale (async when splitting is enabled) |
| `loadMessages` | `(locale: string, messages: Messages) => void` | Dynamically add messages for a locale at runtime |
| `getLocales` | `() => string[]` | Get all locales that have loaded messages |
| `preloadLocale` | `(locale: string) => void` | Preload a locale chunk in the background without switching |
| `isLoading` | `Ref<boolean>` (readonly) | Whether a locale chunk is currently being loaded |
| `loadedLocales` | `Ref<ReadonlySet<string>>` (readonly) | Set of locales whose messages have been loaded |

#### `te()` — Translation Existence Check

```vue
<script setup>
const { te, t } = useI18n()
</script>

<template>
  <p v-if="te('welcome.premium')">{{ t('welcome.premium') }}</p>
  <p v-else>{{ t('welcome.default') }}</p>
</template>
```

#### `format()` — Direct ICU Formatting

Format an ICU message string without looking up a key in the catalog:

```vue
<script setup>
const { format } = useI18n()
const msg = format('{count, plural, =0 {No items} one {# item} other {# items}}', { count: 5 })
// → "5 items"
</script>
```

#### Async Locale Loading

```vue
<script setup>
const { setLocale, isLoading, loadedLocales, preloadLocale } = useI18n()

// Preload Japanese in the background (e.g. on hover)
function onHover() {
  preloadLocale('ja')
}

// Switch locale (instant if preloaded, async otherwise)
async function switchToJa() {
  await setLocale('ja')
}
</script>

<template>
  <button @mouseenter="onHover" @click="switchToJa" :disabled="isLoading">
    {{ isLoading ? 'Loading...' : '日本語' }}
  </button>
  <p>Loaded: {{ [...loadedLocales].join(', ') }}</p>
</template>
```

### Components

#### `<Trans>` — Rich Text

Render translated text containing HTML elements or Vue components:

```vue
<template>
  <!-- Inline elements are preserved in the translation -->
  <Trans>Read the <a href="/docs">documentation</a></Trans>

  <!-- Works with Vue components too -->
  <Trans>Click <RouterLink to="/next">here</RouterLink> to continue.</Trans>
</template>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tag` | `string` | `'span'` | Wrapper element |

#### `<Plural>` — Plural Forms

ICU plural patterns as a component. Supports string props or rich text via named slots.

```vue
<template>
  <!-- String props (simple) -->
  <Plural :value="count" zero="No items" one="1 item" other="{count} items" />

  <!-- Rich text via named slots -->
  <Plural :value="count">
    <template #zero>No <strong>items</strong> left</template>
    <template #one><em>1</em> item remaining</template>
    <template #other><strong>{{ count }}</strong> items remaining</template>
  </Plural>
</template>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | The count to pluralise on (required) |
| `zero` | `string` | — | Text for zero items (maps to ICU `=0`) |
| `one` | `string` | — | Singular form |
| `two` | `string` | — | Dual form |
| `few` | `string` | — | Few form (used in some languages) |
| `many` | `string` | — | Many form (used in some languages) |
| `other` | `string` | `''` | Default/other form |
| `tag` | `string` | `'span'` | Wrapper element |

Slots: `#zero`, `#one`, `#two`, `#few`, `#many`, `#other` — each receives `{ count }` as slot props.

#### `<Select>` — Gender / Option Selection

ICU select patterns as a component:

```vue
<template>
  <!-- String props -->
  <Select :value="gender" male="He" female="She" other="They" />

  <!-- Type-safe options prop (recommended) -->
  <Select
    :value="role"
    :options="{ admin: 'Administrator', editor: 'Editor' }"
    other="Viewer"
  />

  <!-- Rich text via named slots -->
  <Select :value="gender">
    <template #male><strong>He</strong> liked this</template>
    <template #female><strong>She</strong> liked this</template>
    <template #other><em>They</em> liked this</template>
  </Select>
</template>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | The value to match against (required) |
| `options` | `Record<string, string>` | — | Named options map (recommended) |
| `other` | `string` | `''` | Fallback when no option matches |
| `tag` | `string` | `'span'` | Wrapper element |

Slots: Named slots matching option keys, each receives `{ value }` as slot props.

## SSR Safety

`createFluentVue()` creates entirely fresh state per call — no module-level singletons. Call it once per SSR request to avoid locale leaking between users.

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
