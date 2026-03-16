import { bench, describe } from 'vitest'
import { createFluent } from '../src/index'
import { MESSAGES, VALUES, generateCatalog } from './_helpers'

// Pre-compiled function message
const compiledFn = ((values?: Record<string, unknown>) =>
  `Hello ${values?.name ?? 'World'}!`) as unknown as string

const i18n = createFluent({
  locale: 'en',
  fallbackLocale: 'en',
  fallbackChain: { '*': ['en'] },
  messages: {
    en: {
      'static': 'Hello World!',
      'compiled_fn': compiledFn,
      'greeting': MESSAGES.singleVar,
      'items': MESSAGES.pluralSimple,
      ...generateCatalog(100),
    },
    ja: {
      'greeting': 'こんにちは {name}',
    },
  },
  missing: (_locale, id) => `[missing: ${id}]`,
})

describe('e2e pipeline — createFluent().t()', () => {
  bench('pre-compiled static string', () => {
    i18n.t('static')
  })

  bench('pre-compiled function', () => {
    i18n.t('compiled_fn', VALUES.simple)
  })

  bench('ICU string — cache hit', () => {
    i18n.t('greeting', VALUES.simple)
  })

  bench('ICU string — cache miss', () => {
    i18n.t(`dynamic_${Date.now()}`, VALUES.simple)
  })

  bench('fallback locale', () => {
    i18n.setLocale('fr')
    i18n.t('greeting', VALUES.simple)
    i18n.setLocale('en')
  })

  bench('fallback chain', () => {
    i18n.setLocale('zh')
    i18n.t('greeting', VALUES.simple)
    i18n.setLocale('en')
  })

  bench('missing handler', () => {
    i18n.t('nonexistent_key')
  })

  bench('MessageDescriptor', () => {
    i18n.t({ id: 'desc_msg', message: 'Hello {name}' }, VALUES.simple)
  })

  bench('plural through full pipeline', () => {
    i18n.t('items', VALUES.plural)
  })

  bench('format number (d/n helpers)', () => {
    i18n.n(1234.56, 'currency')
  })

  bench('format date (d/n helpers)', () => {
    i18n.d(new Date(2025, 0, 15), 'short')
  })
})
