<p align="center">
  <img src="https://raw.githubusercontent.com/usefluenti/brand/main/logo-icon.svg" width="140" />
</p>

<h1 align="center">Fluenti</h1>

<p align="center">
  Compile-time i18n for modern frameworks — zero runtime overhead, full ICU MessageFormat support.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fluenti/core"><img src="https://img.shields.io/npm/v/@fluenti/core?color=4f46e5&label=" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@fluenti/core"><img src="https://img.shields.io/npm/dm/@fluenti/core?color=6366f1&label=" alt="npm downloads" /></a>
  <a href="https://github.com/usefluenti/fluenti/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/usefluenti/fluenti/ci.yml?label=CI" alt="CI" /></a>
  <a href="https://github.com/usefluenti/fluenti/actions/workflows/e2e.yml"><img src="https://img.shields.io/github/actions/workflow/status/usefluenti/fluenti/e2e.yml?label=E2E" alt="E2E" /></a>
  <img src="https://img.shields.io/badge/tests-1599-4caf50" alt="tests" />
  <img src="https://img.shields.io/badge/coverage-97%25-4caf50" alt="coverage" />
  <a href="https://github.com/usefluenti/fluenti/blob/main/LICENSE"><img src="https://img.shields.io/github/license/usefluenti/fluenti?color=4338ca&label=" alt="license" /></a>
</p>

## Why

Traditional i18n libraries interpret messages at runtime, adding bundle weight and slowing renders. Fluenti compiles translations at build time so your app ships pre-resolved strings with **zero runtime overhead**. Source text is used as the message key — no more maintaining separate ID maps.

## Features

- **ICU MessageFormat** — plurals, selects, nested arguments, custom formatters
- **Vue `v-t` directive** — compile-time template transform, not a runtime directive
- **`<Trans>`, `<Plural>`, `<Select>` components** — for Vue, Solid, React, and more
- **Code splitting** — lazy-load translations per route (`dynamic`, `static`, or off)
- **SSR-safe** — locale detection via cookie, query, path, or headers
- **Date / number formatting** — thin wrappers around `Intl` APIs
- **PO + JSON catalogs** — gettext-compatible workflow with JSON alternative

## Install

```bash
# Vue
pnpm add @fluenti/core @fluenti/vue @fluenti/vite-plugin

# React
pnpm add @fluenti/core @fluenti/react @fluenti/vite-plugin

# Nuxt
pnpm add @fluenti/nuxt @fluenti/core @fluenti/vue

# SolidJS
pnpm add @fluenti/core @fluenti/solid @fluenti/vite-plugin

# Next.js
pnpm add @fluenti/core @fluenti/react @fluenti/next

# CLI (message extraction & compilation)
pnpm add -D @fluenti/cli

# vue-i18n migration bridge (optional — run vue-i18n and Fluenti side by side)
pnpm add @fluenti/vue-i18n-compat
```

## Quick Start

```vue
<script setup>
import { useI18n } from '@fluenti/vue'

const { t } = useI18n()
</script>

<template>
  <!-- v-t directive — compiled away at build time -->
  <h1 v-t>Hello, world!</h1>

  <!-- t() in expressions -->
  <p>{{ t('You have {count} items', { count: 3 }) }}</p>
</template>
```

## Workflow

```bash
# 1. Extract messages from source files
fluenti extract --format po

# 2. Translate — edit locales/ja.po, locales/zh-CN.po
# 3. Compile catalogs to optimized JS modules
fluenti compile
```

The Vite plugin loads compiled catalogs automatically — no manual wiring needed.

## Packages

| Package | Description |
|---------|-------------|
| [`@fluenti/core`](packages/core) <br> [![npm](https://img.shields.io/npm/v/@fluenti/core?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/core) | Framework-agnostic core — ICU parser, compiler, interpolation, formatters |
| [`@fluenti/vue`](packages/vue) <br> [![npm](https://img.shields.io/npm/v/@fluenti/vue?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vue) | Vue 3 integration — `v-t` directive, `<Trans>`, `useI18n()` composable |
| [`@fluenti/react`](packages/react) <br> [![npm](https://img.shields.io/npm/v/@fluenti/react?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/react) | React integration — `I18nProvider`, `<Trans>`, `<Plural>`, `<Select>`, `useI18n()` hook |
| [`@fluenti/solid`](packages/solid) <br> [![npm](https://img.shields.io/npm/v/@fluenti/solid?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/solid) | SolidJS integration — `<Trans>`, `I18nProvider`, `useI18n()` |
| [`@fluenti/cli`](packages/cli) <br> [![npm](https://img.shields.io/npm/v/@fluenti/cli?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/cli) | Message extraction from Vue SFC & TSX, PO/JSON catalog compilation |
| [`@fluenti/vite-plugin`](packages/vite-plugin) <br> [![npm](https://img.shields.io/npm/v/@fluenti/vite-plugin?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vite-plugin) | Vite build-time transforms, virtual modules, code splitting |
| [`@fluenti/next`](packages/next-plugin) <br> [![npm](https://img.shields.io/npm/v/@fluenti/next?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/next) | Next.js plugin — `withFluenti()`, RSC support, streaming SSR |
| [`@fluenti/nuxt`](packages/nuxt) <br> [![npm](https://img.shields.io/npm/v/@fluenti/nuxt?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/nuxt) | Nuxt module — locale-prefixed routing, SEO helpers, auto locale detection |
| [`@fluenti/vue-i18n-compat`](packages/vue-i18n-compat) <br> [![npm](https://img.shields.io/npm/v/@fluenti/vue-i18n-compat?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vue-i18n-compat) | Progressive migration bridge between vue-i18n and Fluenti |

## Documentation

Full documentation — guides, API reference, and examples — is available at **[fluenti.dev](https://fluenti.dev)**.

- [Getting Started](https://fluenti.dev/getting-started/introduction/)
- [Vue Quick Start](https://fluenti.dev/getting-started/quick-start-vue/)
- [React Quick Start](https://fluenti.dev/getting-started/quick-start-react/)
- [SolidJS Quick Start](https://fluenti.dev/getting-started/quick-start-solid/)
- [Next.js Quick Start](https://fluenti.dev/start/quick-start-nextjs/)
- [Nuxt Quick Start](https://fluenti.dev/getting-started/quick-start-nuxt/)
- [Code Splitting](https://fluenti.dev/advanced/code-splitting/)
- [SSR Guide](https://fluenti.dev/guides/ssr/)
- [vue-i18n Migration](https://fluenti.dev/frameworks/vue/migration-from-vue-i18n/)

## License

[MIT](LICENSE) - Fluenti Contributors
