import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createFluentVue } from '../src/plugin'
import { __useI18n } from '../src/hooks/__useI18n'

const messages = {
  en: { hello: 'Hello' },
}

describe('__useI18n (internal hook)', () => {
  it('returns the i18n context inside a plugin', () => {
    let ctx: ReturnType<typeof __useI18n> | undefined

    const Capture = defineComponent({
      setup() {
        ctx = __useI18n()
        return () => h('span', 'ok')
      },
    })

    const plugin = createFluentVue({ locale: 'en', messages })
    mount(Capture, { global: { plugins: [plugin] } })

    expect(ctx).toBeDefined()
    expect(ctx!.t).toBeTypeOf('function')
    expect(ctx!.d).toBeTypeOf('function')
    expect(ctx!.n).toBeTypeOf('function')
    expect(ctx!.locale.value).toBe('en')
  })

  it('returns a context whose t() translates messages', () => {
    let result = ''

    const Capture = defineComponent({
      setup() {
        const i18n = __useI18n()
        result = i18n.t('hello')
        return () => h('span', result)
      },
    })

    const plugin = createFluentVue({ locale: 'en', messages })
    const wrapper = mount(Capture, { global: { plugins: [plugin] } })

    expect(result).toBe('Hello')
    expect(wrapper.text()).toBe('Hello')
  })

  it('throws when used outside a plugin', () => {
    const Bad = defineComponent({
      setup() {
        __useI18n()
        return () => h('span', 'fail')
      },
    })

    expect(() => mount(Bad)).toThrow('useI18n() requires createFluentVue plugin')
  })
})
