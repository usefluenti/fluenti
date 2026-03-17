# @fluenti/cli

[![npm](https://img.shields.io/npm/v/@fluenti/cli?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/cli)
[![license](https://img.shields.io/npm/l/@fluenti/cli?color=22c55e)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Extract, compile, translate -- all from the CLI.**

Fluenti CLI scans your Vue SFC and TSX source files for translatable messages, manages PO and JSON catalogs, compiles them to tree-shakeable JS modules, and even translates them with AI. One tool for the entire i18n pipeline.

## Install

```bash
pnpm add -D @fluenti/cli
# or
npm install -D @fluenti/cli
```

## Workflow

The typical workflow is three steps: extract messages from source code, translate them (manually or with AI), then compile catalogs into optimized modules your app can import.

```
  source files          catalogs             compiled modules
  *.vue / *.tsx  ──►  en.po, ja.po  ──►  en.js, ja.js
                extract          compile
```

```bash
# 1. Extract messages from source files into catalogs
fluenti extract

# 2. Translate (pick one)
#    - Edit .po files in Poedit, Crowdin, or Weblate
#    - Or let AI do it:
fluenti translate

# 3. Compile catalogs to optimized tree-shakeable JS modules
fluenti compile
```

## Commands

### `fluenti extract`

Scans source files for translatable messages and updates catalog files.

```bash
fluenti extract
fluenti extract --config ./i18n.config.ts
```

Supported patterns:

- **Vue**: `v-t` directive, `<Trans>`, `<Plural>`, `t()` calls
- **React / Solid (TSX)**: `<Trans>`, `<Plural>`, `t()` calls

### `fluenti compile`

Compiles PO or JSON catalogs into optimized ES modules with hash-based exports.

```bash
fluenti compile
```

Output example:

```js
// locales/compiled/en.js
/* @__PURE__ */ export const _a1b2c3 = 'Hello, world!'
/* @__PURE__ */ export const _d4e5f6 = (v) => `Hello, ${v.name}!`

export default {
  'Hello, world!': _a1b2c3,
  'Hello, {name}!': _d4e5f6,
}
```

The `@__PURE__` annotation enables tree-shaking -- unused messages are removed from the production bundle. The `export default` re-export allows catalog imports by message ID key.

### `fluenti stats`

Shows translation progress for every locale at a glance.

```bash
fluenti stats
```

```
  Locale  │ Total │ Translated │ Progress
  ────────┼───────┼────────────┼─────────
  en      │    42 │         42 │ 100.0%
  ja      │    42 │         38 │  90.5%
  zh-CN   │    42 │         30 │  71.4%
```

### `fluenti translate`

AI-powered translation using Claude Code or OpenAI Codex CLI. Reads untranslated entries from your catalogs and fills them in automatically, preserving ICU placeholders and HTML tags.

```bash
fluenti translate                          # All target locales, default provider (Claude)
fluenti translate --locale ja              # Single locale
fluenti translate --provider codex         # Use Codex instead
fluenti translate --batch-size 25          # Smaller batches for large catalogs
```

| Flag | Default | Description |
|------|---------|-------------|
| `--provider` | `claude` | AI provider: `claude` or `codex` |
| `--locale` | all targets | Translate a specific locale only |
| `--batch-size` | `50` | Messages per AI request |

### `fluenti migrate`

AI-powered migration from another i18n library. Analyzes your existing config, locale files, and source code, then generates a Fluenti-compatible setup.

```bash
fluenti migrate --from vue-i18n
fluenti migrate --from react-i18next --provider codex
fluenti migrate --from next-intl --write    # Write generated files to disk
```

Supported source libraries:

| Library | Framework |
|---------|-----------|
| `vue-i18n` | Vue |
| `nuxt-i18n` | Nuxt |
| `react-i18next` | React |
| `next-intl` | Next.js |
| `next-i18next` | Next.js |
| `lingui` | React |

## Configuration

Create `fluenti.config.ts` in your project root:

```ts
export default {
  sourceLocale: 'en',
  locales: ['en', 'ja', 'zh-CN'],
  catalogDir: './locales',
  format: 'po' as const,
  include: ['./src/**/*.{vue,tsx,ts}'],
  compileOutDir: './src/locales/compiled',
}
```

## Catalog Formats

Fluenti supports two catalog formats. PO is the default.

| Format | Extension | Best for |
|--------|-----------|----------|
| **PO** | `.po` | Professional translation workflows -- compatible with Poedit, Crowdin, Weblate, and the entire gettext ecosystem. Translators already know it. |
| **JSON** | `.json` | Simple projects or programmatic editing. Flat key-value pairs, easy to parse and generate. |

### Why PO is the default

PO (Portable Object) is the de facto standard for software translation. It stores source text alongside translations, supports translator comments and context strings, and is natively understood by every major translation management platform. If you work with professional translators or localization vendors, PO is the format they expect.

Switch formats by setting `format: 'json'` in your config file.

## Documentation

Full documentation at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
