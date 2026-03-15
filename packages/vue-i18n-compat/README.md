# @fluenti/vue-i18n-compat

[![npm](https://img.shields.io/npm/v/@fluenti/vue-i18n-compat?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vue-i18n-compat)

Progressive migration bridge between **vue-i18n** and **Fluenti** — run both libraries side by side with shared locale state, then migrate messages at your own pace.

## Install

```bash
pnpm add @fluenti/vue-i18n-compat @fluenti/core @fluenti/vue
```

Peer dependencies: `vue ^3.5`, `vue-i18n ^9 || ^10`.

## How It Works

The bridge installs both vue-i18n and Fluenti as a single Vue plugin. Locale state is synced bidirectionally so switching language in one library automatically updates the other. Translation lookups fall through: if the primary library doesn't have a key, the bridge checks the other.

```
┌────────────┐   locale sync   ┌─────────┐
│  vue-i18n  │◄───────────────►│ Fluenti │
└─────┬──────┘                 └────┬────┘
      │      ┌──────────────┐       │
      └─────►│ Bridge (t/te/tc) ◄───┘
             └──────────────┘
```

## Setup

```ts
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '@fluenti/vue-i18n-compat'
import App from './App.vue'

// 1. Existing vue-i18n setup (your legacy translations)
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: { greeting: 'Hello!', farewell: 'Goodbye, {name}!' },
    ja: { greeting: 'こんにちは！', farewell: 'さようなら、{name}！' },
  },
})

// 2. New Fluenti setup (migrated translations using ICU MessageFormat)
const fluenti = createFluentVue({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { welcome: 'Welcome to Fluenti!' },
    ja: { welcome: 'Fluentiへようこそ！' },
  },
})

// 3. Bridge them together
const bridge = createFluentBridge({
  vueI18n: i18n,
  fluenti,
  priority: 'fluenti-first', // check Fluenti first, fall back to vue-i18n
})

const app = createApp(App)
app.use(bridge) // installs both plugins + locale sync
app.mount('#app')
```

## Usage

### In Components (Composition API)

```vue
<script setup>
import { useI18n } from '@fluenti/vue-i18n-compat'

const { t, te, tc, locale, setLocale, availableLocales } = useI18n()
</script>

<template>
  <!-- Works with keys from either library -->
  <h1>{{ t('greeting') }}</h1>          <!-- vue-i18n key -->
  <p>{{ t('welcome') }}</p>              <!-- Fluenti key -->

  <!-- Check if a key exists in either library -->
  <p v-if="te('greeting')">Key exists!</p>

  <!-- Legacy pipe-separated plurals still work -->
  <p>{{ tc('items', count) }}</p>

  <button @click="setLocale('ja')">日本語</button>
</template>
```

### Options API

The bridge overrides `$t`, `$te`, and `$tc` global properties, so existing templates continue to work without changes.

```vue
<template>
  <p>{{ $t('greeting') }}</p>
  <p>{{ $te('missing.key') }}</p>
</template>
```

## API

### `createFluentBridge(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `vueI18n` | `VueI18nInstance` | required | vue-i18n instance from `createI18n()` |
| `fluenti` | `FluentVuePlugin` | required | Fluenti plugin from `createFluentVue()` |
| `priority` | `'fluenti-first' \| 'vue-i18n-first'` | `'fluenti-first'` | Which library to check first for translations |

### `BridgeContext`

The bridge context (available via `useI18n()` or `bridge.global`) provides:

| Method | Description |
|--------|-------------|
| `t(key, values?)` | Translate — checks both libraries per priority |
| `tc(key, count, values?)` | Pluralized translation (vue-i18n pipe syntax or ICU) |
| `te(key, locale?)` | Check if key exists in either library |
| `tm(key)` | Get raw message object |
| `d(value, style?)` | Format a date |
| `n(value, style?)` | Format a number |
| `locale` | Reactive locale ref (synced across both libraries) |
| `setLocale(locale)` | Change locale (syncs to both libraries) |
| `availableLocales` | Merged locales from both libraries |
| `fluenti` | Access underlying Fluenti context |
| `vueI18n` | Access underlying vue-i18n global composer |

## Migration Strategy

1. **Install the bridge** alongside your existing vue-i18n setup
2. **New features** use Fluenti messages (ICU MessageFormat)
3. **Gradually move** existing messages from vue-i18n format to ICU format
4. **Remove the bridge** when all messages are migrated — switch to `@fluenti/vue` directly

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
