import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFluentVue } from '../src/plugin'
import { Plural } from '../src/components/Plural'

function createPlugin() {
  return createFluentVue({
    locale: 'en',
    messages: { en: {} },
  })
}

describe('Plural component', () => {
  it('renders "other" for non-matching values', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 5, other: '# items' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('5 items')
  })

  it('renders "zero" when value is 0 and zero prop is set', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 0, zero: 'No items', other: '# items' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('No items')
  })

  it('renders "one" when value is 1', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 1, one: '1 item', other: '# items' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('1 item')
  })

  it('replaces # with the value', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 42, other: '# things' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('42 things')
  })

  it('falls back to "other" when category is not provided', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 1, other: '# items' },
      global: { plugins: [plugin] },
    })

    // In English, 1 selects "one", but "one" prop is not given
    // So it falls back to "other"
    expect(wrapper.text()).toBe('1 items')
  })

  it('uses the correct tag', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 5, other: '# items', tag: 'p' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.element.tagName).toBe('P')
  })

  it('reacts to value changes', async () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 0, zero: 'No items', one: '1 item', other: '# items' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('No items')

    await wrapper.setProps({ value: 1 })
    expect(wrapper.text()).toBe('1 item')

    await wrapper.setProps({ value: 5 })
    expect(wrapper.text()).toBe('5 items')
  })

  it('reacts to locale changes', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {}, ar: {} },
    })

    const wrapper = mount(Plural, {
      props: { value: 0, zero: 'No items', other: '# items' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('No items')

    // Switching locale should still render correctly
    plugin.global.setLocale('ar')
    await nextTick()

    // value is 0 and zero is set, so it should still show "No items"
    expect(wrapper.text()).toBe('No items')
  })

  it('handles multiple # replacements', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 3, other: '# out of # total' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('3 out of 3 total')
  })

  it('renders "two" category when value is 2 and two prop is set', () => {
    // Use Arabic locale where 2 maps to "two" plural category
    const plugin = createFluentVue({
      locale: 'ar',
      messages: { ar: {} },
    })
    const wrapper = mount(Plural, {
      props: { value: 2, two: '# عنصران', other: '# عناصر' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('2 عنصران')
  })

  it('renders zero prop with # replacement', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 0, zero: '# items remaining', other: '# items' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('0 items remaining')
  })

  it('falls back to other when value is 0 but zero prop is not set', () => {
    const plugin = createPlugin()
    const wrapper = mount(Plural, {
      props: { value: 0, other: '# items' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('0 items')
  })

  it('renders "few" category for matching locale', () => {
    // Polish uses "few" for values like 3
    const plugin = createFluentVue({
      locale: 'pl',
      messages: { pl: {} },
    })
    const wrapper = mount(Plural, {
      props: { value: 3, few: '# elementy', many: '# elementów', other: '# elementów' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('3 elementy')
  })

  it('renders "many" category for matching locale', () => {
    // Polish uses "many" for values like 5
    const plugin = createFluentVue({
      locale: 'pl',
      messages: { pl: {} },
    })
    const wrapper = mount(Plural, {
      props: { value: 5, few: '# elementy', many: '# elementów', other: '# elementów' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('5 elementów')
  })

  // ---- Auto-translation via catalog ----

  describe('catalog-based auto-translation', () => {
    it('translates plural forms via t() when catalog has the ICU message', () => {
      const plugin = createFluentVue({
        locale: 'ja',
        messages: {
          ja: {
            '{count, plural, =0 {No apples} one {1 apple} other {# apples}}':
              '{count, plural, =0 {りんごなし} one {りんご 1 個} other {りんご # 個}}',
          },
        },
      })

      const wrapper = mount(Plural, {
        props: { value: 5, zero: 'No apples', one: '1 apple', other: '# apples' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('りんご 5 個')
    })

    it('translates zero form via catalog', () => {
      const plugin = createFluentVue({
        locale: 'zh-CN',
        messages: {
          'zh-CN': {
            '{count, plural, =0 {No apples} one {1 apple} other {# apples}}':
              '{count, plural, =0 {没有苹果} one {1 个苹果} other {# 个苹果}}',
          },
        },
      })

      const wrapper = mount(Plural, {
        props: { value: 0, zero: 'No apples', one: '1 apple', other: '# apples' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('没有苹果')
    })

    it('translates one form via catalog', () => {
      const plugin = createFluentVue({
        locale: 'ja',
        messages: {
          ja: {
            '{count, plural, =0 {No apples} one {1 apple} other {# apples}}':
              '{count, plural, =0 {りんごなし} one {りんご 1 個} other {りんご # 個}}',
          },
        },
      })

      const wrapper = mount(Plural, {
        props: { value: 1, zero: 'No apples', one: '1 apple', other: '# apples' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('りんご 1 個')
    })

    it('falls back to local resolution when catalog has no entry', () => {
      const plugin = createFluentVue({
        locale: 'fr',
        messages: { fr: {} },
      })

      const wrapper = mount(Plural, {
        props: { value: 3, one: '# item', other: '# items' },
        global: { plugins: [plugin] },
      })

      // No catalog entry for fr, so local resolution uses source-language props
      expect(wrapper.text()).toBe('3 items')
    })

    it('reacts to locale changes with catalog translation', async () => {
      const plugin = createFluentVue({
        locale: 'en',
        messages: {
          en: {
            '{count, plural, =0 {No items} one {# item} other {# items}}':
              '{count, plural, =0 {No items} one {# item} other {# items}}',
          },
          ja: {
            '{count, plural, =0 {No items} one {# item} other {# items}}':
              '{count, plural, =0 {アイテムなし} one {# 個} other {# 個}}',
          },
        },
      })

      const wrapper = mount(Plural, {
        props: { value: 5, zero: 'No items', one: '# item', other: '# items' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('5 items')

      plugin.global.setLocale('ja')
      await nextTick()

      expect(wrapper.text()).toBe('5 個')
    })

    it('builds correct ICU key with only other prop', () => {
      const plugin = createFluentVue({
        locale: 'ja',
        messages: {
          ja: {
            '{count, plural, other {# things}}':
              '{count, plural, other {# 個のもの}}',
          },
        },
      })

      const wrapper = mount(Plural, {
        props: { value: 7, other: '# things' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('7 個のもの')
    })

    it('builds correct ICU key with all category props', () => {
      const plugin = createFluentVue({
        locale: 'ar',
        messages: {
          ar: {
            '{count, plural, =0 {لا عناصر} one {عنصر واحد} two {عنصران} few {# عناصر قليلة} many {# عنصر} other {# عنصر}}':
              '{count, plural, =0 {لا عناصر} one {عنصر واحد} two {عنصران} few {# عناصر قليلة} many {# عنصر} other {# عنصر}}',
          },
        },
      })

      const wrapper = mount(Plural, {
        props: {
          value: 2,
          zero: 'لا عناصر',
          one: 'عنصر واحد',
          two: 'عنصران',
          few: '# عناصر قليلة',
          many: '# عنصر',
          other: '# عنصر',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('عنصران')
    })

    it('uses source-language props for en locale without catalog entry', () => {
      // When the source locale has no explicit catalog entry, local fallback works
      const plugin = createPlugin()

      const wrapper = mount(Plural, {
        props: { value: 1, zero: 'No items', one: '1 item', other: '# items' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('1 item')
    })
  })

  // ---- Rich text via named slots ----

  describe('named slot support (rich text)', () => {
    it('renders slot for matching category (zero)', () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 0 },
        slots: {
          zero: '<strong>No items</strong> left',
          other: 'Some items',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<strong>No items</strong> left')
    })

    it('renders slot for matching category (one)', () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 1 },
        slots: {
          one: '<em>1</em> item remaining',
          other: 'items remaining',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<em>1</em> item remaining')
    })

    it('renders slot for matching category (other)', () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 5 },
        slots: {
          one: '<em>1</em> item',
          other: '<strong>many</strong> items',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<strong>many</strong> items')
    })

    it('passes scoped slot props with count', () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 42 },
        slots: {
          other: (props: { count: number }) => `${props.count} total items`,
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('42 total items')
    })

    it('falls back to #other slot when category slot is missing', () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 1 },
        slots: {
          other: '<strong>fallback</strong>',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<strong>fallback</strong>')
    })

    it('falls back to string props when no slots exist', () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 5, other: '# items' },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('5 items')
    })

    it('re-renders when value prop changes', async () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 0 },
        slots: {
          zero: 'No items',
          one: 'One item',
          other: 'Many items',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('No items')

      await wrapper.setProps({ value: 1 })
      expect(wrapper.text()).toBe('One item')

      await wrapper.setProps({ value: 5 })
      expect(wrapper.text()).toBe('Many items')
    })

    it('respects locale for category resolution (Arabic two)', () => {
      const plugin = createFluentVue({
        locale: 'ar',
        messages: { ar: {} },
      })

      const wrapper = mount(Plural, {
        props: { value: 2 },
        slots: {
          two: '<strong>اثنان</strong>',
          other: 'عدد',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<strong>اثنان</strong>')
    })

    it('respects locale for category resolution (Polish few)', () => {
      const plugin = createFluentVue({
        locale: 'pl',
        messages: { pl: {} },
      })

      const wrapper = mount(Plural, {
        props: { value: 3 },
        slots: {
          few: '<em>kilka</em> elementów',
          many: 'dużo elementów',
          other: 'elementy',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.html()).toContain('<em>kilka</em> elementów')
    })

    it('uses correct wrapper tag with slots', () => {
      const plugin = createPlugin()
      const wrapper = mount(Plural, {
        props: { value: 5, tag: 'div' },
        slots: {
          other: 'content',
        },
        global: { plugins: [plugin] },
      })

      expect(wrapper.element.tagName).toBe('DIV')
    })
  })
})
