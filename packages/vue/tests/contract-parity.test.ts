import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import {
  contractLocale,
  contractMessages,
  pluralContract,
  selectContract,
  transContract,
} from '../../core/tests/fixtures/cross-framework-contract'
import { createFluentVue } from '../src/plugin'
import { Plural, Select, Trans } from '../src'

function createPlugin() {
  return createFluentVue({
    locale: contractLocale,
    messages: contractMessages,
  })
}

describe('cross-framework contract parity', () => {
  it('renders explicit-id Trans content and contextual rich Trans content', () => {
    const plugin = createPlugin()
    const basic = mount(Trans, {
      props: { id: transContract.basic.id },
      slots: { default: () => transContract.basic.message },
      global: { plugins: [plugin] },
    })

    expect(basic.text()).toBe(transContract.basic.expectedText)

    const rich = mount(Trans, {
      props: {
        context: transContract.rich.context,
        comment: transContract.rich.comment,
      },
      slots: {
        default: () => [
          'Click ',
          h('a', { href: transContract.rich.href }, ['the ', h('strong', 'docs')]),
          ' now',
        ],
      },
      global: { plugins: [plugin] },
    })

    expect(rich.text()).toBe(transContract.rich.expectedText)
    expect(rich.find('a').attributes('href')).toBe(transContract.rich.href)
    expect(rich.find('strong').text()).toBe('ドキュメント')
  })

  it('keeps Plural offset, zero, and adjusted # semantics aligned', () => {
    const plugin = createPlugin()
    const zero = mount(Plural, {
      props: {
        value: pluralContract.zeroValue,
        context: pluralContract.context,
        comment: pluralContract.comment,
        offset: pluralContract.offset,
        zero: pluralContract.zero,
        one: pluralContract.one,
        other: pluralContract.other,
      },
      global: { plugins: [plugin] },
    })

    expect(zero.text()).toBe(pluralContract.expectedZeroText)

    const adjusted = mount(Plural, {
      props: {
        value: pluralContract.value,
        context: pluralContract.context,
        comment: pluralContract.comment,
        offset: pluralContract.offset,
        zero: pluralContract.zero,
        one: pluralContract.one,
        other: pluralContract.other,
      },
      global: { plugins: [plugin] },
    })

    expect(adjusted.text()).toBe(pluralContract.expectedText)
  })

  it('keeps Select options precedence, fallback, and rich content aligned', () => {
    const plugin = createPlugin()
    const translated = mount(Select, {
      props: {
        value: selectContract.value,
        context: selectContract.context,
        comment: selectContract.comment,
        options: selectContract.options,
        other: selectContract.other,
      },
      global: { plugins: [plugin] },
    })

    expect(translated.text()).toBe(selectContract.expectedText)

    const precedence = mount(Select, {
      props: {
        value: selectContract.precedence.value,
        options: selectContract.precedence.options,
        other: selectContract.precedence.other,
      },
      attrs: { admin: selectContract.precedence.directAdmin },
      global: { plugins: [plugin] },
    })

    expect(precedence.text()).toBe(selectContract.precedence.expectedText)

    const fallback = mount(Select, {
      props: {
        value: selectContract.fallback.value,
        other: selectContract.fallback.other,
      },
      attrs: { admin: selectContract.fallback.directAdmin },
      global: { plugins: [plugin] },
    })

    expect(fallback.text()).toBe(selectContract.fallback.expectedText)

    const rich = mount(Select, {
      props: {
        value: selectContract.rich.value,
        context: selectContract.rich.context,
        comment: selectContract.rich.comment,
        other: selectContract.rich.other,
      },
      slots: {
        admin: () => [h('strong', 'Admin'), ' access'],
        other: () => selectContract.rich.other,
      },
      global: { plugins: [plugin] },
    })

    expect(rich.text()).toBe(selectContract.rich.expectedText)
    expect(rich.find('strong').text()).toBe('管理者')
  })
})
