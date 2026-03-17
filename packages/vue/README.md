# @fluenti/vue

**Compile-time i18n for Vue 3. Zero runtime parsing. Type-safe templates.**

[![npm version](https://img.shields.io/npm/v/@fluenti/vue?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/vue)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/vue?color=16a34a&label=size)](https://bundlephobia.com/package/@fluenti/vue)
[![license](https://img.shields.io/npm/l/@fluenti/vue?color=64748b)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

Your translations are compiled at build time into optimized functions — no ICU parser ships to the browser, no runtime overhead, just fast string lookups. Write natural language in your templates; Fluenti handles the rest.

---

## The Magic: Write Natural Language, Ship Optimized Code

### The `v-t` directive (compiled away at build time)

`v-t` is not a runtime directive. It is a **Vue compiler transform** that rewrites your templates during build. What you write and what ships to production are two different things:

```vue
<!-- What you write -->
<template>
  <h1 v-t>Welcome to our app!</h1>
  <p v-t>Hello, {name}!</p>
  <p v-t.plural="count">one apple | {count} apples</p>
  <img v-t.alt alt="Hero banner" src="/hero.png" />
</template>
```

```vue
<!-- What ships to the browser (conceptual) -->
<template>
  <h1>{{ $t('a1b2c3') }}</h1>
  <p>{{ $t('d4e5f6', { name }) }}</p>
  <p>{{ $t('{count, plural, one {# apple} other {# apples}}', { count }) }}</p>
  <img :alt="$t('f7g8h9')" src="/hero.png" />
</template>
```

No parsing. No interpretation. Just a hash lookup into a pre-compiled catalog. This is what compile-time i18n means.

### The `t` tagged template (in `<script setup>`)

For programmatic translations outside of templates, use `msg` with `useI18n()`:

```vue
<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t } = useI18n()

const greeting = t('Hello, {name}!', { name: 'World' })
const formatted = t('You have {count} items', { count: 42 })
</script>
```

---

## Quick Start

### 1. Install

```bash
pnpm add @fluenti/core @fluenti/vue @fluenti/vite-plugin
```

### 2. Configure Vite

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [vue(), fluenti({ framework: 'vue' })],
}
```

### 3. Create the plugin

```ts
// main.ts
import { createApp } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import App from './App.vue'
import en from './locales/compiled/en'
import ja from './locales/compiled/ja'

const fluent = createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ja },
})

const app = createApp(App)
app.use(fluent)
app.mount('#app')
```

### 4. Use in your SFC

```vue
<script setup>
import { useI18n } from '@fluenti/vue'

const { locale, setLocale } = useI18n()
</script>

<template>
  <h1 v-t>Hello, world!</h1>
  <p v-t>Welcome to our application.</p>

  <button @click="setLocale('ja')">日本語</button>
</template>
```

That's it. Four files, zero boilerplate.

---

## Components

### `<Trans>` — Rich Text with HTML and Components

Translate text that contains inline HTML elements or Vue components. Child elements are preserved through the translation round-trip:

```vue
<template>
  <Trans>Read the <a href="/docs">documentation</a></Trans>
  <Trans>Click <RouterLink to="/next">here</RouterLink> to continue.</Trans>
</template>
```

| Prop  | Type     | Default  | Description     |
|-------|----------|----------|-----------------|
| `tag` | `string` | `'span'` | Wrapper element |

### `<Plural>` — Plural Forms

Full ICU plural support as a component. Use string props for simple cases, or named slots for rich text:

```vue
<template>
  <!-- Simple: string props -->
  <Plural :value="count" zero="No items" one="1 item" other="{count} items" />

  <!-- Rich: named slots -->
  <Plural :value="count">
    <template #zero>No <strong>items</strong> left</template>
    <template #one><em>1</em> item remaining</template>
    <template #other><strong>{{ count }}</strong> items remaining</template>
  </Plural>
</template>
```

| Prop    | Type     | Default  | Description                          |
|---------|----------|----------|--------------------------------------|
| `value` | `number` | required | The count to pluralize on            |
| `zero`  | `string` | --       | Text for zero items (ICU `=0`)       |
| `one`   | `string` | --       | Singular form                        |
| `two`   | `string` | --       | Dual form                            |
| `few`   | `string` | --       | Few form (some languages)            |
| `many`  | `string` | --       | Many form (some languages)           |
| `other` | `string` | `''`     | Default/fallback form                |
| `tag`   | `string` | `'span'` | Wrapper element                      |

Slots: `#zero`, `#one`, `#two`, `#few`, `#many`, `#other` -- each receives `{ count }` as slot props.

### `<Select>` — Gender / Option Selection

ICU select patterns as a component:

```vue
<template>
  <!-- String props -->
  <Select :value="gender" male="He liked this" female="She liked this" other="They liked this" />

  <!-- Options map (recommended for dynamic keys) -->
  <Select :value="role" :options="{ admin: 'Administrator', editor: 'Editor' }" other="Viewer" />

  <!-- Rich text via slots -->
  <Select :value="gender">
    <template #male><strong>He</strong> liked this</template>
    <template #female><strong>She</strong> liked this</template>
    <template #other><em>They</em> liked this</template>
  </Select>
</template>
```

| Prop      | Type                      | Default  | Description                        |
|-----------|---------------------------|----------|------------------------------------|
| `value`   | `string`                  | required | The value to match against         |
| `options` | `Record<string, string>`  | --       | Named options map                  |
| `other`   | `string`                  | `''`     | Fallback when no option matches    |
| `tag`     | `string`                  | `'span'` | Wrapper element                    |

Slots: Named slots matching option keys, each receives `{ value }` as slot props.

---

## `v-t` Directive Reference

| Modifier       | Effect                            |
|----------------|-----------------------------------|
| _(none)_       | Translates text content           |
| `.plural`      | Enables plural forms (pipe syntax)|
| `.alt`         | Translates the `alt` attribute    |
| `.placeholder` | Translates the `placeholder` attribute |
| `.title`       | Translates the `title` attribute  |
| `.{attr}`      | Translates any named attribute    |

```vue
<template>
  <h1 v-t>Hello, world!</h1>
  <p v-t.plural="count">one apple | {count} apples</p>
  <img v-t.alt alt="Welcome banner" src="banner.png" />
  <input v-t.placeholder placeholder="Search..." />
</template>
```

---

## `useI18n()` Composable

The full API surface, available inside any component with the plugin installed:

```vue
<script setup>
import { useI18n } from '@fluenti/vue'

const { t, d, n, locale, setLocale } = useI18n()
</script>

<template>
  <p>{{ t('Hello, {name}!', { name: 'World' }) }}</p>
  <p>{{ d(new Date(), 'long') }}</p>
  <p>{{ n(1234.5, 'currency') }}</p>
  <button @click="setLocale('ja')">日本語</button>
</template>
```

| Method          | Signature                                                      | Description                                              |
|-----------------|----------------------------------------------------------------|----------------------------------------------------------|
| `t`             | `(id: string \| MessageDescriptor, values?) => string`         | Translate a key with optional interpolation              |
| `d`             | `(value: Date \| number, style?) => string`                    | Format a date using `dateFormats` presets or Intl        |
| `n`             | `(value: number, style?) => string`                            | Format a number using `numberFormats` presets or Intl    |
| `format`        | `(message: string, values?) => string`                         | Format an ICU message string directly (no catalog lookup)|
| `te`            | `(key: string, locale?) => boolean`                            | Check if a translation key exists                        |
| `tm`            | `(key: string, locale?) => CompiledMessage \| undefined`       | Get the raw compiled message without interpolation       |
| `locale`        | `Ref<string>` (readonly)                                       | Reactive ref for the current locale                      |
| `setLocale`     | `(locale: string) => Promise<void>`                            | Change locale (async when splitting is enabled)          |
| `loadMessages`  | `(locale: string, messages: Messages) => void`                 | Dynamically add messages for a locale at runtime         |
| `getLocales`    | `() => string[]`                                               | Get all locales that have loaded messages                |
| `preloadLocale` | `(locale: string) => void`                                     | Preload a locale chunk in the background                 |
| `isLoading`     | `Ref<boolean>` (readonly)                                      | Whether a locale chunk is currently being loaded         |
| `loadedLocales` | `Ref<ReadonlySet<string>>` (readonly)                          | Set of locales whose messages have been loaded           |

---

## Plugin Options

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
    long:  { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    relative: 'relative',
  },
  numberFormats: {
    currency: { style: 'currency', currency: 'USD' },
    percent:  { style: 'percent', minimumFractionDigits: 1 },
  },
  missing: (locale, id) => `[missing: ${id}]`,
  componentPrefix: 'I18n',   // registers I18nTrans, I18nPlural, I18nSelect
  splitting: true,
  chunkLoader: (locale) => import(`./locales/${locale}.js`),
})
```

| Option            | Type                               | Default | Description                                              |
|-------------------|------------------------------------|---------|----------------------------------------------------------|
| `locale`          | `string`                           | --      | Active locale code (required)                            |
| `messages`        | `Record<string, Messages>`         | --      | Pre-loaded message catalogs (required)                   |
| `fallbackLocale`  | `string`                           | --      | Locale to try when a key is missing                      |
| `fallbackChain`   | `Record<string, string[]>`         | --      | Locale-specific fallback chains (`'*'` for default)      |
| `dateFormats`     | `Record<string, DateTimeFormatOptions \| 'relative'>` | -- | Named date format presets for `d()`             |
| `numberFormats`   | `Record<string, NumberFormatOptions>` | --   | Named number format presets for `n()`                    |
| `missing`         | `(locale, id) => string \| undefined` | --  | Handler called when a translation key is not found       |
| `componentPrefix` | `string`                           | `''`    | Prefix for globally registered components                |
| `splitting`       | `boolean`                          | `false` | Enable async code-splitting mode                         |
| `chunkLoader`     | `(locale) => Promise<Messages>`    | --      | Async loader for locale chunks (requires `splitting`)    |

---

## Code Splitting

For large apps, load locale messages on demand instead of bundling everything upfront:

```ts
const fluent = createFluentVue({
  locale: 'en',
  messages: { en },           // only the default locale is bundled
  splitting: true,
  chunkLoader: (locale) => import(`./locales/compiled/${locale}.js`),
})

// Later: switching locale triggers async loading
await fluent.global.setLocale('ja')  // loads ja chunk, then switches
```

Preload locales in the background for instant switching:

```vue
<script setup>
const { setLocale, isLoading, preloadLocale } = useI18n()
</script>

<template>
  <button @mouseenter="preloadLocale('ja')" @click="setLocale('ja')" :disabled="isLoading">
    {{ isLoading ? 'Loading...' : '日本語' }}
  </button>
</template>
```

---

## SSR / SSG Support

`createFluentVue()` creates entirely fresh state per call -- no module-level singletons. Call it once per SSR request to avoid locale leaking between users.

For server-side i18n in Nuxt or custom Vue SSR setups, use the dedicated server utilities:

```ts
import { createServerI18n, detectLocale, getSSRLocaleScript } from '@fluenti/vue/server'

const { setLocale, getI18n } = createServerI18n({
  loadMessages: (locale) => import(`./locales/compiled/${locale}.js`),
  fallbackLocale: 'en',
})
```

SSR utilities included:
- `createServerI18n()` -- per-request i18n with lazy message loading and caching
- `detectLocale()` -- locale detection from cookies, headers, path, or query
- `getSSRLocaleScript()` -- inline script tag for hydration
- `getHydratedLocale()` -- read the hydrated locale on the client
- `isRTL()` / `getDirection()` -- RTL/LTR detection

---

## Documentation

Full documentation at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
