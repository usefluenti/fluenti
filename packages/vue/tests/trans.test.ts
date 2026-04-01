import { describe, it, expect } from 'vitest'
import { Comment, Text, createTextVNode, createVNode, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createFluenti } from '../src/plugin'
import { Trans } from '../src/components/Trans'
import { hashMessage } from '@fluenti/core/compiler'
import { extractMessage, reconstruct, serializeRichForms } from '../src/components/rich-text'

function createPlugin(messages: Record<string, string> = {}) {
  return createFluenti({
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

  it('renders multiple children as fragment (no wrapper) by default', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => ['Hello ', h('em', 'world')],
      },
    })

    // No span wrapper — renders as fragment
    expect(wrapper.find('span').exists()).toBe(false)
    expect(wrapper.find('em').text()).toBe('world')
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('world')
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

  it('returns single array element without wrapper when reconstruct returns array of 1', () => {
    // When the translated message has exactly one component and no surrounding text,
    // the result array has length 1 and should be unwrapped (line 54 of Trans.ts)
    const message = '<0>only link</0>'
    const plugin = createFluenti({
      locale: 'ja',
      messages: {
        ja: {
          [hashMessage(message)]: '<0>リンクのみ</0>',
        },
      },
    })

    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => [h('a', { href: '/link' }, 'only link')],
      },
    })

    // Should render just the <a> without any wrapper
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.text()).toBe('リンクのみ')
  })

  it('translates default slot content without the build plugin', () => {
    const message = 'Visit the <0>documentation</0> page'
    const plugin = createFluenti({
      locale: 'ja',
      messages: {
        ja: {
          [hashMessage(message)]: '<0>ドキュメント</0>ページを見る',
        },
      },
    })

    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
      slots: {
        default: () => ['Visit the ', h('a', { href: '/docs' }, 'documentation'), ' page'],
      },
    })

    expect(wrapper.text()).toBe('ドキュメントページを見る')
    expect(wrapper.find('a').text()).toBe('ドキュメント')
    expect(wrapper.find('a').attributes('href')).toBe('/docs')
  })
})

describe('extractMessage edge cases', () => {
  it('skips null, undefined, and boolean children', () => {
    // Line 12: node === null || node === undefined || typeof node === 'boolean'
    const result = extractMessage([null, undefined, true, false, 'text'])
    expect(result.message).toBe('text')
    expect(result.components).toHaveLength(0)
  })

  it('skips Comment vnodes', () => {
    // Line 21: node.type === Comment
    const commentNode = createVNode(Comment, null, 'a comment')
    const result = extractMessage([commentNode, 'text'])
    expect(result.message).toBe('text')
    expect(result.components).toHaveLength(0)
  })

  it('handles Text vnodes with string children', () => {
    // Line 22-23: node.type === Text
    const textNode = createTextVNode('hello')
    const result = extractMessage([textNode])
    expect(result.message).toBe('hello')
  })

  it('handles Text vnodes with non-string children', () => {
    // Line 23: typeof node.children !== 'string' -> ''
    const textNode = createVNode(Text, null, null as any)
    const result = extractMessage([textNode])
    expect(result.message).toBe('')
  })

  it('handles number children', () => {
    // Line 17-18: typeof node === 'number'
    const result = extractMessage([42 as any])
    expect(result.message).toBe('42')
  })

  it('skips non-VNode objects', () => {
    // Line 21: !isVNode(node) — objects that are not vnodes
    const result = extractMessage([{ notAVNode: true } as any, 'text'])
    expect(result.message).toBe('text')
  })
})

describe('reconstruct edge cases', () => {
  it('returns content text when component index is out of range', () => {
    // Line 60: reconstruct falls back to match[2] when component is undefined
    const result = reconstruct('<5>some text</5>', [])
    expect(result).toBe('some text')
  })

  it('handles component with null props', () => {
    // Line 58: component.props ?? {} — tests the ?? {} fallback
    const vnode = h('a', null, 'link')
    // Force props to null to test the ?? {} branch
    ;(vnode as any).props = null
    const result = reconstruct('<0>content</0>', [vnode])
    // Should render with empty props
    expect(result).toBeTruthy()
  })

  it('handles translated string with no tags', () => {
    const result = reconstruct('plain text', [])
    expect(result).toBe('plain text')
  })

  it('handles empty translated string', () => {
    const result = reconstruct('', [])
    expect(result).toBe('')
  })
})

describe('serializeRichForms edge cases', () => {
  it('processes extra keys not in the predefined keys list', () => {
    // Lines 94-96: The second loop handles keys from Object.entries(forms)
    // that are not included in the predefined `keys` array
    const forms: Record<string, string | undefined> = {
      one: 'one item',
      other: 'items',
      custom: 'custom form',
    }
    // Only 'one' and 'other' are in predefined keys
    const result = serializeRichForms(['one', 'other'], forms)
    expect(result.messages).toHaveProperty('custom', 'custom form')
    expect(result.messages).toHaveProperty('one', 'one item')
    expect(result.messages).toHaveProperty('other', 'items')
  })

  it('skips undefined extra keys', () => {
    const forms: Record<string, string | undefined> = {
      one: 'one item',
      other: 'items',
      extra: undefined,
    }
    const result = serializeRichForms(['one', 'other'], forms)
    expect(result.messages).not.toHaveProperty('extra')
  })
})
