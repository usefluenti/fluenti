# @fluenti/vite-plugin

[![npm version](https://img.shields.io/npm/v/@fluenti/vite-plugin?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/vite-plugin)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/vite-plugin?color=16a34a&label=size)](https://bundlephobia.com/package/@fluenti/vite-plugin)
[![license](https://img.shields.io/npm/l/@fluenti/vite-plugin?color=737373)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**The build-time engine behind Fluenti.** This plugin compiles away i18n at build time so your production bundle ships zero runtime interpretation overhead. It uses internal virtual modules to wire locale chunks automatically, so app code can stay on Fluenti's public authoring and runtime APIs.

## How It Works

Traditional i18n libraries parse and evaluate message strings at runtime. Fluenti takes a different approach: **everything happens at build time**.

During Vite's transform pipeline, `@fluenti/vite-plugin` rewrites your i18n patterns directly in the AST:

- **`v-t` directive** is a Vue compiler `nodeTransform`, not a runtime directive. It rewrites `<h1 v-t>Hello</h1>` into `<h1>{{ $t('abc123') }}</h1>` during template compilation.
- **`<Trans>`, `<Plural>`, `<Select>` components** are compiled into optimized render calls -- no component overhead at runtime.
- **Direct-import `t`** -- `import { t } from '@fluenti/react' | '@fluenti/vue' | '@fluenti/solid'` is the primary compile-time path

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
      splitting: 'dynamic',   // 'dynamic' | 'static' | false
    }),
  ],
}
```

That's it. The plugin auto-detects your framework when set to `'auto'`, manages locale chunks internally, and handles HMR during development.

## Features

### Internal virtual modules

The plugin uses Vite virtual modules under the hood to connect transformed message lookups to the compiled locale catalogs. Those modules are internal implementation details; application code should stay on `import { t }`, `useI18n()`, `setLocale()`, `preloadLocale()`, `loadMessages()`, and framework-level `chunkLoader` APIs.

### Code Splitting

Control how message catalogs are bundled with the `splitting` option:

| Strategy | Behavior | Best For |
|----------|----------|----------|
| `'dynamic'` | Default locale loaded statically; others lazy-loaded on `switchLocale()` (default) | SPAs with multiple locales |
| `'static'` | All messages for a single locale inlined at build time | SSR, static site generation |
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

### Client-Side `t` Transform

The plugin uses **AST scope analysis** to detect Fluenti's direct-import `t` inside supported component/setup scopes and rewrites it to the runtime `useI18n()` binding:

```tsx
// What you write
import { t } from '@fluenti/react'
const msg = t`Hello, ${name}`

// What ships to the browser
const { t } = useI18n()
const msg = t('Hello, {name}', { name })
```

Supported direct-import shapes:

- `` t`Hello, ${name}` ``
- `t({ message: 'Hello {name}', context: 'hero' }, { name })`

Unsupported direct-import shapes are compile-time errors:

- `t('message.id')`
- `t('Hello {name}', { name })`
- module-top-level usage outside supported component/setup scopes

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
  splitting?: 'dynamic' | 'static' | false

  /** Locale used for static build-time inlining.
   *  @default sourceLocale */
  defaultBuildLocale?: string

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
