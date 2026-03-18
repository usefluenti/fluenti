import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { createFluentVue } from '../src/plugin'
import { Select } from '../src/components/Select'

function createPlugin() {
  return createFluentVue({
    locale: 'en',
    messages: { en: {} },
  })
}

describe('Select component', () => {
  describe('attrs-based API (backwards compatible)', () => {
    it('renders the matching option from direct attrs', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'They liked it',
        },
        attrs: { male: 'He liked it', female: 'She liked it' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('He liked it')
    })

    it('falls back to "other" when value does not match', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'nonbinary',
          other: 'They liked it',
        },
        attrs: { male: 'He liked it', female: 'She liked it' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('They liked it')
    })

    it('reacts to value changes', async () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'They',
        },
        attrs: { male: 'He', female: 'She' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('He')

      await wrapper.setProps({ value: 'female' })
      expect(wrapper.text()).toBe('She')

      await wrapper.setProps({ value: 'other_value' })
      expect(wrapper.text()).toBe('They')
    })

    it('works with no matching attrs', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'anything',
          other: 'Default text',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Default text')
    })
  })

  describe('options prop API (type-safe)', () => {
    it('renders the matching option from options prop', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'They liked it',
          options: { male: 'He liked it', female: 'She liked it' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('He liked it')
    })

    it('falls back to "other" when value does not match options', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'nonbinary',
          other: 'They liked it',
          options: { male: 'He liked it', female: 'She liked it' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('They liked it')
    })

    it('reacts to value changes with options prop', async () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'They',
          options: { male: 'He', female: 'She' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('He')

      await wrapper.setProps({ value: 'female' })
      expect(wrapper.text()).toBe('She')

      await wrapper.setProps({ value: 'unknown' })
      expect(wrapper.text()).toBe('They')
    })

    it('reacts to options prop changes', async () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'greeting',
          other: 'Hello',
          options: { greeting: 'Hi there' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Hi there')

      await wrapper.setProps({
        options: { greeting: 'Hey!' },
      })
      expect(wrapper.text()).toBe('Hey!')
    })

    it('works with empty options object', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'Fallback',
          options: {},
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Fallback')
    })

    it('uses catalog translation for string options', () => {
      const plugin = createFluentVue({
        locale: 'ja',
        messages: {
          ja: {
            '{value, select, male {He liked it} female {She liked it} other {They liked it}}':
              '{value, select, male {彼が気に入りました} female {彼女が気に入りました} other {その人が気に入りました}}',
          },
        },
      })
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'They liked it',
          options: { male: 'He liked it', female: 'She liked it' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('彼が気に入りました')
    })
  })

  describe('options prop takes precedence over attrs', () => {
    it('uses options prop value when both options and attrs are present', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'They',
          options: { male: 'From options' },
        },
        attrs: { male: 'From attrs' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('From options')
    })

    it('falls back to other (not attrs) when options prop is set but has no match', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'female',
          other: 'They',
          options: { male: 'He' },
        },
        attrs: { female: 'She from attrs' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('They')
    })
  })

  describe('tag prop', () => {
    it('uses the correct tag', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'x',
          other: 'text',
          tag: 'div',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.element.tagName).toBe('DIV')
    })

    it('defaults to span', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'x',
          other: 'text',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.element.tagName).toBe('SPAN')
    })
  })

  describe('named slot support (rich text)', () => {
    it('renders slot for matching value', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
        },
        slots: {
          male: '<strong>He</strong> liked this',
          female: '<strong>She</strong> liked this',
          other: '<em>They</em> liked this',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<strong>He</strong> liked this')
    })

    it('falls back to #other slot when value does not match', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'nonbinary',
        },
        slots: {
          male: '<strong>He</strong> liked this',
          other: '<em>They</em> liked this',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<em>They</em> liked this')
    })

    it('passes scoped slot props with value', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
        },
        slots: {
          male: (props: { value: string }) => `Selected: ${props.value}`,
          other: 'other',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Selected: male')
    })

    it('falls back to string props when no slots exist', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
          other: 'They liked it',
        },
        attrs: { male: 'He liked it' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('He liked it')
    })

    it('reacts to value changes with slots', async () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'male',
        },
        slots: {
          male: '<strong>He</strong>',
          female: '<strong>She</strong>',
          other: '<em>They</em>',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<strong>He</strong>')

      await wrapper.setProps({ value: 'female' })
      expect(wrapper.html()).toContain('<strong>She</strong>')

      await wrapper.setProps({ value: 'unknown' })
      expect(wrapper.html()).toContain('<em>They</em>')
    })

    it('translates rich slot content without the build plugin', () => {
      const plugin = createFluentVue({
        locale: 'ja',
        messages: {
          ja: {
            '{value, select, male {<0>He</0> liked this} other {<1>They</1> liked this}}':
              '{value, select, male {<0>彼</0>が気に入りました} other {<1>その人</1>が気に入りました}}',
          },
        },
      })

      const wrapper = mount(Select, {
        props: {
          value: 'male',
        },
        slots: {
          male: () => [h('strong', 'He'), ' liked this'],
          other: () => [h('em', 'They'), ' liked this'],
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('彼が気に入りました')
      expect(wrapper.find('strong').text()).toBe('彼')
    })
  })

  describe('edge cases', () => {
    it('handles empty string value', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: '',
          other: 'Default',
          options: { '': 'Empty match' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Empty match')
    })

    it('handles undefined-like value (no match)', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'undefined',
          other: 'Fallback',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Fallback')
    })

    it('handles special character value', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'a&b<c',
          other: 'Default',
          options: { 'a&b<c': 'Special matched' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Special matched')
    })

    it('renders empty string when no other and no match', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'nonexistent',
          options: { male: 'He' },
        },
        global: { plugins: [plugin] },
      })

      // No other prop, no match -> empty string
      expect(wrapper.text()).toBe('')
    })

    it('slot no match no other - renders nothing', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: 'nonexistent',
        },
        slots: {
          male: 'He',
        },
        global: { plugins: [plugin] },
      })

      // No slot matches 'nonexistent', no 'other' slot either
      // hasSlots check: !!slots['nonexistent'] || !!slots['other'] = false
      // Falls to string path with no other prop -> empty string
      expect(wrapper.text()).toBe('')
    })

    it('handles numeric string "123"', () => {
      const plugin = createPlugin()
      const wrapper = mount(Select, {
        props: {
          value: '123',
          other: 'Default',
          options: { '123': 'Numeric match' },
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Numeric match')
    })
  })
})
