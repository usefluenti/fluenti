# @fluenti/vue-i18n-compat

[![npm](https://img.shields.io/npm/v/@fluenti/vue-i18n-compat?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/vue-i18n-compat)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/vue-i18n-compat?color=22c55e&label=size)](https://bundlephobia.com/package/@fluenti/vue-i18n-compat)
[![license](https://img.shields.io/npm/l/@fluenti/vue-i18n-compat?color=gray)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Drop-in migration from vue-i18n to Fluenti.** Keep your existing `$t()` calls, swap one plugin, and adopt compile-time i18n at your own pace.

---

## Why?

Rewriting every translation call in a large Vue app is impractical. This package lets you:

- **Keep existing code working** -- `$t()`, `$tc()`, `$te()`, and the Composition API all behave the same way they always have.
- **Add Fluenti incrementally** -- new features use ICU MessageFormat and compile-time transforms; legacy messages stay in vue-i18n format until you are ready to move them.
- **Share locale state** -- switching language in one library automatically updates the other, so users never see mixed-language UI.
- **Remove it when you are done** -- once every message is migrated, swap `@fluenti/vue-i18n-compat` for `@fluenti/vue` and delete vue-i18n.

## Quick Start

### 1. Install

```bash
pnpm add @fluenti/vue-i18n-compat @fluenti/core @fluenti/vue
# vue ^3.5 and vue-i18n ^9 || ^10 are peer dependencies
```

### 2. Swap the Plugin

**Before** (vue-i18n only):

```ts
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: { greeting: 'Hello!', farewell: 'Goodbye, {name}!' },
    ja: { greeting: 'こんにちは！', farewell: 'さようなら、{name}！' },
  },
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

**After** (bridge installed, existing code unchanged):

```ts
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '@fluenti/vue-i18n-compat'

// Your existing vue-i18n setup -- nothing changes here
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: { greeting: 'Hello!', farewell: 'Goodbye, {name}!' },
    ja: { greeting: 'こんにちは！', farewell: 'さようなら、{name}！' },
  },
})

// Fluenti setup (empty for now -- you will add messages here over time)
const fluenti = createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: {}, ja: {} },
})

// Bridge: one plugin to rule them both
const bridge = createFluentBridge({ vueI18n: i18n, fluenti })

const app = createApp(App)
app.use(bridge)   // replaces app.use(i18n)
app.mount('#app')
```

### 3. Existing Code Works

Every `$t('greeting')` in your templates and every `useI18n()` in your `<script setup>` blocks keeps working. No changes required.

```vue
<template>
  <!-- These calls hit vue-i18n, just like before -->
  <h1>{{ $t('greeting') }}</h1>
  <p>{{ $t('farewell', { name: 'Alice' }) }}</p>
</template>
```

### 4. Gradually Migrate

Move messages one at a time. When a key exists in both libraries, the bridge resolves it from Fluenti first (configurable).

```ts
// Before: vue-i18n format
{ greeting: 'Hello!' }

// After: ICU MessageFormat in Fluenti
{ greeting: 'Hello!' }  // simple strings are identical

// Before: vue-i18n plural (pipe syntax)
{ items: 'no items | one item | {count} items' }

// After: ICU plural in Fluenti
{ items: '{count, plural, =0 {no items} one {one item} other {# items}}' }
```

Once a key is in Fluenti, delete it from the vue-i18n messages object. When every key has been moved, replace the bridge with `@fluenti/vue` directly:

```diff
- import { createFluentBridge } from '@fluenti/vue-i18n-compat'
+ import { createFluentVue } from '@fluenti/vue'

- app.use(bridge)
+ app.use(fluenti)
```

## Usage

### Composition API

```vue
<script setup>
import { useI18n } from '@fluenti/vue-i18n-compat'

const { t, tc, te, locale, setLocale, availableLocales } = useI18n()
</script>

<template>
  <h1>{{ t('greeting') }}</h1>          <!-- vue-i18n key -->
  <p>{{ t('welcome') }}</p>              <!-- Fluenti key -->
  <p v-if="te('greeting')">Exists!</p>  <!-- checks both libraries -->
  <p>{{ tc('items', count) }}</p>        <!-- pipe-separated or ICU plurals -->

  <button @click="setLocale('ja')">日本語</button>
</template>
```

### Options API

`$t`, `$te`, and `$tc` are overridden globally -- existing templates work without changes.

```vue
<template>
  <p>{{ $t('greeting') }}</p>
  <p>{{ $tc('items', 3) }}</p>
  <p v-if="$te('farewell')">{{ $t('farewell', { name: 'Bob' }) }}</p>
</template>
```

## How It Works

```
┌────────────┐   locale sync   ┌─────────┐
│  vue-i18n  │◄───────────────►│ Fluenti │
└─────┬──────┘                 └────┬────┘
      │      ┌──────────────┐       │
      └─────►│    Bridge    │◄──────┘
             │ t / tc / te  │
             └──────────────┘
```

The bridge installs both libraries as a single Vue plugin. Locale state is synced bidirectionally -- switching language in one library automatically updates the other. Translation lookups fall through: if the primary library does not have a key, the bridge checks the other.

## API Reference

### `createFluentBridge(options)`

Creates the bridge plugin. Call `app.use(bridge)` instead of `app.use(i18n)`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `vueI18n` | `VueI18nInstance` | **required** | vue-i18n instance from `createI18n()` |
| `fluenti` | `FluentVuePlugin` | **required** | Fluenti plugin from `createFluentVue()` |
| `priority` | `'fluenti-first' \| 'vue-i18n-first'` | `'fluenti-first'` | Which library to check first for translations |

### `useI18n()`

Returns the `BridgeContext`. Must be called inside a component where the bridge plugin is installed.

### `BridgeContext`

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `t(key, values?)` | `string` | Translate -- checks both libraries per priority |
| `tc(key, count, values?)` | `string` | Pluralized translation (pipe syntax or ICU) |
| `te(key, locale?)` | `boolean` | Check if key exists in either library |
| `tm(key)` | `unknown` | Get the raw message object |
| `d(value, style?)` | `string` | Format a date |
| `n(value, style?)` | `string` | Format a number |
| `format(message, values?)` | `string` | Format an ICU message string directly |
| `locale` | `Ref<string>` | Reactive locale (synced across both libraries) |
| `setLocale(locale)` | `Promise<void>` | Change locale (syncs to both libraries) |
| `availableLocales` | `ComputedRef<string[]>` | Merged locales from both libraries |
| `isLoading` | `Ref<boolean>` | Whether Fluenti is loading a locale chunk |
| `fluenti` | `FluentVueContext` | Access the underlying Fluenti context |
| `vueI18n` | `VueI18nGlobal` | Access the underlying vue-i18n global composer |

## Compatibility Matrix

| vue-i18n feature | Supported | Notes |
|------------------|-----------|-------|
| `$t()` / `t()` | Yes | Bridged with fallthrough to both libraries |
| `$tc()` / `tc()` | Yes | Pipe-separated plurals via vue-i18n; ICU plurals via Fluenti |
| `$te()` / `te()` | Yes | Returns `true` if key exists in either library |
| `$tm()` / `tm()` | Yes | Returns raw message from priority library |
| `$d()` / `d()` | Yes | Delegates to Fluenti's date formatter |
| `$n()` / `n()` | Yes | Delegates to Fluenti's number formatter |
| `useI18n()` | Yes | Returns unified `BridgeContext` |
| Composition API mode | Yes | Requires `legacy: false` in vue-i18n |
| Legacy API mode | No | Use `legacy: false` -- the bridge requires the Composition API |
| Component interpolation (`<i18n-t>`) | No | Use Fluenti's `<Trans>` component instead |
| Custom directives (`v-t`) | No | Fluenti uses `v-t` as a compile-time node transform |
| Per-component `i18n` blocks | No | Use Fluenti's file-based catalogs or `defineMessages()` |

## Migration Checklist

1. Install the bridge alongside your existing vue-i18n setup
2. Verify your app works without any other changes
3. Write new features using Fluenti messages (ICU MessageFormat)
4. Move existing messages from vue-i18n format to ICU format, one file at a time
5. Remove empty vue-i18n locale objects as they become unnecessary
6. When all messages are migrated, replace the bridge with `@fluenti/vue` and uninstall vue-i18n

## Documentation

Full documentation at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
