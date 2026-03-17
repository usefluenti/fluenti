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
})
