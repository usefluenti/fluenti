import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createFluentVue } from '../src/plugin'
import { msg } from '../src/msg'
import { useI18n } from '../src/use-i18n'

describe('msg``', () => {
  it('creates MessageDescriptor, not a string', () => {
    const descriptor = msg`Hello World`
    expect(typeof descriptor).toBe('object')
    expect(descriptor).toHaveProperty('id')
    expect(descriptor).toHaveProperty('message')
    expect(typeof descriptor.id).toBe('string')
    expect(descriptor.message).toBe('Hello World')
  })

  it('resolves when passed to t() inside component', () => {
    const greeting = msg`Hello`

    const Display = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('span', t(greeting))
      },
    })

    const plugin = createFluentVue({ locale: 'en', messages: { en: {} } })
    const wrapper = mount(Display, { global: { plugins: [plugin] } })

    expect(wrapper.text()).toBe('Hello')
  })

  it('works in module-level constants', () => {
    const NAV_ITEMS = [
      { path: '/', label: msg`Home` },
      { path: '/settings', label: msg`Settings` },
    ]

    const Nav = defineComponent({
      setup() {
        const { t } = useI18n()
        return () =>
          h(
            'nav',
            NAV_ITEMS.map((item) => h('a', { href: item.path }, t(item.label))),
          )
      },
    })

    const plugin = createFluentVue({ locale: 'en', messages: { en: {} } })
    const wrapper = mount(Nav, { global: { plugins: [plugin] } })

    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('Settings')
  })
})
