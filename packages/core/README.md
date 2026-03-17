# @fluenti/core

[![npm version](https://img.shields.io/npm/v/@fluenti/core?color=4f46e5&label=npm)](https://www.npmjs.com/package/@fluenti/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@fluenti/core?color=22c55e&label=size)](https://bundlephobia.com/package/@fluenti/core)
[![license](https://img.shields.io/npm/l/@fluenti/core?color=64748b)](https://github.com/usefluenti/fluenti/blob/main/LICENSE)

**Compile-time i18n that disappears from your bundle.**

Fluenti compiles ICU MessageFormat strings into optimized functions at build time -- no parser ships to the browser, no runtime overhead, fully type-safe. What you write in development becomes raw string concatenation in production.

## What the compiler does

You write expressive i18n using tagged templates or ICU syntax:

```ts
// Source — what you write
import { msg } from '@fluenti/core'

const greeting = msg`Hello ${name}, you have ${count} messages`
i18n.t(greeting, { name: 'Yuki', count: 3 })
```

At build time, Fluenti compiles your messages into minimal functions -- the ICU parser never ships to the browser:

```ts
// Output — what runs in production
const greeting = (v) => "Hello " + v.name + ", you have " + v.count + " messages"
```

Static messages with no variables compile down to plain strings. Zero overhead, zero waste.

## Features

- **ICU MessageFormat** -- plurals, selects, nested arguments, ordinals, `#` substitution
- **Compile-time transforms** -- messages become optimized functions; no runtime parsing
- **Hash-based message IDs** -- deterministic FNV-1a hashes from content, no manual key management
- **CLDR plural rules** -- per-locale plural category resolution (`zero`, `one`, `two`, `few`, `many`, `other`)
- **Intl formatters** -- thin wrappers around `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`
- **SSR-safe** -- locale detection from cookies, query params, URL paths, or headers
- **Tree-shakeable** -- import only what you use; dead code is eliminated
- **Fallback chains** -- locale-specific and wildcard (`*`) fallback resolution
- **Custom number/date styles** -- define reusable format presets per locale

## Quick start

```bash
pnpm add @fluenti/core
```

> Most users install a framework package instead (`@fluenti/vue`, `@fluenti/solid`, `@fluenti/react`, `@fluenti/next`) which includes `@fluenti/core` as a dependency.

### Create an instance

```ts
import { createFluent } from '@fluenti/core'

const i18n = createFluent({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      greeting: 'Hello {name}!',
      items: (v) => `You have ${new Intl.PluralRules('en').select(v.count) === 'one' ? '1 item' : v.count + ' items'}`,
    },
    ja: {
      greeting: 'こんにちは {name}!',
    },
  },
})

i18n.t('greeting', { name: 'World' }) // "Hello World!"
```

### Parse and compile ICU messages

```ts
import { parse, compile } from '@fluenti/core'

const ast = parse('{count, plural, one {# item} other {# items}}')
const message = compile(ast, 'en')

message({ count: 1 })  // "1 item"
message({ count: 42 }) // "42 items"
```

### Tagged template literals

```ts
import { msg } from '@fluenti/core'

// Generates a deterministic hash ID + ICU message automatically
const desc = msg`Hello ${name}`
// { id: 'abc123', message: 'Hello {0}' }

// Or declare explicit descriptors for extraction
const explicit = msg.descriptor({
  id: 'welcome.title',
  message: 'Welcome back, {name}!',
})
```

### Formatting

```ts
i18n.d(new Date(), 'long')   // "March 17, 2026"
i18n.n(1234.5, 'currency')   // "$1,234.50"
```

### SSR locale detection

```ts
import { detectLocale } from '@fluenti/core'

const locale = detectLocale({
  cookie: request.headers.get('cookie'),
  headers: request.headers,
  available: ['en', 'ja', 'zh-CN'],
  fallback: 'en',
})
```

## ICU MessageFormat examples

```icu
Simple:       Hello {name}!
Plural:       {count, plural, one {# item} other {# items}}
Ordinal:      {pos, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}
Select:       {gender, select, male {He} female {She} other {They}} left
Nested:       {count, plural, one {1 message from {sender}} other {# messages from {sender}}}
Number:       {price, number, currency}
Date:         {when, date, short}
```

## Framework integrations

| Package | Framework |
|---------|-----------|
| [`@fluenti/vue`](https://www.npmjs.com/package/@fluenti/vue) | Vue 3 -- `<Trans>`, `<Plural>`, `<Select>`, `useI18n()` |
| [`@fluenti/solid`](https://www.npmjs.com/package/@fluenti/solid) | SolidJS -- `<Trans>`, `<Plural>`, `<Select>`, `useI18n()` |
| [`@fluenti/react`](https://www.npmjs.com/package/@fluenti/react) | React 19 -- `<Trans>`, `<Plural>`, `useFluent()` |
| [`@fluenti/next`](https://www.npmjs.com/package/@fluenti/next) | Next.js 15 -- `withFluenti()`, RSC support, streaming |
| [`@fluenti/nuxt`](https://www.npmjs.com/package/@fluenti/nuxt) | Nuxt 3 -- locale-prefixed routing, SEO, auto locale detection |
| [`@fluenti/vue-i18n-compat`](https://www.npmjs.com/package/@fluenti/vue-i18n-compat) | vue-i18n migration bridge -- run both side by side |

## Documentation

Full docs at [fluenti.dev](https://fluenti.dev).

## License

[MIT](https://github.com/usefluenti/fluenti/blob/main/LICENSE)
