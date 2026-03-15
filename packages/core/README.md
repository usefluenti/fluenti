# @fluenti/core

[![npm](https://img.shields.io/npm/v/@fluenti/core?color=4f46e5&label=)](https://www.npmjs.com/package/@fluenti/core)

Framework-agnostic compile-time i18n core — ICU MessageFormat parser, compiler, interpolation, plural/select rules, date/number formatters, and SSR utilities.

## Install

```bash
pnpm add @fluenti/core
```

> Most users don't need to install `@fluenti/core` directly — it's included as a dependency of `@fluenti/vue` and `@fluenti/solid`.

## What's Inside

- **ICU MessageFormat parser** — full support for plurals, selects, nested arguments
- **Compiler** — AST to optimized message functions (`string | (values?) => string`)
- **Interpolation engine** — runtime value substitution with type safety
- **CLDR plural rules** — per-locale plural category resolution
- **Formatters** — thin wrappers around `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`
- **SSR utilities** — locale detection from cookie, query param, URL path, or headers
- **Catalog management** — message lookup with fallback chain support

## Usage

```ts
import { parse, compile, interpolate } from '@fluenti/core'

// Parse ICU message
const ast = parse('{count, plural, one {# item} other {# items}}')

// Compile to function
const msg = compile(ast)

// Interpolate values
const result = msg({ count: 3 }) // "3 items"
```

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
