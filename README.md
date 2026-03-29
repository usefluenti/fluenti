<p align="center">
  <img src="https://raw.githubusercontent.com/usefluenti/brand/main/logo-icon.svg" width="140" />
</p>

<h1 align="center">Fluenti</h1>

<p align="center">
  Framework-agnostic, compile-time i18n — one codebase for Vue, React, Solid, and any framework.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fluenti/core"><img src="https://img.shields.io/npm/v/@fluenti/core?color=4f46e5&label=" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@fluenti/core"><img src="https://img.shields.io/npm/dm/@fluenti/core?color=6366f1&label=" alt="npm downloads" /></a>
  <a href="https://github.com/usefluenti/fluenti/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/usefluenti/fluenti/ci.yml?label=CI" alt="CI" /></a>
  <a href="https://github.com/usefluenti/fluenti/actions/workflows/e2e.yml"><img src="https://img.shields.io/github/actions/workflow/status/usefluenti/fluenti/e2e.yml?label=E2E" alt="E2E" /></a>
  <img src="https://img.shields.io/badge/tests-3366%20unit%20%2B%20144%20e2e-4caf50" alt="tests" />
  <img src="https://img.shields.io/badge/coverage-97%25-4caf50" alt="coverage" />
  <a href="https://github.com/usefluenti/fluenti/blob/main/LICENSE"><img src="https://img.shields.io/github/license/usefluenti/fluenti?color=4338ca&label=" alt="license" /></a>
</p>

<p align="center">
  <strong>~2 KB</strong> core runtime&ensp;·&ensp;<strong>5-10x faster</strong> than runtime i18n&ensp;·&ensp;<strong>Framework-agnostic</strong> — Vue, React, Solid, Next.js, Nuxt, and more
</p>

## Why compile-time?

Traditional i18n libraries parse messages at runtime — adding bundle weight and slowing every render. Compile-time i18n resolves translations at build time, shipping plain strings and pre-compiled functions. Source text is used as the message key — no more maintaining separate ID maps.

|  | Compile-time (Fluenti) | Runtime (react-i18next, vue-i18n, next-intl) |
|--|:--|:--|
| **Runtime size** | ~2 KB gzipped | 12–14 KB gzipped |
| **Message parsing** | Build time (zero at runtime) | Every render |
| **Speed** | 5-10x faster; 40x on complex ICU | Baseline |
| **Code splitting** | Per-locale, automatic | Manual or none |
| **Multi-framework** | One codebase, consistent API | One framework each |
| **Natural keys** | Source text = key | Separate ID maps |

## Features

- **Framework-agnostic core** — `@fluenti/core` works with any framework; first-class integrations for Vue, React, Solid, Next.js, Nuxt, React Router, TanStack Start, and SolidStart
- **Compile-time transforms** — messages compiled at build time, zero runtime parsing overhead
- **ICU MessageFormat** — plurals, selects, nested arguments, custom formatters
- **Vue `v-t` directive** — compile-time template transform, not a runtime directive
- **`<Trans>`, `<Plural>`, `<Select>` components** — consistent API across Vue, React, and Solid
- **Code splitting** — lazy-load translations per locale (`dynamic`, `static`, or off)
- **SSR-safe** — locale detection via cookie, query, path, or headers; hydration script helper
- **PO + JSON catalogs** — gettext-compatible workflow with JSON alternative
- **Date / number formatting** — thin wrappers around `Intl` APIs with built-in presets
- **Plugin system** — extend extract/compile pipeline with custom hooks
- **`msg` descriptors** — lazy message constants for use outside components

## Quick Start

**Vue**

```vue
<script setup>
import { t } from '@fluenti/vue'
const count = 3
</script>

<template>
  <h1 v-t>Hello, world!</h1>
  <p>{{ t`You have ${count} items` }}</p>
</template>
```

**React**

```tsx
import { t } from '@fluenti/react'

function App() {
  const count = 3
  return (
    <>
      <h1>{t`Hello, world!`}</h1>
      <p>{t`You have ${count} items`}</p>
    </>
  )
}
```

**Solid**

```tsx
import { t } from '@fluenti/solid'

function App() {
  const count = 3
  return (
    <>
      <h1>{t`Hello, world!`}</h1>
      <p>{t`You have ${count} items`}</p>
    </>
  )
}
```

Same API. Same message catalogs. Different frameworks.

## Workflow

```bash
# 1. Extract messages from source files
fluenti extract --format po

# 2. Translate — edit locales/ja.po, locales/zh-CN.po

# 3. Compile catalogs to optimized JS modules
fluenti compile
```

The Vite plugin loads compiled catalogs automatically — no manual wiring needed.

## Install

```bash
# Vue
pnpm add @fluenti/core @fluenti/vue @fluenti/vite-plugin

# React
pnpm add @fluenti/core @fluenti/react @fluenti/vite-plugin

# SolidJS
pnpm add @fluenti/core @fluenti/solid @fluenti/vite-plugin

# Next.js
pnpm add @fluenti/core @fluenti/react @fluenti/next

# Nuxt
pnpm add @fluenti/nuxt @fluenti/core @fluenti/vue

# CLI (message extraction & compilation)
pnpm add -D @fluenti/cli

# vue-i18n migration bridge (optional)
pnpm add @fluenti/vue-i18n-compat
```

## Packages

| Package | Description |
|---------|-------------|
| [`@fluenti/core`](packages/core) <br> [![npm](https://img.shields.io/npm/v/@fluenti/core?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/core) | Framework-agnostic core — ICU parser, compiler, interpolation, formatters. Extend to any framework. |
| [`@fluenti/vue`](packages/vue) <br> [![npm](https://img.shields.io/npm/v/@fluenti/vue?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vue) | Vue 3 — `v-t` directive, `<Trans>`, `useI18n()` composable |
| [`@fluenti/react`](packages/react) <br> [![npm](https://img.shields.io/npm/v/@fluenti/react?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/react) | React — `I18nProvider`, `<Trans>`, `<Plural>`, `<Select>`, `useI18n()` hook |
| [`@fluenti/solid`](packages/solid) <br> [![npm](https://img.shields.io/npm/v/@fluenti/solid?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/solid) | SolidJS — `<Trans>`, `I18nProvider`, `useI18n()` |
| [`@fluenti/next`](packages/next-plugin) <br> [![npm](https://img.shields.io/npm/v/@fluenti/next?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/next) | Next.js — `withFluenti()`, RSC support, streaming SSR |
| [`@fluenti/nuxt`](packages/nuxt) <br> [![npm](https://img.shields.io/npm/v/@fluenti/nuxt?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/nuxt) | Nuxt — locale-prefixed routing, SEO helpers, auto locale detection |
| [`@fluenti/cli`](packages/cli) <br> [![npm](https://img.shields.io/npm/v/@fluenti/cli?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/cli) | Message extraction (Vue SFC, TSX), PO/JSON compilation, AI translation |
| [`@fluenti/vite-plugin`](packages/vite-plugin) <br> [![npm](https://img.shields.io/npm/v/@fluenti/vite-plugin?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vite-plugin) | Vite build-time transforms, virtual modules, code splitting |
| [`@fluenti/vue-i18n-compat`](packages/vue-i18n-compat) <br> [![npm](https://img.shields.io/npm/v/@fluenti/vue-i18n-compat?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vue-i18n-compat) | Progressive migration bridge between vue-i18n and Fluenti |

## Documentation

Full documentation — guides, API reference, and examples — is available at **[fluenti.dev](https://fluenti.dev)**.

- [Getting Started](https://fluenti.dev/start/introduction/)
- [Vue Quick Start](https://fluenti.dev/start/quick-start-vue/)
- [React Quick Start](https://fluenti.dev/start/quick-start-react/)
- [SolidJS Quick Start](https://fluenti.dev/start/quick-start-solid/)
- [Next.js Quick Start](https://fluenti.dev/start/quick-start-nextjs/)
- [Nuxt Quick Start](https://fluenti.dev/start/quick-start-nuxt/)
- [Code Splitting](https://fluenti.dev/advanced/code-splitting/)
- [SSR Guide](https://fluenti.dev/advanced/ssr-hydration/)
- [Framework Comparison](https://fluenti.dev/advanced/framework-comparison/)
- [vue-i18n Migration](https://fluenti.dev/frameworks/vue/migration-from-vue-i18n/)

## License

[MIT](LICENSE) - Fluenti Contributors
