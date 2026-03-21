import { bench, describe } from 'vitest'
import { createFluent } from '@fluenti/core'
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
  return createFluent({
    locale: 'en',
    fallbackLocale: 'en',
    messages,
    missing: (_locale, id) => `[missing: ${id}]`,
    dateFormats: { short: { year: 'numeric', month: 'short', day: 'numeric' } },
    numberFormats: { currency: { style: 'currency', currency: 'USD' } },
  })
}

const i18n = createInstance()

// ── Benchmarks ──

describe('react — instance creation', () => {
  bench('createFluent()', () => {
    createInstance()
  })
})

describe('react — t() lookup', () => {
  bench('static string', () => {
    i18n.t('static')
  })

  bench('compiled function', () => {
    i18n.t('compiled_fn', VALUES.simple)
  })

  bench('interpolated — single var', () => {
    i18n.t('greeting', VALUES.simple)
  })

  bench('interpolated — multi var', () => {
    i18n.t('multi', VALUES.multiVar)
  })

  bench('plural (ICU)', () => {
    i18n.t('items', VALUES.plural)
  })

  bench('select (ICU)', () => {
    i18n.t('went', VALUES.select)
  })

  bench('nested plural+select (ICU)', () => {
    i18n.t('nested', VALUES.nestedPluralSelect)
  })
})

describe('react — t() fallback', () => {
  const fbI18n = createFluent({
    locale: 'fr',
    fallbackLocale: 'en',
    messages,
    fallbackChain: { '*': ['en'] },
  })

  bench('fallback locale hit', () => {
    fbI18n.t('greeting', VALUES.simple)
  })

  bench('fallback chain traversal', () => {
    fbI18n.t('items', VALUES.plural)
  })

  bench('missing → handler', () => {
    const mI18n = createFluent({
      locale: 'fr',
      fallbackLocale: 'en',
      messages,
      missing: (_locale, id) => `[missing: ${id}]`,
    })
    mI18n.t('nonexistent_key')
  })
})

describe('react — formatters', () => {
  bench('d() — date formatting', () => {
    i18n.d(new Date(2025, 0, 15), 'short')
  })

  bench('n() — number formatting', () => {
    i18n.n(1234.56, 'currency')
  })
})

describe('react — catalog scaling', () => {
  for (const size of [10, 100, 1000]) {
    const scaleI18n = createFluent({
      locale: 'en',
      messages: { en: generateCatalog(size) },
    })

    bench(`${size} messages — lookup last key`, () => {
      scaleI18n.t(`msg_${size - 1}`, { n: 42 })
    })
  }
})
