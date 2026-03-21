import { bench, describe } from 'vitest'
import { createFluentVue } from '../src/index'
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

function createInstance() {
  return createFluentVue({
    locale: 'en',
    fallbackLocale: 'en',
    messages,
    missing: (_locale, id) => `[missing: ${id}]`,
    dateFormats: { short: { year: 'numeric', month: 'short', day: 'numeric' } },
    numberFormats: { currency: { style: 'currency', currency: 'USD' } },
  })
}

const fluent = createInstance()
const { t, d, n } = fluent.global

// ── Benchmarks ──

describe('vue — instance creation', () => {
  bench('createFluentVue()', () => {
    createInstance()
  })
})

describe('vue — t() lookup', () => {
  bench('static string', () => {
    t('static')
  })

  bench('compiled function', () => {
    t('compiled_fn', VALUES.simple)
  })

  bench('interpolated — single var', () => {
    t('greeting', VALUES.simple)
  })

  bench('interpolated — multi var', () => {
    t('multi', VALUES.multiVar)
  })

  bench('plural (ICU)', () => {
    t('items', VALUES.plural)
  })

  bench('select (ICU)', () => {
    t('went', VALUES.select)
  })

  bench('nested plural+select (ICU)', () => {
    t('nested', VALUES.nestedPluralSelect)
  })
})

describe('vue — t() fallback', () => {
  const fbFluent = createFluentVue({
    locale: 'fr',
    fallbackLocale: 'en',
    messages,
    fallbackChain: { '*': ['en'] },
  })
  const fbT = fbFluent.global.t

  bench('fallback locale hit', () => {
    fbT('greeting', VALUES.simple)
  })

  bench('fallback chain traversal', () => {
    fbT('items', VALUES.plural)
  })

  bench('missing → handler', () => {
    const mFluent = createFluentVue({
      locale: 'fr',
      fallbackLocale: 'en',
      messages,
      missing: (_locale, id) => `[missing: ${id}]`,
    })
    mFluent.global.t('nonexistent_key')
  })
})

describe('vue — formatters', () => {
  bench('d() — date formatting', () => {
    d(new Date(2025, 0, 15), 'short')
  })

  bench('n() — number formatting', () => {
    n(1234.56, 'currency')
  })
})

describe('vue — catalog scaling', () => {
  for (const size of [10, 100, 1000]) {
    const scaleFluent = createFluentVue({
      locale: 'en',
      messages: { en: generateCatalog(size) },
    })
    const scaleT = scaleFluent.global.t

    bench(`${size} messages — lookup last key`, () => {
      scaleT(`msg_${size - 1}`, { n: 42 })
    })
  }
})
