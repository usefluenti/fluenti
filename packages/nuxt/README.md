# @fluenti/nuxt

[![npm](https://img.shields.io/npm/v/@fluenti/nuxt?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/nuxt)

Nuxt module for Fluenti — locale-prefixed routing (4 strategies), SEO head helpers, `<NuxtLinkLocale>` component, and browser language detection.

## Install

```bash
pnpm add @fluenti/nuxt @fluenti/core @fluenti/vue
```

## Setup

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

## Routing Strategies

| Strategy | Default locale | Other locales | Example |
|----------|---------------|---------------|---------|
| `prefix_except_default` | `/about` | `/ja/about` | Most common — clean URLs for default locale |
| `prefix` | `/en/about` | `/ja/about` | Every locale gets a prefix |
| `prefix_and_default` | `/about` + `/en/about` | `/ja/about` | Default locale accessible both ways |
| `no_prefix` | `/about` | `/about` | No URL prefixes — locale set via cookie/header |

## Composables

### `useLocalePath()`

Generate locale-prefixed paths.

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

Get the current page path in a different locale.

```vue
<script setup>
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <!-- If on /ja/about, this returns /about (en is default) -->
  <NuxtLink :to="switchLocalePath('en')">English</NuxtLink>
  <NuxtLink :to="switchLocalePath('ja')">日本語</NuxtLink>
</template>
```

### `useLocaleHead()`

Generate SEO-friendly `<head>` metadata — `hreflang` alternate links, `og:locale` meta tags, and `html[lang]`.

```vue
<script setup>
const head = useLocaleHead({
  addSeoAttributes: true,
  baseUrl: 'https://example.com',
})

useHead(head.value)
</script>
```

Generated output:

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

## Components

### `<NuxtLinkLocale>`

A locale-aware link component that automatically prefixes paths.

```vue
<template>
  <NuxtLinkLocale to="/about">About</NuxtLinkLocale>
  <!-- Renders: <a href="/ja/about">About</a> when locale is 'ja' -->
</template>
```

## Route Utilities

For programmatic use or custom module setup:

```ts
import { localePath, switchLocalePath, extractLocaleFromPath, extendPages } from '@fluenti/nuxt'

// Add locale prefix to a path
localePath('/about', 'ja', 'en', 'prefix_except_default')
// → '/ja/about'

// Get current path in another locale
switchLocalePath('/ja/about', 'en', ['en', 'ja'], 'en', 'prefix_except_default')
// → '/about'

// Extract locale from a path
extractLocaleFromPath('/ja/about', ['en', 'ja'])
// → { locale: 'ja', pathWithoutLocale: '/about' }

// Extend Nuxt pages with locale-prefixed variants
extendPages(pages, { locales: ['en', 'ja'], defaultLocale: 'en', strategy: 'prefix_except_default' })
```

## Options

```ts
interface FluentNuxtOptions {
  /** Supported locale codes */
  locales: string[]
  /** Default locale code */
  defaultLocale: string
  /** URL routing strategy (default: 'prefix_except_default') */
  strategy?: 'prefix' | 'prefix_except_default' | 'prefix_and_default' | 'no_prefix'
  /** Source locale for message extraction */
  sourceLocale?: string
  /** Directory for compiled message catalogs */
  catalogDir?: string
  /** Browser language detection settings */
  detectBrowserLanguage?: {
    useCookie?: boolean
    cookieKey?: string
    fallbackLocale?: string
  }
  /** Enable @fluenti/vue-i18n-compat bridge mode */
  compat?: boolean
}
```

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
