# @fluenti/vite-plugin

[![npm version](https://img.shields.io/npm/v/@fluenti/vite-plugin?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/vite-plugin)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/vite-plugin?color=16a34a&label=size)](https://bundlephobia.com/package/@fluenti/vite-plugin)
[![license](https://img.shields.io/npm/l/@fluenti/vite-plugin?color=737373)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**The build-time engine behind Fluenti.** This plugin compiles away i18n at build time so your production bundle ships zero runtime interpretation overhead. Message catalogs are served through virtual modules for zero-config catalog loading -- no manual import wiring, no boilerplate.

## How It Works

Traditional i18n libraries parse and evaluate message strings at runtime. Fluenti takes a different approach: **everything happens at build time**.

During Vite's transform pipeline, `@fluenti/vite-plugin` rewrites your i18n patterns directly in the AST:

- **`v-t` directive** is a Vue compiler `nodeTransform`, not a runtime directive. It rewrites `<h1 v-t>Hello</h1>` into `<h1>{{ $t('abc123') }}</h1>` during template compilation.
- **`<Trans>`, `<Plural>`, `<Select>` components** are compiled into optimized render calls -- no component overhead at runtime.
- **`t\`...\`` tagged templates** in React and Solid are transformed into direct `__i18n.t()` calls with auto-injected imports.

The result: your users get fully resolved translations with the same performance as hardcoded strings.

## Quick Start

### 1. Install

```bash
pnpm add @fluenti/vite-plugin
```

### 2. Configure

```ts
// vite.config.ts
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [
    fluenti({
      framework: 'vue',       // 'vue' | 'react' | 'solid' | 'auto'
      sourceLocale: 'en',
      locales: ['en', 'ja', 'zh-CN'],
      splitting: 'dynamic',   // 'dynamic' | 'static' | 'per-route' | false
    }),
  ],
}
```

That's it. The plugin auto-detects your framework when set to `'auto'`, serves compiled catalogs through virtual modules, and handles HMR during development.

## Features

### Virtual Modules

Compiled message catalogs are served through Vite virtual modules -- no file paths to manage, no manual imports to wire up:

| Module | Purpose |
|--------|---------|
| `virtual:fluenti/runtime` | Reactive catalog with `__switchLocale()` and `__preloadLocale()` |
| `virtual:fluenti/messages` | Static re-export for SSR builds |
| `virtual:fluenti/route-runtime` | Per-route catalog with `__loadRoute()` for code-split apps |

```ts
// These imports "just work" -- resolved by the plugin at build time
import { __switchLocale } from 'virtual:fluenti/runtime'
```

### Code Splitting

Control how message catalogs are bundled with the `splitting` option:

| Strategy | Behavior | Best For |
|----------|----------|----------|
| `'dynamic'` | Default locale loaded statically; others lazy-loaded on `switchLocale()` (default) | SPAs with multiple locales |
| `'static'` | All messages for a single locale inlined at build time | SSR, static site generation |
| `'per-route'` | Messages automatically split by route; shared messages go to a common chunk | Large apps with many routes |
| `false` | All messages bundled in a single chunk | Small apps, simple setups |

### Vue Template Transform

The `v-t` directive is compiled away during Vue template compilation via a `nodeTransform` injected into `@vitejs/plugin-vue`:

```vue
<!-- What you write -->
<p v-t>Welcome back</p>
<img v-t.alt alt="Profile photo" />
<span v-t.plural="count">one apple | {count} apples</span>

<!-- What ships to the browser -->
<p>{{ $t('a1b2c3') }}</p>
<img :alt="$t('d4e5f6')" />
<span>{{ $t('g7h8i9', { count }) }}</span>
```

Rich text with nested elements is supported through `$vtRich()`, and `<Trans>`, `<Plural>`, `<Select>` components are all compiled into optimized output.

### Solid / React JSX Transform

Tagged template literals are transformed during the build:

```tsx
// What you write
const msg = t`Hello, ${name}`

// What ships to the browser
const msg = __i18n.t('x1y2z3', { name })
```

The plugin auto-detects the framework from your source code or can be set explicitly via the `framework` option.

### HMR for Catalogs

During development, editing a message catalog triggers instant hot module replacement. The plugin watches your `catalogDir` and invalidates the relevant virtual modules so translations update in the browser without a full page reload.

## Configuration

```ts
interface FluentiPluginOptions {
  /** Framework mode — set to 'auto' to detect from source code.
   *  @default 'auto' */
  framework?: 'vue' | 'react' | 'solid' | 'auto'

  /** Directory containing compiled message catalogs.
   *  @default 'src/locales/compiled' */
  catalogDir?: string

  /** The source (default) locale.
   *  @default 'en' */
  sourceLocale?: string

  /** All available locales.
   *  @default [sourceLocale] */
  locales?: string[]

  /** Code splitting strategy.
   *  @default 'dynamic' */
  splitting?: 'dynamic' | 'static' | 'per-route' | false

  /** Locale used for static build-time inlining.
   *  @default sourceLocale */
  defaultBuildLocale?: string

  /** Path to a fluenti config file. */
  configPath?: string
}
```

### Examples

**Vue with dynamic splitting:**

```ts
import vue from '@vitejs/plugin-vue'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [
    vue(),
    fluenti({
      framework: 'vue',
      sourceLocale: 'en',
      locales: ['en', 'ja', 'zh-CN'],
      splitting: 'dynamic',
    }),
  ],
}
```

**React with per-route splitting:**

```ts
import react from '@vitejs/plugin-react'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [
    react(),
    fluenti({
      framework: 'react',
      splitting: 'per-route',
      catalogDir: 'src/i18n/compiled',
    }),
  ],
}
```

**SSR with static inlining:**

```ts
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [
    fluenti({
      splitting: 'static',
      defaultBuildLocale: 'en',
    }),
  ],
}
```

## Peer Dependencies

- `vite` ^5, ^6, or ^8

## Documentation

Full documentation at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
