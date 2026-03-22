import { describe, it, expect } from 'vitest'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { createMockVueI18n, mountApp } from './_helpers'

describe('error handling — edge cases', () => {
  it('t() with empty string key returns the empty string key', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    // Empty key is not found in either library, vue-i18n mock returns the key as-is
    const result = bridge.global.t('')
    expect(result).toBe('')
  })

  it('t() with undefined values does not throw', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hello' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(() => bridge.global.t('hello', undefined)).not.toThrow()
    expect(bridge.global.t('hello', undefined)).toBe('Hello')
  })

  it('tc() with count = 0 uses plural form', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { items: 'no items | {count} items' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const result = bridge.global.tc('items', 0)
    // count !== 1, so pipe plural picks the second form
    expect(result).toBe('0 items')
  })

  it('tc() with negative count does not throw', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { temp: '{count} degree | {count} degrees' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(() => bridge.global.tc('temp', -5)).not.toThrow()
    const result = bridge.global.tc('temp', -5)
    expect(result).toBe('-5 degrees')
  })

  it('te() with empty string returns false (no key matches empty)', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hi' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { world: 'World' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.te('')).toBe(false)
  })

  it('tm() for non-existent key returns undefined', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tm('nonexistent')).toBeUndefined()
  })

  it('setLocale with same locale completes without error', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    await expect(bridge.global.setLocale('en')).resolves.toBeUndefined()
    expect(bridge.global.locale.value).toBe('en')
    app.unmount()
  })

  it('multiple app.use(bridge) on separate apps does not throw', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app: app1 } = mountApp(() => {}, [bridge])
    // Second app using same bridge should not throw
    expect(() => {
      const { app: app2 } = mountApp(() => {}, [bridge])
      app2.unmount()
    }).not.toThrow()

    app1.unmount()
  })
})
