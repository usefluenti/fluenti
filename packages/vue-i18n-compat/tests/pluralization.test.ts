import { describe, it, expect } from 'vitest'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { createMockVueI18n } from './_helpers'

describe('pluralization — complex plural scenarios', () => {
  it('tc() with count = 0 uses plural other form via vue-i18n', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { items: 'no items | {count} items' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    // count 0 !== 1, so picks second pipe form
    expect(bridge.global.tc('items', 0)).toBe('0 items')
  })

  it('tc() with count = 1 uses singular form via vue-i18n', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { items: '{count} item | {count} items' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('items', 1)).toBe('1 item')
  })

  it('tc() with count > 1 uses plural form via vue-i18n', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { items: '{count} item | {count} items' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('items', 7)).toBe('7 items')
  })

  it('tc() ICU with =0, one, other forms via fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          items: '{count, plural, =0 {no items} one {# item} other {# items}}',
        },
      },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('items', 0)).toBe('no items')
    expect(bridge.global.tc('items', 1)).toBe('1 item')
    expect(bridge.global.tc('items', 42)).toBe('42 items')
  })

  it('tc() with extra interpolation values alongside count', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          files: '{count, plural, one {# file in {folder}} other {# files in {folder}}}',
        },
      },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('files', 1, { folder: 'docs' })).toBe('1 file in docs')
    expect(bridge.global.tc('files', 3, { folder: 'images' })).toBe('3 files in images')
  })

  it('tc() vue-i18n fallback pipe syntax: "no items | {count} item | {count} items"', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { apples: '{count} apple | {count} apples' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('apples', 1)).toBe('1 apple')
    expect(bridge.global.tc('apples', 10)).toBe('10 apples')
  })

  it('tc() when key exists in neither library returns the key', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    // fluenti te returns false, falls to vue-i18n tc which returns the key
    expect(bridge.global.tc('nonexistent', 5)).toBe('nonexistent')
  })

  it('tc() vue-i18n-first priority: prefers vue-i18n tc when key in both', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { items: '{count} thing | {count} things' } },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { items: '{count, plural, one {# item} other {# items}}' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })

    // vue-i18n-first: bridgedTc does NOT check fluenti first, goes to vue-i18n tc
    expect(bridge.global.tc('items', 1)).toBe('1 thing')
    expect(bridge.global.tc('items', 5)).toBe('5 things')
  })
})
