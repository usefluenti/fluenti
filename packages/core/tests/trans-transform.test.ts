import { describe, it, expect } from 'vitest'
import { transformTransComponents } from '../src/trans-transform'

describe('transformTransComponents', () => {
  it('transforms plain text children', () => {
    const code = '<Trans>Hello world</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id=')
    expect(result.code).toContain('__message="Hello world"')
    expect(result.code).not.toContain('__components')
  })

  it('transforms single element child', () => {
    const code = '<Trans>Hello <b>world</b></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello <0>world</0>"')
    expect(result.code).toContain('__components={[<b />]}')
  })

  it('transforms multiple element children', () => {
    const code = '<Trans>Read the <a href="/docs">documentation</a> for <b>more</b> info.</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Read the <0>documentation</0> for <1>more</1> info."')
    expect(result.code).toContain('__components={[<a href="/docs" />, <b />]}')
  })

  it('uses custom id prop instead of hash', () => {
    const code = '<Trans id="greeting">Hello world</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id="greeting"')
    expect(result.code).toContain('__message="Hello world"')
  })

  it('skips dynamic children with expressions', () => {
    const code = '<Trans>Hello {name}</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('skips already-transformed Trans (has __id)', () => {
    const code = '<Trans __id="abc" __message="Hello">Hello</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('skips Trans with message prop (legacy API)', () => {
    const code = '<Trans message="Hello">Hello</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('handles self-closing element children', () => {
    const code = '<Trans>Hello <br /> world</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello <0/> world"')
    expect(result.code).toContain('__components={[<br />]}')
  })

  it('handles elements with props', () => {
    const code = '<Trans>Click <a href="/link" className="bold">here</a></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Click <0>here</0>"')
    expect(result.code).toContain('__components={[<a href="/link" className="bold" />]}')
  })

  it('handles nested elements', () => {
    const code = '<Trans>Hello <a href="#"><b>world</b></a></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello <0><1>world</1></0>"')
    expect(result.code).toContain('__components={[<a href="#" />, <b />]}')
  })

  it('transforms multiple Trans in same file', () => {
    const code = `
const A = <Trans>Hello</Trans>
const B = <Trans>World</Trans>
`
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello"')
    expect(result.code).toContain('__message="World"')
  })

  it('returns unchanged when no Trans present', () => {
    const code = 'const x = <div>Hello</div>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('produces consistent hash for same message', () => {
    const code1 = '<Trans>Hello world</Trans>'
    const code2 = '<Trans>Hello world</Trans>'
    const result1 = transformTransComponents(code1)
    const result2 = transformTransComponents(code2)

    // Extract __id values
    const id1 = result1.code.match(/__id="([^"]+)"/)?.[1]
    const id2 = result2.code.match(/__id="([^"]+)"/)?.[1]
    expect(id1).toBeTruthy()
    expect(id1).toBe(id2)
  })

  it('skips Trans with JSX expression id prop', () => {
    const code = '<Trans id={someVar}>Hello</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('handles self-closing element before paired element', () => {
    const code = '<Trans>Hello <br /> and <b>world</b></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello <0/> and <1>world</1>"')
    expect(result.code).toContain('__components={[<br />, <b />]}')
  })

  it('handles paired element before self-closing element', () => {
    const code = '<Trans><b>Hello</b> and <br /> world</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="<0>Hello</0> and <1/> world"')
    expect(result.code).toContain('__components={[<b />, <br />]}')
  })

  it('handles context prop with static value', () => {
    const code = '<Trans context="menu">Close</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id=')
    expect(result.code).toContain('__message="Close"')
  })

  it('skips Trans with dynamic context and no explicit id', () => {
    const code = '<Trans context={dynamicCtx}>Close</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  // ─── Self-closing <Trans /> ─────────────────────────
  it('skips self-closing <Trans />', () => {
    const code = '<Trans />'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  // ─── Unparseable code ────────────────────────────────
  it('returns untransformed for unparseable code', () => {
    const code = 'this is {{{ not valid'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  // ─── JSXFragment child ──────────────────────────────
  it('skips JSXFragment children silently', () => {
    const code = '<Trans>Hello <>fragment</></Trans>'
    const result = transformTransComponents(code)
    // Fragments are silently skipped, so message is just "Hello"
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello"')
  })

  // ─── JSXEmptyExpression (comment) ───────────────────
  it('skips JSXEmptyExpression (comment) in children', () => {
    const code = '<Trans>Hello {/* comment */} world</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message=')
  })

  // ─── Empty children ────────────────────────────────
  it('skips Trans with empty children (whitespace only)', () => {
    const code = '<Trans>   </Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  // ─── Boolean attribute (no value) ──────────────────
  it('handles boolean attribute on inner element', () => {
    const code = '<Trans>Click <button disabled>here</button></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Click <0>here</0>"')
    expect(result.code).toContain('__components={[<button disabled />]}')
  })

  // ─── JSXMemberExpression child tag ─────────────────
  it('skips child with JSXMemberExpression tag name', () => {
    const code = '<Trans>Hello <Foo.Bar>world</Foo.Bar></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  // ─── Context with explicit id ──────────────────────
  it('uses explicit id even when context is present', () => {
    const code = '<Trans id="my-id" context="menu">Close</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id="my-id"')
    expect(result.code).toContain('__message="Close"')
  })

  // ─── Dynamic context with explicit id ──────────────
  it('allows dynamic context when explicit id is provided', () => {
    const code = '<Trans id="my-id" context={dynamicCtx}>Close</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id="my-id"')
    expect(result.code).toContain('__message="Close"')
  })

  // ─── Static string inside expression container ─────
  it('handles static string id inside expression container', () => {
    const code = '<Trans id={"greeting"}>Hello</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id="greeting"')
    expect(result.code).toContain('__message="Hello"')
  })

  // ─── Message with double quotes ────────────────────
  it('escapes double quotes in message attribute', () => {
    const code = '<Trans>She said &quot;hello&quot;</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message=')
  })

  // ─── Multiple element types ────────────────────────
  it('handles mix of self-closing and nested elements with text', () => {
    const code = '<Trans><b>Bold</b> then <br /> then <i>italic</i></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="<0>Bold</0> then <1/> then <2>italic</2>"')
    expect(result.code).toContain('__components={[<b />, <br />, <i />]}')
  })

  // ─── Element without attributes ────────────────────
  it('handles element without any attributes', () => {
    const code = '<Trans>Hello <span>world</span></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello <0>world</0>"')
    expect(result.code).toContain('__components={[<span />]}')
  })

  // ─── Non-JSXAttribute in attributes (spread) ──────
  it('handles Trans with non-Trans JSX attributes', () => {
    const code = '<Trans data-testid="test">Hello</Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="Hello"')
  })

  // ─── Deeply nested elements ────────────────────────
  it('handles three levels of nesting', () => {
    const code = '<Trans><a href="#"><b><i>deep</i></b></a></Trans>'
    const result = transformTransComponents(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__message="<0><1><2>deep</2></1></0>"')
    expect(result.code).toContain('__components={[<a href="#" />, <b />, <i />]}')
  })
})
