import { describe, it, expect } from 'vitest'
import {
  createVtNodeTransform,
  extractRichTextFromChildren,
  getStaticPropValue,
  NT_ELEMENT,
  NT_TEXT,
  NT_INTERPOLATION,
  NT_ATTRIBUTE,
  NT_DIRECTIVE,
  NT_SIMPLE_EXPRESSION,
  type ASTNode,
  type TransformContext,
} from '../src/vt-transform'

function makeContext(overrides?: Partial<TransformContext>): TransformContext {
  return {
    replaceNode: () => {},
    removeNode: () => {},
    parent: null,
    childIndex: 0,
    ...overrides,
  }
}

function textNode(content: string): ASTNode {
  return { type: NT_TEXT, content }
}

function interpolationNode(expr: string): ASTNode {
  return {
    type: NT_INTERPOLATION,
    content: { type: NT_SIMPLE_EXPRESSION, content: expr, isStatic: false },
  }
}

function elementNode(tag: string, props: ASTNode[] = [], children: ASTNode[] = []): ASTNode {
  return { type: NT_ELEMENT, tag, props, children }
}

function attrNode(name: string, value: string): ASTNode {
  return {
    type: NT_ATTRIBUTE,
    name,
    value: { type: NT_SIMPLE_EXPRESSION, content: value, isStatic: true },
  }
}

function vtDirective(options?: {
  arg?: string
  modifiers?: string[]
  exp?: string
}): ASTNode {
  return {
    type: NT_DIRECTIVE,
    name: 't',
    arg: options?.arg
      ? { type: NT_SIMPLE_EXPRESSION, content: options.arg, isStatic: true }
      : undefined,
    modifiers: options?.modifiers ?? [],
    exp: options?.exp
      ? { type: NT_SIMPLE_EXPRESSION, content: options.exp, isStatic: false }
      : undefined,
  } as ASTNode
}

function bindDirective(argName: string, exp: string): ASTNode {
  return {
    type: NT_DIRECTIVE,
    name: 'bind',
    arg: { type: NT_SIMPLE_EXPRESSION, content: argName, isStatic: true },
    exp: { type: NT_SIMPLE_EXPRESSION, content: exp, isStatic: false },
  } as ASTNode
}

describe('createVtNodeTransform — non-element early return', () => {
  it('returns undefined for text nodes', () => {
    const transform = createVtNodeTransform()
    const node = textNode('hello')
    const result = transform(node, makeContext())
    expect(result).toBeUndefined()
  })

  it('returns undefined for interpolation nodes', () => {
    const transform = createVtNodeTransform()
    const node = interpolationNode('x')
    const result = transform(node, makeContext())
    expect(result).toBeUndefined()
  })
})

describe('createVtNodeTransform — v-t simple text', () => {
  it('replaces children with {{ $t(msgId) }}', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('p', [vtDirective()], [textNode('Hello world')])
    transform(node, makeContext())

    expect(node.children).toHaveLength(1)
    expect(node.children![0]!.type).toBe(NT_INTERPOLATION)
    const expr = (node.children![0]!.content as ASTNode).content as string
    expect(expr).toContain("$t('Hello world')")
    // v-t directive should be removed
    expect(node.props).toHaveLength(0)
  })
})

describe('createVtNodeTransform — v-t:explicitId', () => {
  it('uses explicit ID from arg', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('p', [vtDirective({ arg: 'hero.title' })], [textNode('Hello')])
    transform(node, makeContext())

    const expr = (node.children![0]!.content as ASTNode).content as string
    expect(expr).toContain("$t('hero.title')")
  })
})

describe('createVtNodeTransform — v-t.alt attribute binding', () => {
  it('transforms v-t.alt to :alt="$t(hash)"', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'img',
      [vtDirective({ modifiers: ['alt'] }), attrNode('alt', 'Profile photo')],
      [],
    )
    transform(node, makeContext())

    // v-t should be removed, alt replaced with v-bind:alt
    expect(node.props).toHaveLength(1)
    expect(node.props![0]!.type).toBe(NT_DIRECTIVE)
    expect(node.props![0]!.name).toBe('bind')
    const argContent = (node.props![0]!.arg as ASTNode).content as string
    expect(argContent).toBe('alt')
    const expContent = (node.props![0]!.exp as ASTNode).content as string
    expect(expContent).toContain("$t('Profile photo')")
  })
})

describe('createVtNodeTransform — v-t.placeholder', () => {
  it('transforms v-t.placeholder to :placeholder="$t(hash)"', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'input',
      [vtDirective({ modifiers: ['placeholder'] }), attrNode('placeholder', 'Search...')],
      [],
    )
    transform(node, makeContext())

    expect(node.props).toHaveLength(1)
    expect(node.props![0]!.name).toBe('bind')
    const argContent = (node.props![0]!.arg as ASTNode).content as string
    expect(argContent).toBe('placeholder')
  })
})

describe('createVtNodeTransform — v-t.plural', () => {
  it('builds ICU plural message from pipe-separated forms', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'span',
      [vtDirective({ modifiers: ['plural'], exp: 'count' })],
      [textNode('one item | {count} items')],
    )
    transform(node, makeContext())

    const expr = (node.children![0]!.content as ASTNode).content as string
    expect(expr).toContain('{count, plural, one {one item} other {{count} items}}')
    expect(expr).toContain('{ count }')
    expect(node.props).toHaveLength(0)
  })

  it('defaults count var to "count" when exp.content is not a string', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'span',
      [{
        type: NT_DIRECTIVE,
        name: 't',
        modifiers: ['plural'],
        exp: { type: NT_SIMPLE_EXPRESSION, content: 42 as any, isStatic: false },
      } as ASTNode],
      [textNode('one | many')],
    )
    transform(node, makeContext())

    const expr = (node.children![0]!.content as ASTNode).content as string
    expect(expr).toContain('count')
  })
})

describe('createVtNodeTransform — v-t rich text', () => {
  it('uses v-html with $vtRich for child elements', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'p',
      [vtDirective()],
      [
        textNode('Click '),
        elementNode('a', [attrNode('href', '/link')], [textNode('here')]),
        textNode(' now'),
      ],
    )
    transform(node, makeContext())

    // Children should be cleared (v-html takes over)
    expect(node.children).toHaveLength(0)
    // v-html directive added
    const htmlDir = node.props!.find((p: ASTNode) => p.name === 'html')
    expect(htmlDir).toBeTruthy()
    const expContent = (htmlDir!.exp as ASTNode).content as string
    expect(expContent).toContain('$vtRich(')
    expect(expContent).toContain('"tag":"a"')
  })
})

describe('createVtNodeTransform — <Trans> component', () => {
  it('transforms plain text <Trans> to span with $t', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Trans', [], [textNode('Hello world')])
    transform(node, makeContext())

    expect(node.tag).toBe('span')
    expect(node.children).toHaveLength(1)
    expect(node.children![0]!.type).toBe(NT_INTERPOLATION)
  })

  it('skips <Trans> with message prop', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Trans', [attrNode('message', 'Hello')], [textNode('Hello')])
    transform(node, makeContext())

    // Tag should remain Trans (not transformed)
    expect(node.tag).toBe('Trans')
  })

  it('skips <Trans> without children', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Trans', [], [])
    transform(node, makeContext())
    expect(node.tag).toBe('Trans')
  })

  it('skips <Trans> with dynamic :id', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Trans', [bindDirective('id', 'someVar')], [textNode('Hello')])
    transform(node, makeContext())
    expect(node.tag).toBe('Trans')
  })

  it('transforms rich text <Trans> with v-html + $vtRich', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Trans', [], [
      textNode('Click '),
      elementNode('b', [], [textNode('here')]),
    ])
    transform(node, makeContext())

    expect(node.tag).toBe('span')
    expect(node.children).toHaveLength(0)
    const htmlDir = node.props!.find((p: ASTNode) => p.name === 'html')
    expect(htmlDir).toBeTruthy()
  })

  it('uses custom wrapper tag from tag prop', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Trans', [attrNode('tag', 'div')], [textNode('Hello')])
    transform(node, makeContext())

    expect(node.tag).toBe('div')
  })

  it('strips Trans-specific props (tag, id, context, comment)', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'Trans',
      [attrNode('tag', 'div'), attrNode('id', 'test'), attrNode('context', 'menu'), attrNode('comment', 'for translators'), attrNode('class', 'foo')],
      [textNode('Hello')],
    )
    transform(node, makeContext())

    // Only class should remain
    expect(node.props!.length).toBe(1)
    expect(node.props![0]!.name).toBe('class')
  })

  it('skips <Trans> with empty message after extraction', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Trans', [], [textNode('   ')])
    transform(node, makeContext())
    // Empty whitespace message → no transform
    expect(node.tag).toBe('Trans')
  })

  it('uses static id prop', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'Trans',
      [attrNode('id', 'hero.greeting')],
      [textNode('Hello')],
    )
    transform(node, makeContext())

    const expr = (node.children![0]!.content as ASTNode).content as string
    expect(expr).toContain('hero.greeting')
  })

  it('skips <Trans> with dynamic :context when no explicit id', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'Trans',
      [bindDirective('context', 'dynamicCtx')],
      [textNode('Hello')],
    )
    transform(node, makeContext())
    expect(node.tag).toBe('Trans')
  })
})

describe('createVtNodeTransform — <Plural> component', () => {
  it('transforms string-prop path with one/other', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      bindDirective('value', 'count'),
      attrNode('one', '1 item'),
      attrNode('other', '{count} items'),
    ], [])
    transform(node, makeContext())

    expect(node.tag).toBe('span')
    // Should have v-text directive
    const textDir = node.props!.find((p: ASTNode) => p.name === 'text')
    expect(textDir).toBeTruthy()
    const expr = (textDir!.exp as ASTNode).content as string
    expect(expr).toContain('{count, plural, one {1 item} other {{count} items}}')
    expect(expr).toContain('count: count')
  })

  it('returns early when no :value binding', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      attrNode('one', '1 item'),
      attrNode('other', 'items'),
    ], [])
    transform(node, makeContext())
    // No :value → no transform
    expect(node.tag).toBe('Plural')
  })

  it('returns early when :value exp is empty', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      {
        type: NT_DIRECTIVE,
        name: 'bind',
        arg: { type: NT_SIMPLE_EXPRESSION, content: 'value', isStatic: true },
        exp: { type: NT_SIMPLE_EXPRESSION, content: '', isStatic: false },
      } as ASTNode,
      attrNode('one', '1 item'),
    ], [])
    transform(node, makeContext())
    expect(node.tag).toBe('Plural')
  })

  it('returns early when no plural categories', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      bindDirective('value', 'count'),
    ], [])
    transform(node, makeContext())
    expect(node.tag).toBe('Plural')
  })

  it('transforms slot children path', () => {
    const transform = createVtNodeTransform()
    const slotDirective = (name: string): ASTNode => ({
      type: NT_DIRECTIVE,
      name: 'slot',
      arg: { type: NT_SIMPLE_EXPRESSION, content: name, isStatic: true },
    } as ASTNode)

    const node = elementNode('Plural', [
      bindDirective('value', 'count'),
    ], [
      elementNode('template', [slotDirective('one')], [textNode('One item')]),
      elementNode('template', [slotDirective('other')], [textNode('{count} items')]),
    ])
    transform(node, makeContext())

    expect(node.tag).toBe('span')
    // Should have v-html (slot path uses v-html with $vtRich when no elements,
    // but actually for plain text it still uses v-html since slot path always emits $vtRich)
    const htmlDir = node.props!.find((p: ASTNode) => p.name === 'html')
    expect(htmlDir).toBeTruthy()
    const expr = (htmlDir!.exp as ASTNode).content as string
    expect(expr).toContain('{count, plural, one {One item} other {{count} items}}')
  })

  it('returns early when slot children have no recognized categories', () => {
    const transform = createVtNodeTransform()
    const slotDirective = (name: string): ASTNode => ({
      type: NT_DIRECTIVE,
      name: 'slot',
      arg: { type: NT_SIMPLE_EXPRESSION, content: name, isStatic: true },
    } as ASTNode)

    const node = elementNode('Plural', [
      bindDirective('value', 'count'),
    ], [
      elementNode('template', [slotDirective('unknown')], [textNode('text')]),
    ])
    transform(node, makeContext())
    expect(node.tag).toBe('Plural')
  })

  it('maps zero category to =0 in ICU', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      bindDirective('value', 'count'),
      attrNode('zero', 'No items'),
      attrNode('other', '{count} items'),
    ], [])
    transform(node, makeContext())

    const textDir = node.props!.find((p: ASTNode) => p.name === 'text')
    const expr = (textDir!.exp as ASTNode).content as string
    expect(expr).toContain('=0 {No items}')
  })

  it('uses custom wrapper tag from tag prop', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      bindDirective('value', 'count'),
      attrNode('tag', 'div'),
      attrNode('one', '1'),
      attrNode('other', 'many'),
    ], [])
    transform(node, makeContext())

    expect(node.tag).toBe('div')
  })

  it('handles slot children with rich text (nested HTML elements)', () => {
    const transform = createVtNodeTransform()
    const slotDirective = (name: string): ASTNode => ({
      type: NT_DIRECTIVE,
      name: 'slot',
      arg: { type: NT_SIMPLE_EXPRESSION, content: name, isStatic: true },
    } as ASTNode)

    const node = elementNode('Plural', [
      bindDirective('value', 'count'),
    ], [
      elementNode('template', [slotDirective('one')], [
        textNode('One '),
        elementNode('b', [], [textNode('item')]),
      ]),
      elementNode('template', [slotDirective('other')], [
        textNode('Many items'),
      ]),
    ])
    transform(node, makeContext())

    expect(node.tag).toBe('span')
    const htmlDir = node.props!.find((p: ASTNode) => p.name === 'html')
    expect(htmlDir).toBeTruthy()
    const expr = (htmlDir!.exp as ASTNode).content as string
    expect(expr).toContain('<0>item</0>')
    expect(expr).toContain('"tag":"b"')
  })
})

describe('extractRichTextFromChildren', () => {
  it('handles pure text children', () => {
    const result = extractRichTextFromChildren([textNode('Hello world')])
    expect(result.message).toBe('Hello world')
    expect(result.hasElements).toBe(false)
    expect(result.elements).toHaveLength(0)
  })

  it('handles element children', () => {
    const result = extractRichTextFromChildren([
      textNode('Click '),
      elementNode('a', [attrNode('href', '/link')], [textNode('here')]),
    ])
    expect(result.message).toBe('Click <0>here</0>')
    expect(result.hasElements).toBe(true)
    expect(result.elements).toEqual([{ tag: 'a', attrs: { href: '/link' } }])
  })

  it('handles interpolation children', () => {
    const result = extractRichTextFromChildren([
      textNode('Hello '),
      interpolationNode('name'),
    ])
    expect(result.message).toBe('Hello {{ name }}')
    expect(result.hasElements).toBe(false)
  })

  it('handles mixed text, elements, and interpolations', () => {
    const result = extractRichTextFromChildren([
      textNode('Hello '),
      elementNode('b', [], [textNode('world')]),
      textNode(' from '),
      interpolationNode('author'),
    ])
    expect(result.message).toBe('Hello <0>world</0> from {{ author }}')
    expect(result.hasElements).toBe(true)
    expect(result.elements).toEqual([{ tag: 'b', attrs: {} }])
  })

  it('handles unknown node types', () => {
    const result = extractRichTextFromChildren([{ type: 99 } as ASTNode])
    expect(result.message).toBe('')
  })

  it('handles text node with non-string content', () => {
    const result = extractRichTextFromChildren([{ type: NT_TEXT, content: { nested: true } as any }])
    expect(result.message).toBe('')
  })

  it('handles interpolation with string content directly', () => {
    const result = extractRichTextFromChildren([{
      type: NT_INTERPOLATION,
      content: 'rawExpr',
    }])
    expect(result.message).toBe('{{ rawExpr }}')
  })
})

describe('getStaticPropValue', () => {
  it('returns value for matching attribute', () => {
    const props = [attrNode('id', 'test')]
    expect(getStaticPropValue(props, 'id')).toBe('test')
  })

  it('returns undefined for non-matching attribute', () => {
    const props = [attrNode('id', 'test')]
    expect(getStaticPropValue(props, 'class')).toBeUndefined()
  })

  it('returns undefined when prop has no value', () => {
    const props: ASTNode[] = [{ type: NT_ATTRIBUTE, name: 'disabled' } as ASTNode]
    expect(getStaticPropValue(props, 'disabled')).toBeUndefined()
  })

  it('returns undefined when value content is not a string', () => {
    const props: ASTNode[] = [{
      type: NT_ATTRIBUTE,
      name: 'data',
      value: { type: NT_SIMPLE_EXPRESSION, content: { complex: true } as any },
    } as ASTNode]
    expect(getStaticPropValue(props, 'data')).toBeUndefined()
  })
})

describe('exported constants', () => {
  it('exports correct node type constants', () => {
    expect(NT_ELEMENT).toBe(1)
    expect(NT_TEXT).toBe(2)
    expect(NT_INTERPOLATION).toBe(5)
    expect(NT_ATTRIBUTE).toBe(6)
    expect(NT_DIRECTIVE).toBe(7)
    expect(NT_SIMPLE_EXPRESSION).toBe(4)
  })
})

describe('createVtNodeTransform — element without v-t', () => {
  it('returns undefined for element without v-t directive', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('div', [attrNode('class', 'foo')], [textNode('Hello')])
    const result = transform(node, makeContext())
    expect(result).toBeUndefined()
  })
})

describe('createVtNodeTransform — v-t:arg with additional modifiers', () => {
  it('reconstructs dotted ID from arg + non-reserved modifiers (attr binding path)', () => {
    const transform = createVtNodeTransform()
    // title is a KNOWN_ATTR, so with a matching static attr it takes the attr binding path
    const node = elementNode(
      'img',
      [vtDirective({ arg: 'section', modifiers: ['title'] }), attrNode('title', 'Photo')],
      [],
    )
    transform(node, makeContext())

    // v-t removed, title replaced with :title="$t('Photo')"
    expect(node.props).toHaveLength(1)
    expect(node.props![0]!.name).toBe('bind')
  })

  it('reconstructs dotted ID from arg + non-attr modifiers for content', () => {
    const transform = createVtNodeTransform()
    // 'info' is NOT a known attr modifier, so it gets concatenated into the explicit ID
    const node = elementNode(
      'p',
      [vtDirective({ arg: 'section', modifiers: ['info'] })],
      [textNode('Hello')],
    )
    transform(node, makeContext())

    const expr = (node.children![0]!.content as ASTNode).content as string
    expect(expr).toContain('section.info')
  })
})

describe('createVtNodeTransform — v-t plural with explicit id', () => {
  it('uses explicit id for plural messages', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'span',
      [vtDirective({ arg: 'items', modifiers: ['plural'], exp: 'count' })],
      [textNode('one item | many items')],
    )
    transform(node, makeContext())

    const expr = (node.children![0]!.content as ASTNode).content as string
    expect(expr).toContain("$t('items'")
  })
})

describe('<Trans> — strips v-bind Trans props', () => {
  it('strips v-bind:context from props', () => {
    const transform = createVtNodeTransform()
    const node = elementNode(
      'Trans',
      [
        attrNode('id', 'test'),
        bindDirective('context', "'menu'"),
        attrNode('class', 'my-class'),
      ],
      [textNode('Hello')],
    )
    transform(node, makeContext())

    // Only class should remain (id and :context stripped)
    expect(node.props!.length).toBe(1)
    expect(node.props![0]!.name).toBe('class')
  })
})

describe('<Plural> — valueExpr not string', () => {
  it('returns early when valueProp.exp.content is not a string', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      {
        type: NT_DIRECTIVE,
        name: 'bind',
        arg: { type: NT_SIMPLE_EXPRESSION, content: 'value', isStatic: true },
        exp: { type: NT_SIMPLE_EXPRESSION, content: 42 as any, isStatic: false },
      } as ASTNode,
    ], [])
    transform(node, makeContext())
    expect(node.tag).toBe('Plural')
  })

  it('returns early when valueProp has no exp', () => {
    const transform = createVtNodeTransform()
    const node = elementNode('Plural', [
      {
        type: NT_DIRECTIVE,
        name: 'bind',
        arg: { type: NT_SIMPLE_EXPRESSION, content: 'value', isStatic: true },
      } as ASTNode,
    ], [])
    transform(node, makeContext())
    expect(node.tag).toBe('Plural')
  })
})
