import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createFluentVue } from '../src/plugin'
import { Trans } from '../src/components/Trans'

function createPlugin(messages: Record<string, string> = {}) {
  return createFluentVue({
    locale: 'en',
    messages: { en: messages },
  })
}

describe('Trans component', () => {
  it('renders default slot when provided', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => [h('a', { href: '/docs' }, 'documentation'), ' page'],
      },
    })

    expect(wrapper.find('a').text()).toBe('documentation')
    expect(wrapper.text()).toContain('documentation')
    expect(wrapper.text()).toContain('page')
  })

  it('renders single default slot child without wrapper', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => h('strong', 'bold text'),
      },
    })

    expect(wrapper.element.tagName).toBe('STRONG')
    expect(wrapper.text()).toBe('bold text')
  })

  it('wraps multiple default slot children in tag', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { tag: 'p' },
      global: { plugins: [plugin] },
      slots: {
        default: () => ['Hello ', h('strong', 'world')],
      },
    })

    expect(wrapper.element.tagName).toBe('P')
    expect(wrapper.text()).toBe('Hello world')
    expect(wrapper.find('strong').text()).toBe('world')
  })

  it('returns null when no default slot', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
    })

    expect(wrapper.html()).toBe('')
  })

  it('uses default span tag for multiple children', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => ['Hello ', h('em', 'world')],
      },
    })

    expect(wrapper.element.tagName).toBe('SPAN')
    expect(wrapper.text()).toBe('Hello world')
  })

  it('renders nested elements in default slot', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => h('a', { href: '#' }, [h('b', 'nested')]),
      },
    })

    expect(wrapper.find('a').exists()).toBe(true)
    expect(wrapper.find('b').text()).toBe('nested')
  })
})
