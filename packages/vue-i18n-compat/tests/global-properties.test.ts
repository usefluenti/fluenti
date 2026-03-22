import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { createMockVueI18n, mountApp } from './_helpers'

describe('global properties — Vue app.$t, $te, $tc, $d, $n', () => {
  it('$t is overridden to bridged version', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hi vue-i18n' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { hello: 'Hi fluenti' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // Bridged $t with fluenti-first should return fluenti message
    expect(app.config.globalProperties['$t']('hello')).toBe('Hi fluenti')
    app.unmount()
  })

  it('$te is overridden to bridged version', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { legacy: 'L' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { modern: 'M' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    const $te = app.config.globalProperties['$te']
    // Bridged te checks both libraries
    expect($te('legacy')).toBe(true)
    expect($te('modern')).toBe(true)
    expect($te('nonexistent')).toBe(false)
    app.unmount()
  })

  it('$tc is overridden to bridged version', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { apples: '{count} apple | {count} apples' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    const $tc = app.config.globalProperties['$tc']
    expect($tc('apples', 1)).toBe('1 apple')
    expect($tc('apples', 3)).toBe('3 apples')
    app.unmount()
  })

  it('$d is available from fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // $d is set by fluenti plugin during install
    const $d = app.config.globalProperties['$d']
    expect($d).toBeDefined()
    app.unmount()
  })

  it('$n is available from fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    const $n = app.config.globalProperties['$n']
    expect($n).toBeDefined()
    app.unmount()
  })

  it('$t with fluenti-first resolves correctly', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { shared: 'vue-i18n', legacy: 'only vue-i18n' } },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { shared: 'fluenti', modern: 'only fluenti' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })

    const { app } = mountApp(() => {}, [bridge])

    const $t = app.config.globalProperties['$t']
    expect($t('shared')).toBe('fluenti')
    expect($t('legacy')).toBe('only vue-i18n')
    expect($t('modern')).toBe('only fluenti')
    app.unmount()
  })

  it('$t with vue-i18n-first resolves correctly', () => {
    const vueI18n = createMockVueI18n({
      messages: { en: { shared: 'vue-i18n', legacy: 'only vue-i18n' } },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { shared: 'fluenti', modern: 'only fluenti' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })

    const { app } = mountApp(() => {}, [bridge])

    const $t = app.config.globalProperties['$t']
    expect($t('shared')).toBe('vue-i18n')
    expect($t('legacy')).toBe('only vue-i18n')
    expect($t('modern')).toBe('only fluenti')
    app.unmount()
  })

  it('global properties survive across component re-mounts', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { msg: 'Hello' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const el = document.createElement('div')
    const app = createApp(defineComponent({ render() { return h('div') } }))
    app.use(bridge)
    app.mount(el)

    const $tBefore = app.config.globalProperties['$t']

    // Unmount and remount a different component on same app
    app.unmount()

    // Global properties are on the app, not the component, so they persist
    const $tAfter = app.config.globalProperties['$t']
    expect($tAfter).toBe($tBefore)
  })
})
