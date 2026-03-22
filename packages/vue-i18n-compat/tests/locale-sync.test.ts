import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { createMockVueI18n, mountApp } from './_helpers'

describe('locale synchronization — deep tests', () => {
  it('rapid sequential locale changes all sync correctly', async () => {
    const vueI18n = createMockVueI18n({
      locale: 'en',
      messages: { en: {}, ja: {}, fr: {}, zh: {} },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: {}, ja: {}, fr: {}, zh: {} },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    await bridge.global.setLocale('ja')
    await bridge.global.setLocale('fr')
    await bridge.global.setLocale('zh')
    await nextTick()

    expect(fluenti.global.locale.value).toBe('zh')
    expect(vueI18n.global.locale.value).toBe('zh')
    app.unmount()
  })

  it('setLocale() resolves promise and both locales match after await', async () => {
    const vueI18n = createMockVueI18n({
      locale: 'en',
      messages: { en: {}, ko: {} },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: {}, ko: {} },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    const promise = bridge.global.setLocale('ko')
    expect(promise).toBeInstanceOf(Promise)
    await promise
    await nextTick()

    expect(bridge.global.locale.value).toBe('ko')
    expect(fluenti.global.locale.value).toBe('ko')
    expect(vueI18n.global.locale.value).toBe('ko')
    app.unmount()
  })

  it('changing vue-i18n locale triggers fluenti sync', async () => {
    const vueI18n = createMockVueI18n({
      locale: 'en',
      messages: { en: {}, de: {} },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: {}, de: {} },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // Directly mutate vue-i18n locale
    vueI18n.global.locale.value = 'de'
    await nextTick()

    expect(fluenti.global.locale.value).toBe('de')
    app.unmount()
  })

  it('changing fluenti locale triggers vue-i18n sync', async () => {
    const vueI18n = createMockVueI18n({
      locale: 'en',
      messages: { en: {}, pt: {} },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: {}, pt: {} },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    await fluenti.global.setLocale('pt')
    await nextTick()

    expect(vueI18n.global.locale.value).toBe('pt')
    app.unmount()
  })

  it('locale stays in sync after multiple back-and-forth changes', async () => {
    const vueI18n = createMockVueI18n({
      locale: 'en',
      messages: { en: {}, ja: {} },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: {}, ja: {} },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    await bridge.global.setLocale('ja')
    await nextTick()
    expect(fluenti.global.locale.value).toBe('ja')
    expect(vueI18n.global.locale.value).toBe('ja')

    await bridge.global.setLocale('en')
    await nextTick()
    expect(fluenti.global.locale.value).toBe('en')
    expect(vueI18n.global.locale.value).toBe('en')

    await bridge.global.setLocale('ja')
    await nextTick()
    expect(fluenti.global.locale.value).toBe('ja')
    expect(vueI18n.global.locale.value).toBe('ja')

    app.unmount()
  })

  it('initial locale mismatch: bridge aligns to fluenti locale', async () => {
    const vueI18n = createMockVueI18n({
      locale: 'en',
      messages: { en: {}, ja: {} },
    })
    const fluenti = createFluentVue({
      locale: 'ja',
      messages: { en: {}, ja: {} },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // The bridge's locale ref is fluenti's locale ref, so it starts as 'ja'
    expect(bridge.global.locale.value).toBe('ja')

    // After watchers fire, vue-i18n should sync
    // Trigger sync by setting locale explicitly
    await bridge.global.setLocale('ja')
    await nextTick()

    expect(vueI18n.global.locale.value).toBe('ja')
    app.unmount()
  })
})
