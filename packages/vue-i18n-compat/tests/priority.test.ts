import { describe, it, expect } from 'vitest'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { createMockVueI18n } from './_helpers'

describe('priority strategy — comprehensive tests', () => {
  const sharedMessages = {
    vueI18n: { en: { shared: 'vue-i18n', legacyOnly: 'legacy' } },
    fluenti: { en: { shared: 'fluenti', fluentiOnly: 'modern' } },
  }

  function createWithPriority(priority?: 'fluenti-first' | 'vue-i18n-first') {
    const vueI18n = createMockVueI18n({ messages: sharedMessages.vueI18n })
    const fluenti = createFluentVue({ locale: 'en', messages: sharedMessages.fluenti })
    const bridge = createFluentBridge({ vueI18n, fluenti, ...(priority ? { priority } : {}) })
    return bridge
  }

  // --- fluenti-first ---

  it('fluenti-first: key in both -> fluenti wins', () => {
    const bridge = createWithPriority('fluenti-first')
    expect(bridge.global.t('shared')).toBe('fluenti')
  })

  it('fluenti-first: key in fluenti only -> fluenti', () => {
    const bridge = createWithPriority('fluenti-first')
    expect(bridge.global.t('fluentiOnly')).toBe('modern')
  })

  it('fluenti-first: key in vue-i18n only -> vue-i18n', () => {
    const bridge = createWithPriority('fluenti-first')
    expect(bridge.global.t('legacyOnly')).toBe('legacy')
  })

  it('fluenti-first: key in neither -> returns key string', () => {
    const bridge = createWithPriority('fluenti-first')
    expect(bridge.global.t('nonexistent')).toBe('nonexistent')
  })

  // --- vue-i18n-first ---

  it('vue-i18n-first: key in both -> vue-i18n wins', () => {
    const bridge = createWithPriority('vue-i18n-first')
    expect(bridge.global.t('shared')).toBe('vue-i18n')
  })

  it('vue-i18n-first: key in fluenti only -> fluenti', () => {
    const bridge = createWithPriority('vue-i18n-first')
    expect(bridge.global.t('fluentiOnly')).toBe('modern')
  })

  it('vue-i18n-first: key in vue-i18n only -> vue-i18n', () => {
    const bridge = createWithPriority('vue-i18n-first')
    expect(bridge.global.t('legacyOnly')).toBe('legacy')
  })

  it('vue-i18n-first: key in neither -> returns key string', () => {
    const bridge = createWithPriority('vue-i18n-first')
    expect(bridge.global.t('nonexistent')).toBe('nonexistent')
  })

  // --- default priority ---

  it('default priority (no option) is fluenti-first', () => {
    const bridge = createWithPriority()
    // No priority specified, default is fluenti-first
    expect(bridge.global.t('shared')).toBe('fluenti')
  })

  // --- priority affects tc() ---

  it('priority affects tc() behavior', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { items: '{count} thing | {count} things' } },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { items: '{count, plural, one {# item} other {# items}}' } },
    })

    const bridgeFluentiFirst = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })
    // fluenti-first: key found in fluenti, uses ICU plurals
    expect(bridgeFluentiFirst.global.tc('items', 1)).toBe('1 item')
    expect(bridgeFluentiFirst.global.tc('items', 5)).toBe('5 items')

    const bridgeVueI18nFirst = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })
    // vue-i18n-first: uses vue-i18n tc
    expect(bridgeVueI18nFirst.global.tc('items', 1)).toBe('1 thing')
    expect(bridgeVueI18nFirst.global.tc('items', 5)).toBe('5 things')
  })

  // --- priority affects tm() ---

  it('priority affects tm() behavior', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { msg: 'vue-i18n raw' } },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { msg: 'fluenti raw' } },
    })

    const bridgeFluentiFirst = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })
    expect(bridgeFluentiFirst.global.tm('msg')).toBe('fluenti raw')

    // vue-i18n-first tm: fluenti-first check is skipped, falls through to vue-i18n tm
    const bridgeVueI18nFirst = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })
    expect(bridgeVueI18nFirst.global.tm('msg')).toBe('vue-i18n raw')
  })

  // --- priority does NOT affect te() ---

  it('priority does NOT affect te() — always OR logic', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { legacyKey: 'L' } },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { fluentiKey: 'F' } },
    })

    const bridgeFluentiFirst = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })
    const bridgeVueI18nFirst = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })

    // te() always returns true if either library has the key, regardless of priority
    for (const bridge of [bridgeFluentiFirst, bridgeVueI18nFirst]) {
      expect(bridge.global.te('legacyKey')).toBe(true)
      expect(bridge.global.te('fluentiKey')).toBe(true)
      expect(bridge.global.te('missing')).toBe(false)
    }
  })
})
