# @fluenti/vite-plugin

[![npm](https://img.shields.io/npm/v/@fluenti/vite-plugin?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/vite-plugin)

Vite plugin for Fluenti — build-time template transforms, virtual modules, and per-route code splitting.

## Install

```bash
pnpm add @fluenti/vite-plugin
```

## Setup

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import fluenti from '@fluenti/vite-plugin'

export default {
  plugins: [
    vue(),
    fluenti({
      framework: 'vue',      // 'vue' | 'react' | 'solid' | 'auto'
      splitting: 'dynamic',  // 'dynamic' | 'static' | 'per-route' | false
    }),
  ],
}
```

## What It Does

### Compile-time Transforms

The plugin rewrites i18n patterns at build time so there's zero runtime interpretation overhead:

- `v-t` directive &rarr; `$t()` calls (Vue templates)
- `<Trans>` / `<Plural>` / `<Select>` &rarr; optimized render output
- `<Plural>` with named slots &rarr; ICU message with `$vtRich()` for catalog-based rich text
- `t()` function calls &rarr; `__i18n.t()` with auto-injected imports

### Code Splitting

| Strategy | Description |
|----------|-------------|
| `false` | No splitting (default) |
| `'dynamic'` | Lazy-load locale catalogs on demand. Default locale loaded statically, others loaded when `switchLocale()` is called. |
| `'static'` | All messages from a single locale inlined at build time. Ideal for SSR. |
| `'per-route'` | Messages automatically split by route. Each route chunk only includes the messages it uses. Shared messages go into a common chunk. |

### Virtual Modules

The plugin serves compiled catalogs through Vite virtual modules — no manual import wiring needed:

- `virtual:fluenti/runtime` — reactive catalog with `__switchLocale()`, `__preloadLocale()`
- `virtual:fluenti/messages` — static re-export for SSR builds
- `virtual:fluenti/route-runtime` — per-route catalog with `__loadRoute()`

## Options

```ts
interface FluentiPluginOptions {
  framework?: 'vue' | 'react' | 'solid' | 'auto'
  catalogDir?: string           // default: 'src/locales/compiled'
  sourceLocale?: string         // default: 'en'
  locales?: string[]            // default: [sourceLocale]
  splitting?: 'dynamic' | 'static' | 'per-route' | false
  defaultBuildLocale?: string   // default: sourceLocale
}
```

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
