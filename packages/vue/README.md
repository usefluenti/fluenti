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

## Usage

### `v-t` Directive (compiled away at build time)

```vue
<template>
  <h1 v-t>Hello, world!</h1>
  <p v-t.plural="count">one apple | {count} apples</p>
  <img v-t.alt alt="Welcome banner" src="banner.png" />
</template>
```

### `useI18n()` Composable

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

### Components

```vue
<template>
  <!-- Rich text with HTML elements -->
  <Trans>Read the <a href="/docs">documentation</a></Trans>

  <!-- Plurals (string props) -->
  <Plural :value="count" zero="No items" one="1 item" other="{count} items" />

  <!-- Plurals (rich text via named slots) -->
  <Plural :value="count">
    <template #zero>No <strong>items</strong> left</template>
    <template #one><em>1</em> item remaining</template>
    <template #other><strong>{{ count }}</strong> items remaining</template>
  </Plural>

  <!-- Gender select (string props) -->
  <Select :value="gender" male="He" female="She" other="They" />

  <!-- Gender select (rich text via named slots) -->
  <Select :value="gender">
    <template #male><strong>He</strong> liked this</template>
    <template #female><strong>She</strong> liked this</template>
    <template #other><em>They</em> liked this</template>
  </Select>
</template>
```

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
