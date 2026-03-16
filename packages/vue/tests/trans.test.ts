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
  it('renders plain text without tags', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'Hello world' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('Hello world')
    expect(wrapper.element.tagName).toBe('SPAN')
  })

  it('renders with a custom tag', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'Hello', tag: 'p' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.element.tagName).toBe('P')
  })

  it('parses tags and renders slot content', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'Click <link>here</link> to continue' },
      global: { plugins: [plugin] },
      slots: {
        link: (props: { children: string }) => h('a', { href: '/next' }, props.children),
      },
    })

    expect(wrapper.text()).toBe('Click here to continue')
    expect(wrapper.find('a').exists()).toBe(true)
    expect(wrapper.find('a').text()).toBe('here')
    expect(wrapper.find('a').attributes('href')).toBe('/next')
  })

  it('renders tag content as plain text when no slot provided', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'Click <link>here</link>' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('Click here')
  })

  it('handles multiple tags', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: '<bold>Hello</bold> and <italic>world</italic>' },
      global: { plugins: [plugin] },
      slots: {
        bold: (props: { children: string }) => h('strong', props.children),
        italic: (props: { children: string }) => h('em', props.children),
      },
    })

    expect(wrapper.find('strong').text()).toBe('Hello')
    expect(wrapper.find('em').text()).toBe('world')
    expect(wrapper.text()).toBe('Hello and world')
  })

  it('interpolates values before tag parsing', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: {
        message: 'Hello {name}, click <link>here</link>',
        values: { name: 'Alice' },
      },
      global: { plugins: [plugin] },
      slots: {
        link: (props: { children: string }) => h('a', props.children),
      },
    })

    expect(wrapper.text()).toBe('Hello Alice, click here')
  })

  it('renders default slot when no message prop', () => {
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

  it('returns null when no message and no default slot', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      global: { plugins: [plugin] },
    })

    expect(wrapper.html()).toBe('')
  })

  it('reacts to message prop changes', async () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'First' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('First')

    await wrapper.setProps({ message: 'Second' })
    expect(wrapper.text()).toBe('Second')
  })
})

describe('Trans XSS prevention', () => {
  it('escapes HTML in interpolated values', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: {
        message: 'Hello {name}',
        values: { name: '<img src=x onerror="alert(1)">' },
      },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toContain('<img src=x onerror="alert(1)">')
    // Should be rendered as text, not as an HTML element
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('does not execute script tags in interpolated values', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: {
        message: 'Hello {name}',
        values: { name: '<script>alert("xss")</script>' },
      },
      global: { plugins: [plugin] },
    })

    // Script tag must NOT be rendered as a DOM element
    expect(wrapper.find('script').exists()).toBe(false)
    // The value is safely rendered (either escaped or stripped of tags)
    expect(wrapper.text()).toContain('alert("xss")')
  })

  it('does not execute HTML injected in message prop tags', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: {
        message: 'Click <script>alert(1)</script> here',
      },
      global: { plugins: [plugin] },
    })

    // Unknown tags rendered as plain text, no script execution
    expect(wrapper.find('script').exists()).toBe(false)
  })

  it('renders malicious slot name as plain text when no matching slot', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: {
        message: 'Read <onclick>here</onclick>',
      },
      global: { plugins: [plugin] },
    })

    // No onclick element, rendered as text
    expect(wrapper.text()).toContain('here')
  })

  it('does not allow slot content to inject extra HTML structure', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: {
        message: 'Click <link>here</link> to continue',
      },
      global: { plugins: [plugin] },
      slots: {
        link: (props: { children: string }) => h('a', { href: '/safe' }, props.children),
      },
    })

    expect(wrapper.find('a').attributes('href')).toBe('/safe')
    expect(wrapper.text()).toBe('Click here to continue')
  })
})

describe('Trans edge cases', () => {
  it('renders empty string message', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: '' },
      global: { plugins: [plugin] },
    })

    // Empty message prop is falsy, so no-message path is taken (returns null)
    expect(wrapper.html()).toBe('')
  })

  it('renders nested tags <a><b>content</b></a>', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: '<a><b>content</b></a>' },
      global: { plugins: [plugin] },
      slots: {
        a: (props: { children: string }) => h('span', { class: 'outer' }, props.children),
      },
    })

    // The outer <a> tag is matched; inner <b>content</b> is passed as children text
    expect(wrapper.text()).toContain('content')
  })

  it('renders self-closing tag as plain text', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'Hello <br/> world' },
      global: { plugins: [plugin] },
    })

    // Self-closing tags don't match <tag>content</tag> regex, rendered as text
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('world')
  })

  it('renders tags only, no text', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: '<link>click</link>' },
      global: { plugins: [plugin] },
      slots: {
        link: (props: { children: string }) => h('a', { href: '/go' }, props.children),
      },
    })

    expect(wrapper.text()).toBe('click')
    expect(wrapper.find('a').exists()).toBe(true)
  })

  it('renders single text child', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'Just plain text' },
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('Just plain text')
  })

  it('message prop and slot both present - message takes priority', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: { message: 'From message prop' },
      global: { plugins: [plugin] },
      slots: {
        default: () => 'From default slot',
      },
    })

    // When message prop is provided, it is used (slot is for named tag slots)
    expect(wrapper.text()).toBe('From message prop')
  })

  it('renders values with nested object', () => {
    const plugin = createPlugin()
    const wrapper = mount(Trans, {
      props: {
        message: 'Hello {user}',
        values: { user: { toString: () => 'Alice' } },
      },
      global: { plugins: [plugin] },
    })

    // The interpolation uses the object's toString
    expect(wrapper.text()).toContain('Alice')
  })
})
