import { describe, it, expect } from 'vitest'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { createMockVueI18n } from './_helpers'

describe('message descriptor — object key support', () => {
  it('t({ id: "key" }) looks up by id in fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: 'Hello from fluenti' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.t({ id: 'greeting' })).toBe('Hello from fluenti')
  })

  it('t({ id: "key", message: "fallback" }) uses id when found', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: 'Catalog message' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const result = bridge.global.t({ id: 'greeting', message: 'Fallback text' })
    expect(result).toBe('Catalog message')
  })

  it('t({ id: "missing" }) falls back to vue-i18n when fluenti-first', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { missing: 'Found in vue-i18n' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })

    // Descriptor id not in fluenti, falls to vue-i18n.t(stringKey)
    expect(bridge.global.t({ id: 'missing' })).toBe('Found in vue-i18n')
  })

  it('t({ id: "missing" }) with vue-i18n-first checks vue-i18n first', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { missing: 'vue-i18n has it' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })

    expect(bridge.global.t({ id: 'missing' })).toBe('vue-i18n has it')
  })

  it('t() with string key still works alongside descriptors', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { legacy: 'Legacy text' } } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { modern: 'Modern text' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    // String key
    expect(bridge.global.t('modern')).toBe('Modern text')
    expect(bridge.global.t('legacy')).toBe('Legacy text')

    // Descriptor key
    expect(bridge.global.t({ id: 'modern' })).toBe('Modern text')
  })

  it('t({ id: "key" }) with interpolation values', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { welcome: 'Welcome, {name}!' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.t({ id: 'welcome' }, { name: 'Alice' })).toBe('Welcome, Alice!')
  })

  it('t({ id: "missing-everywhere" }) returns id string when not in either', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    // Not found in fluenti, vue-i18n t returns key
    expect(bridge.global.t({ id: 'missing-everywhere' })).toBe('missing-everywhere')
  })
})
