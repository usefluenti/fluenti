import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Trans, Plural, Select, DateTime, NumberFormat } from '../src/components-entry'
import { createFluenti } from '../src/plugin'
import * as mainExports from '../src'

function createPlugin(messages: Record<string, string | ((...args: unknown[]) => string)> = {}) {
  return createFluenti({
    locale: 'en',
    messages: { en: messages },
  })
}

describe('components-entry subpath', () => {
  it('exports all components', () => {
    expect(Trans).toBeDefined()
    expect(Plural).toBeDefined()
    expect(Select).toBeDefined()
    expect(DateTime).toBeDefined()
    expect(NumberFormat).toBeDefined()
  })

  it('main entry does not export component values', () => {
    // Main entry only re-exports types for components, not the runtime values
    expect((mainExports as Record<string, unknown>).Trans).toBeUndefined()
    expect((mainExports as Record<string, unknown>).Plural).toBeUndefined()
    expect((mainExports as Record<string, unknown>).Select).toBeUndefined()
    expect((mainExports as Record<string, unknown>).DateTime).toBeUndefined()
    expect((mainExports as Record<string, unknown>).NumberFormat).toBeUndefined()
  })

  it('Trans renders via components-entry', () => {
    const plugin = createPlugin({ hello: 'Hello World' })
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => 'Hello World',
      },
    })

    expect(wrapper.text()).toBe('Hello World')
  })

  it('DateTime renders via components-entry', () => {
    const plugin = createPlugin()
    const wrapper = mount(DateTime, {
      global: { plugins: [plugin] },
      props: { value: new Date(2025, 0, 15) },
    })

    expect(wrapper.text()).toContain('2025')
  })

  it('NumberFormat renders via components-entry', () => {
    const plugin = createPlugin()
    const wrapper = mount(NumberFormat, {
      global: { plugins: [plugin] },
      props: { value: 1234.5 },
    })

    expect(wrapper.text()).toContain('1')
  })

  it('Plural renders via components-entry', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      global: { plugins: [plugin] },
      props: { value: 5, other: '# items' },
    })

    expect(wrapper.text()).toContain('items')
  })

  it('Select renders via components-entry', () => {
    const plugin = createPlugin()
    const wrapper = mount(Select, {
      global: { plugins: [plugin] },
      props: {
        value: 'male',
        other: 'They',
        options: { male: 'He', female: 'She' },
      },
    })

    expect(wrapper.text()).toContain('He')
  })
})
