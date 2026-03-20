# @fluenti/vite-plugin

[![npm version](https://img.shields.io/npm/v/@fluenti/vite-plugin?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/vite-plugin)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/vite-plugin?color=16a34a&label=size)](https://bundlephobia.com/package/@fluenti/vite-plugin)
[![license](https://img.shields.io/npm/l/@fluenti/vite-plugin?color=737373)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**The build-time engine behind Fluenti.** This is an internal package that provides the core Vite plugin infrastructure. Users should install the framework-specific packages instead.

## Usage

This package is not meant to be used directly. Install your framework package instead:

```bash
# Vue
pnpm add @fluenti/vue

# React
pnpm add @fluenti/react

# Solid
pnpm add @fluenti/solid
```

Then import the Vite plugin from the framework package's subpath export:

```ts
// Vue — vite.config.ts
import vue from '@vitejs/plugin-vue'
import fluentiVue from '@fluenti/vue/vite-plugin'

export default {
  plugins: [
    vue(),
    fluentiVue({
      sourceLocale: 'en',
      locales: ['en', 'ja', 'zh-CN'],
      splitting: 'dynamic',
    }),
  ],
}
```

```ts
// React — vite.config.ts
import react from '@vitejs/plugin-react'
import fluentiReact from '@fluenti/react/vite-plugin'

export default {
  plugins: [
    fluentiReact({ splitting: 'dynamic' }),
    react(),
  ],
}
```

```ts
// Solid — vite.config.ts
import solidPlugin from 'vite-plugin-solid'
import fluentiSolid from '@fluenti/solid/vite-plugin'

export default {
  plugins: [
    solidPlugin(),
    fluentiSolid({ splitting: 'dynamic' }),
  ],
}
```

## Plugin Options

All framework plugins accept the same options:

```ts
interface FluentiPluginOptions {
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
   *  @default false */
  splitting?: 'dynamic' | 'static' | false

  /** Locale used for static build-time inlining.
   *  @default sourceLocale */
  defaultBuildLocale?: string
}
```

## What It Provides

For framework package authors, this package exports:

- `createFluentiPlugins(options, frameworkPlugins, runtimeGenerator)` — factory function to build the Vite plugin pipeline
- `FluentiPluginOptions` — user-facing options type
- `RuntimeGenerator` / `RuntimeGeneratorOptions` — interface for framework-specific virtual module runtime generation

## Code Splitting

| Strategy | Behavior | Best For |
|----------|----------|----------|
| `'dynamic'` | Default locale loaded statically; others lazy-loaded on `switchLocale()` | SPAs with multiple locales |
| `'static'` | All messages for a single locale inlined at build time | SSR, static site generation |
| `false` | All messages bundled in a single chunk | Small apps, simple setups |

## Peer Dependencies

- `vite` ^5, ^6, or ^8

## Documentation

Full documentation at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
