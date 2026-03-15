# @fluenti/cli

[![npm](https://img.shields.io/npm/v/@fluenti/cli?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/cli)

Fluenti CLI — message extraction from Vue SFC & TSX, PO/JSON catalog management, and compilation to optimized JS modules.

## Install

```bash
pnpm add -D @fluenti/cli
```

## Workflow

```bash
# 1. Extract messages from source files into PO catalogs
fluenti extract

# 2. Translate — edit locales/ja.po, locales/zh-CN.po, etc.

# 3. Compile catalogs to optimized JS modules
fluenti compile
```

## Configuration

Create `fluenti.config.ts` in your project root:

```ts
export default {
  sourceLocale: 'en',
  locales: ['en', 'ja', 'zh-CN'],
  catalogDir: './locales',
  format: 'po' as const,            // 'po' or 'json'
  include: ['./src/**/*.{vue,tsx,ts}'],
  compileOutDir: './src/locales/compiled',
}
```

## Commands

### `fluenti extract`

Scans source files for translatable messages and updates catalog files.

- Vue: extracts from `v-t` directives, `<Trans>`, `<Plural>`, `t()` calls
- Solid/TSX: extracts from `<Trans>`, `<Plural>`, `t()` calls

### `fluenti compile`

Compiles PO/JSON catalogs into optimized ES modules with hash-based exports:

```js
// Output: src/locales/compiled/en.js
/* @__PURE__ */ export const _a1b2c3 = "Hello, world!"
/* @__PURE__ */ export const _d4e5f6 = (v) => `Hello, ${v.name}!`
```

The `@__PURE__` annotation enables tree-shaking — unused messages are removed from the bundle.

## Catalog Formats

| Format | Extension | Use case |
|--------|-----------|----------|
| PO | `.po` | gettext-compatible, works with Poedit/Crowdin/Weblate |
| JSON | `.json` | Simple key-value, easy to edit programmatically |

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
