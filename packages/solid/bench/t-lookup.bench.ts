import { bench, describe } from 'vitest'
import { createRoot } from 'solid-js'
import { createI18nContext } from '../src/index'
import type { AllMessages, Messages } from '@fluenti/core'

// ── Message corpus ──

const MESSAGES = {
  plain: 'Hello World',
  singleVar: 'Hello {name}',
  multiVar: '{x} + {y} = {result}',
  pluralSimple: '{count, plural, one {# item} other {# items}}',
  select: '{gender, select, male {He went} female {She went} other {They went}}',
  nestedPluralSelect:
    '{gender, select, male {{count, plural, one {He has # item} other {He has # items}}} female {{count, plural, one {She has # item} other {She has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}',
} as const

const VALUES = {
  simple: { name: 'World' },
  multiVar: { x: 1, y: 2, result: 3 },
  plural: { count: 5 },
  select: { gender: 'female' },
  nestedPluralSelect: { gender: 'male', count: 3 },
} as const

const compiledFn = ((values?: Record<string, unknown>) =>
  `Hello ${values?.name ?? 'World'}!`) as unknown as string

function generateCatalog(size: number): Messages {
  const messages: Messages = {}
  for (let i = 0; i < size; i++) {
    messages[`msg_${i}`] = `Message number {n} for item ${i}`
  }
  return messages
}

// ── Fixtures ──

const enMessages: Messages = {
  static: 'Hello World!',
  compiled_fn: compiledFn,
  greeting: MESSAGES.singleVar,
  multi: MESSAGES.multiVar,
  items: MESSAGES.pluralSimple,
  went: MESSAGES.select,
  nested: MESSAGES.nestedPluralSelect,
}

const jaMessages: Messages = {
  greeting: 'こんにちは {name}',
}

const messages: AllMessages = {
  en: { ...enMessages, ...generateCatalog(100) },
  ja: jaMessages,
}

// ── Create context inside a reactive root ──

let ctx: ReturnType<typeof createI18nContext>

createRoot((dispose) => {
  ctx = createI18nContext({
    locale: 'en',
    fallbackLocale: 'en',
    messages,
    missing: (_locale, id) => `[missing: ${id}]`,
    dateFormats: { short: { year: 'numeric', month: 'short', day: 'numeric' } },
    numberFormats: { currency: { style: 'currency', currency: 'USD' } },
  })
  // Keep root alive for benchmarks — do not dispose
  void dispose
})

// ── Benchmarks ──

describe('solid — instance creation', () => {
  bench('createI18nContext()', () => {
    createRoot((dispose) => {
      createI18nContext({
        locale: 'en',
        messages: { en: { hello: 'Hello' } },
      })
      dispose()
    })
  })
})

describe('solid — t() lookup', () => {
  bench('static string', () => {
    ctx.t('static')
  })

  bench('compiled function', () => {
    ctx.t('compiled_fn', VALUES.simple)
  })

  bench('interpolated — single var', () => {
    ctx.t('greeting', VALUES.simple)
  })

  bench('interpolated — multi var', () => {
    ctx.t('multi', VALUES.multiVar)
  })

  bench('plural (ICU)', () => {
    ctx.t('items', VALUES.plural)
  })

  bench('select (ICU)', () => {
    ctx.t('went', VALUES.select)
  })

  bench('nested plural+select (ICU)', () => {
    ctx.t('nested', VALUES.nestedPluralSelect)
  })
})

describe('solid — t() fallback', () => {
  let fbCtx: ReturnType<typeof createI18nContext>
  createRoot((dispose) => {
    fbCtx = createI18nContext({
      locale: 'fr',
      fallbackLocale: 'en',
      messages,
      fallbackChain: { '*': ['en'] },
    })
    void dispose
  })

  bench('fallback locale hit', () => {
    fbCtx.t('greeting', VALUES.simple)
  })

  bench('fallback chain traversal', () => {
    fbCtx.t('items', VALUES.plural)
  })

  bench('missing → handler', () => {
    let mCtx: ReturnType<typeof createI18nContext>
    createRoot((dispose) => {
      mCtx = createI18nContext({
        locale: 'fr',
        fallbackLocale: 'en',
        messages,
        missing: (_locale, id) => `[missing: ${id}]`,
      })
      dispose()
    })
    mCtx!.t('nonexistent_key')
  })
})

describe('solid — formatters', () => {
  bench('d() — date formatting', () => {
    ctx.d(new Date(2025, 0, 15), 'short')
  })

  bench('n() — number formatting', () => {
    ctx.n(1234.56, 'currency')
  })
})

describe('solid — catalog scaling', () => {
  for (const size of [10, 100, 1000]) {
    let scaleCtx: ReturnType<typeof createI18nContext>
    createRoot((dispose) => {
      scaleCtx = createI18nContext({
        locale: 'en',
        messages: { en: generateCatalog(size) },
      })
      void dispose
    })

    bench(`${size} messages — lookup last key`, () => {
      scaleCtx.t(`msg_${size - 1}`, { n: 42 })
    })
  }
})
