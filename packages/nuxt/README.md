# @fluenti/nuxt

[![npm version](https://img.shields.io/npm/v/@fluenti/nuxt?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/nuxt)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/nuxt?color=16a34a&label=size)](https://bundlephobia.com/package/@fluenti/nuxt)
[![license](https://img.shields.io/npm/l/@fluenti/nuxt?color=888)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Compile-time i18n for Nuxt 3** -- locale routing, SEO head tags, and auto-imported composables that feel native to your Nuxt app. Zero runtime parsing, zero boilerplate.

## Why @fluenti/nuxt?

- **Auto-imported composables** -- `useLocalePath`, `useSwitchLocalePath`, `useLocaleHead`, and `useI18n` are available everywhere with no imports
- **SEO-ready** -- `hreflang` alternates, `og:locale` meta, and `html[lang]` generated automatically
- **Locale routing** -- four URL strategies (`prefix`, `prefix_except_default`, `prefix_and_default`, `no_prefix`)
- **Smart locale detection** -- configurable chain of path, cookie, header, and query detectors
- **SSR / SSG / SPA / ISR** -- works in every Nuxt rendering mode out of the box
- **Compile-time messages** -- translations are compiled at build time via `@fluenti/vite-plugin`, not interpreted at runtime

## Quick Start

### 1. Install

```bash
pnpm add @fluenti/nuxt @fluenti/core @fluenti/vue
```

### 2. Configure

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fluenti/nuxt'],
  fluenti: {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
  },
})
```

### 3. Use in Pages

```vue
<script setup>
// All composables are auto-imported -- no import needed
const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <h1>{{ t`Hello, world!` }}</h1>

  <nav>
    <NuxtLinkLocale to="/about">{{ t`About` }}</NuxtLinkLocale>
    <NuxtLink :to="localePath('/contact')">{{ t`Contact` }}</NuxtLink>
  </nav>

  <div>
    <button @click="setLocale('en')">English</button>
    <button @click="setLocale('ja')">日本語</button>
  </div>
</template>
```

That's it. Locale routing, cookie persistence, and SEO tags work automatically.

## Syntax Sugar

### `v-t` Directive

The `v-t` directive compiles translations at build time -- no runtime overhead:

```vue
<template>
  <h1 v-t>Hello, world!</h1>
  <p v-t>Welcome to {name}'s site</p>
</template>
```

### `<Trans>` Component

For rich text with embedded HTML and components:

```vue
<template>
  <Trans>
    Read the <NuxtLink to="/docs">documentation</NuxtLink> to get started.
  </Trans>
</template>
```

### Template Literal Tag

Use `` t`...` `` in script and template expressions:

```vue
<script setup>
const { t } = useI18n()
const greeting = computed(() => t`Hello, {name}!`)
</script>

<template>
  <p>{{ t`You have {count, plural, one {# item} other {# items}}` }}</p>
</template>
```

## Auto-imported APIs

Every API below is auto-imported by the module -- no `import` statements required:

| API | Source | Purpose |
|-----|--------|---------|
| `useI18n()` | `@fluenti/vue` | Access `t`, `locale`, `setLocale`, and message catalogs |
| `useLocalePath()` | `@fluenti/nuxt` | Generate locale-prefixed paths |
| `useSwitchLocalePath()` | `@fluenti/nuxt` | Get the current page path in another locale |
| `useLocaleHead()` | `@fluenti/nuxt` | Generate SEO `<head>` metadata |
| `<NuxtLinkLocale>` | `@fluenti/nuxt` | Locale-aware `<NuxtLink>` component |

## Locale Routing

Four URL strategies to match your project requirements:

| Strategy | Default locale | Other locales | Best for |
|----------|---------------|---------------|----------|
| `prefix_except_default` | `/about` | `/ja/about` | Most apps -- clean URLs for default locale |
| `prefix` | `/en/about` | `/ja/about` | Multilingual-first sites |
| `prefix_and_default` | `/about` + `/en/about` | `/ja/about` | Migration from prefix to no-prefix |
| `no_prefix` | `/about` | `/about` | Cookie/header detection only |

The module extends your Nuxt pages automatically -- locale-prefixed route variants are generated at build time with zero manual route config.

### Locale Redirect Middleware

With the `prefix` strategy, a global middleware redirects unprefixed URLs:

```
GET /about    -->  302  -->  /en/about   (detected via cookie/header/fallback)
GET /ja/about -->  (no redirect)
```

## SEO Head Tags

Generate `hreflang` alternates and Open Graph locale meta with one composable:

```vue
<script setup>
const head = useLocaleHead({
  addSeoAttributes: true,
  baseUrl: 'https://example.com',
})

useHead(head.value)
</script>
```

Output:

```html
<html lang="en">
<head>
  <link rel="alternate" hreflang="en" href="https://example.com/about" />
  <link rel="alternate" hreflang="ja" href="https://example.com/ja/about" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/about" />
  <meta property="og:locale" content="en" />
  <meta property="og:locale:alternate" content="ja" />
</head>
```

## Cookie-Based Locale Detection

Persist locale preference across visits with zero setup:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  fluenti: {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fluenti_locale',
      fallbackLocale: 'en',
    },
  },
})
```

The detection chain runs in order (`detectOrder: ['path', 'cookie', 'header']` by default). The first detector to resolve a locale wins.

| Detector | Reads from | Example |
|----------|-----------|---------|
| `path` | URL prefix | `/ja/about` -> `ja` |
| `cookie` | Cookie value | `fluenti_locale=ja` -> `ja` |
| `header` | `Accept-Language` | `ja,en;q=0.5` -> `ja` |
| `query` | Query parameter | `?locale=ja` -> `ja` |

## Components

### `<NuxtLinkLocale>`

A locale-aware drop-in replacement for `<NuxtLink>`:

```vue
<template>
  <!-- Automatically prefixes with current locale -->
  <NuxtLinkLocale to="/about">About</NuxtLinkLocale>

  <!-- Override locale -->
  <NuxtLinkLocale to="/about" locale="ja">About (JA)</NuxtLinkLocale>
</template>
```

All standard `<NuxtLink>` props are forwarded.

## Composables

### `useLocalePath()`

```vue
<script setup>
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink :to="localePath('/about')">About</NuxtLink>
  <NuxtLink :to="localePath('/about', 'ja')">About (JA)</NuxtLink>
</template>
```

### `useSwitchLocalePath()`

```vue
<script setup>
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <NuxtLink :to="switchLocalePath('en')">English</NuxtLink>
  <NuxtLink :to="switchLocalePath('ja')">日本語</NuxtLink>
</template>
```

### `useLocaleHead()`

```ts
const head = useLocaleHead({
  addSeoAttributes: true,  // hreflang + og:locale
  baseUrl: 'https://example.com',
})
useHead(head.value)
```

## Module Options

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  fluenti: {
    // Required
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',

    // Routing
    strategy: 'prefix_except_default',

    // Locale detection
    detectOrder: ['path', 'cookie', 'header'],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fluenti_locale',
      fallbackLocale: 'en',
    },

    // Build
    autoVitePlugin: true,
    componentPrefix: '',

    // ISR
    isr: { enabled: true, ttl: 3600 },
  },
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locales` | `string[]` | -- | Supported locale codes (required) |
| `defaultLocale` | `string` | `'en'` | Default locale code (required) |
| `strategy` | `Strategy` | `'prefix_except_default'` | URL routing strategy |
| `detectOrder` | `string[]` | `['path', 'cookie', 'header']` | Ordered list of locale detectors |
| `detectBrowserLanguage` | `object` | -- | Cookie and fallback settings |
| `autoVitePlugin` | `boolean` | `true` | Auto-register `@fluenti/vite-plugin` |
| `componentPrefix` | `string` | `''` | Prefix for i18n components |
| `isr` | `{ enabled, ttl? }` | -- | ISR route rules generation |
| `compat` | `boolean` | `false` | Enable vue-i18n bridge mode |

## SSR / SSG / SPA / ISR

The module works in every Nuxt rendering mode:

- **SSR** -- Full detection chain on the server; locale is hydrated to the client via payload
- **SSG** -- Locale-prefixed routes are pre-rendered automatically (`crawlLinks: true`)
- **SPA** -- Client-side detection from URL path, cookie, then defaults
- **ISR** -- Auto-generated `routeRules` with configurable TTL per locale pattern

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
