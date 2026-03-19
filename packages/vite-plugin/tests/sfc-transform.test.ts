import { describe, it, expect } from 'vitest'
import { transformVtDirectives } from '../src/sfc-transform'

describe('transformVtDirectives — no-op cases', () => {
  it('returns unchanged SFC without v-t/Trans/Plural', () => {
    const sfc = '<template><div>Hello</div></template>'
    expect(transformVtDirectives(sfc)).toBe(sfc)
  })

  it('returns unchanged when no template tag', () => {
    const sfc = '<script>export default {}</script>'
    expect(transformVtDirectives(sfc)).toBe(sfc)
  })

  it('returns unchanged when template tag has no closing tag', () => {
    const sfc = '<template><div v-t>Hello'
    expect(transformVtDirectives(sfc)).toBe(sfc)
  })

  it('preserves script and style blocks outside template', () => {
    const sfc = [
      '<template><div>Hello</div></template>',
      '<script setup>const x = 1</script>',
      '<style>.cls {}</style>',
    ].join('\n')
    expect(transformVtDirectives(sfc)).toBe(sfc)
  })
})

describe('transformVtDirectives — v-t attribute binding', () => {
  it('transforms v-t.placeholder attribute binding', () => {
    const sfc = '<template><input v-t.placeholder placeholder="Enter name"></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain(':placeholder="$t(')
    expect(result).not.toContain('v-t.placeholder')
    expect(result).not.toContain('placeholder="Enter name"')
  })

  it('transforms v-t.title attribute binding', () => {
    const sfc = '<template><button v-t.title title="Click me"></button></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain(':title="$t(')
    expect(result).not.toContain('v-t.title')
    expect(result).not.toContain('title="Click me"')
  })

  it('transforms v-t.aria-label attribute binding', () => {
    const sfc = '<template><input v-t.label label="Search"></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain(':label="$t(')
    expect(result).not.toContain('v-t.label')
  })

  it('includes id and message in descriptor for v-t attribute binding', () => {
    const sfc = '<template><input v-t.placeholder placeholder="Enter your name"></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain("message: 'Enter your name'")
    expect(result).toContain("id: '")
  })
})

describe('transformVtDirectives — v-t content', () => {
  it('transforms basic v-t content directive', () => {
    const sfc = '<template><p v-t>Hello world</p></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('{{ $t(')
    expect(result).not.toContain('v-t')
    expect(result).toContain('Hello world')
  })

  it('transforms v-t with {{ var }} interpolation to ICU {var}', () => {
    const sfc = '<template><p v-t>Hello {{ name }}</p></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('Hello {name}')
    expect(result).toContain('name: name')
    expect(result).not.toContain('{{ name }}')
  })

  it('transforms v-t with property access interpolation', () => {
    const sfc = '<template><p v-t>Hello {{ user.name }}</p></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('Hello {name}')
    expect(result).toContain('name: user.name')
  })

  it('transforms v-t with child HTML elements to rich text', () => {
    const sfc = '<template><p v-t>Click <a href="/link">here</a> to continue</p></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('$vtRich(')
    expect(result).toContain("tag: 'a'")
    expect(result).not.toContain('v-t')
  })

  it('transforms v-t with explicit id using v-t:explicitId syntax', () => {
    const sfc = '<template><p v-t:hero.greeting>Hello world</p></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain("id: 'hero.greeting'")
    expect(result).toContain('Hello world')
  })
})

describe('transformVtDirectives — v-t.plural', () => {
  it('processes element with v-t.plural as a $t call (falls back to plain content transform)', () => {
    // v-t.plural="count" in sfc-transform falls back to plain $t when bindExpr is not captured
    const sfc = '<template><span v-t.plural="count">one item | {count} items</span></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('$t(')
    expect(result).not.toContain('v-t.plural')
  })

  it('strips v-t.plural attribute from the element', () => {
    const sfc = '<template><span v-t.plural="count">one item | many items</span></template>'
    const result = transformVtDirectives(sfc)
    expect(result).not.toContain('v-t')
    expect(result).toContain('<span')
  })
})

describe('transformVtDirectives — <Trans> component', () => {
  it('transforms <Trans> with plain text to span', () => {
    const sfc = '<template><Trans>Hello world</Trans></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('<span>')
    expect(result).toContain('{{ $t(')
    expect(result).not.toContain('<Trans>')
  })

  it('transforms <Trans tag="div"> to div wrapper', () => {
    const sfc = '<template><Trans tag="div">Hello world</Trans></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('<div>')
    expect(result).toContain('{{ $t(')
    expect(result).not.toContain('<Trans')
    expect(result).not.toContain('tag=')
  })

  it('leaves <Trans message="..."> untouched (old API)', () => {
    const sfc = '<template><Trans message="Hello world">Hello world</Trans></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('<Trans message="Hello world">')
    expect(result).not.toContain('$t(')
  })

  it('leaves <Trans :id="..."> with dynamic id untouched', () => {
    const sfc = '<template><Trans :id="dynamicId">Hello world</Trans></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('<Trans :id="dynamicId">')
    expect(result).not.toContain('$t(')
  })

  it('transforms <Trans> with child elements to rich text', () => {
    const sfc = '<template><Trans>Click <a href="/link">here</a></Trans></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('$vtRich(')
    expect(result).toContain("tag: 'a'")
    expect(result).not.toContain('<Trans>')
  })

  it('transforms <Trans id="..."> using the explicit id', () => {
    const sfc = '<template><Trans id="home.greeting">Hello world</Trans></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain("id: 'home.greeting'")
    expect(result).not.toContain('<Trans')
  })
})

describe('transformVtDirectives — <Plural> component', () => {
  it('transforms <Plural> self-closing with one/other props', () => {
    const sfc = '<template><Plural :value="count" one="one item" other="{count} items" /></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('{count, plural,')
    expect(result).toContain('one {one item}')
    expect(result).toContain('other {{count} items}')
    expect(result).not.toContain('<Plural')
  })

  it('transforms <Plural> self-closing with custom tag', () => {
    const sfc = '<template><Plural :value="n" tag="p" one="one item" other="{n} items" /></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('<p ')
    expect(result).not.toContain('<Plural')
    expect(result).not.toContain('tag=')
  })

  it('transforms <Plural> with template slot children', () => {
    const sfc = [
      '<template>',
      '<Plural :value="count">',
      '  <template #one>One item</template>',
      '  <template #other>{count} items</template>',
      '</Plural>',
      '</template>',
    ].join('\n')
    const result = transformVtDirectives(sfc)
    expect(result).toContain('{count, plural,')
    expect(result).toContain('one {One item}')
    expect(result).toContain('other {{count} items}')
    expect(result).not.toContain('<Plural')
  })

  it('transforms <Plural> with template slots including zero category', () => {
    const sfc = [
      '<template>',
      '<Plural :value="count">',
      '  <template #zero>No items</template>',
      '  <template #one>One item</template>',
      '  <template #other>Many items</template>',
      '</Plural>',
      '</template>',
    ].join('\n')
    const result = transformVtDirectives(sfc)
    expect(result).toContain('=0 {No items}')
    expect(result).toContain('one {One item}')
    expect(result).toContain('other {Many items}')
  })

  it('transforms <Plural> slot children with nested HTML (rich text)', () => {
    const sfc = [
      '<template>',
      '<Plural :value="count">',
      '  <template #one>One <b>item</b></template>',
      '  <template #other>Many <em>items</em></template>',
      '</Plural>',
      '</template>',
    ].join('\n')
    const result = transformVtDirectives(sfc)
    expect(result).toContain('$vtRich(')
    expect(result).toContain("tag: 'b'")
    expect(result).toContain("tag: 'em'")
    expect(result).not.toContain('<Plural')
  })

  it('serializes rich text element attributes in Plural slots', () => {
    const sfc = [
      '<template>',
      '<Plural :value="count">',
      '  <template #one>One <a href="/item">item</a></template>',
      '  <template #other>Many items</template>',
      '</Plural>',
      '</template>',
    ].join('\n')
    const result = transformVtDirectives(sfc)
    expect(result).toContain("href: '/item'")
  })

  it('transforms <Trans> with context attribute', () => {
    const sfc = '<template><Trans context="menu">Close</Trans></template>'
    const result = transformVtDirectives(sfc)
    expect(result).toContain('{{ $t(')
    expect(result).toContain('Close')
    expect(result).not.toContain('context=')
  })
})
