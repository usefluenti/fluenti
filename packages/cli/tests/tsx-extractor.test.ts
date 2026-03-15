import { describe, it, expect } from 'vitest'
import { extractFromTsx } from '../src/tsx-extractor'

describe('extractFromTsx', () => {
  it('extracts t`` tagged template with plain text', () => {
    const code = `const msg = t\`Hello World\``
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('Hello World')
  })

  it('extracts t`` with simple variable (Strategy B)', () => {
    const code = 'const msg = t`Hello ${name}`'
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('Hello {name}')
  })

  it('extracts t`` with property access (Strategy B)', () => {
    const code = 'const msg = t`Hello ${user.name}`'
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('Hello {name}')
  })

  it('extracts t`` with complex expression (Strategy B)', () => {
    const code = 'const msg = t`Total: ${getTotal()}`'
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('Total: {0}')
  })

  it('extracts t`` with mixed expressions (Strategy B)', () => {
    const code = 'const msg = t`${user.name} owes ${getTotal()}`'
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('{name} owes {0}')
  })

  it('extracts t() function call', () => {
    const code = `const msg = t('Hello World')`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('Hello World')
  })

  it('extracts t() with double quotes', () => {
    const code = `const msg = t("Hello World")`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('Hello World')
  })

  it('extracts <Trans> component', () => {
    const code = `const el = <Trans message="Hello world"/>`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('Hello world')
  })

  it('extracts <Trans> with explicit id', () => {
    const code = `const el = <Trans id="greet" message="Hello world"/>`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].id).toBe('greet')
  })

  it('extracts <Plural> component', () => {
    const code = `const el = <Plural one="one item" other="{count} items" count="n"/>`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('{n, plural, one {one item} other {{count} items}}')
  })

  it('extracts <Plural> with zero category', () => {
    const code = `const el = <Plural zero="no items" one="one item" other="{count} items" count="n"/>`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('zero {no items}')
  })

  it('extracts multiple messages', () => {
    const code = `
const a = t\`Hello\`
const b = t('World')
const c = <Trans message="Goodbye"/>
`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(3)
  })

  it('returns empty array for files without messages', () => {
    const code = `const x = 42`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(0)
  })

  it('sets correct origin info', () => {
    const code = `const msg = t('Hello')`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages[0].origin.file).toBe('App.tsx')
    expect(messages[0].origin.line).toBe(1)
  })

  it('generates deterministic hash IDs', () => {
    const code = `const msg = t('Hello World')`
    const m1 = extractFromTsx(code, 'a.tsx')
    const m2 = extractFromTsx(code, 'b.tsx')
    expect(m1[0].id).toBe(m2[0].id) // Same message -> same hash
  })

  // ─── <Trans>children</Trans> extraction ────────────────────────────────────

  it('extracts <Trans>children text</Trans> as message', () => {
    const code = `const el = <Trans>Hello World</Trans>`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages.some(m => m.message === 'Hello World')).toBe(true)
  })

  it('extracts <Trans> with child elements as rich text message', () => {
    const code = `const el = <Trans>Click <a href="/next">here</a> to continue</Trans>`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages.some(m => m.message === 'Click <0>here</0> to continue')).toBe(true)
  })

  it('does not extract <Trans> children when message prop is present', () => {
    const code = `const el = <Trans message="Hello">Ignored children</Trans>`
    const messages = extractFromTsx(code, 'App.tsx')
    // Should extract the message prop value, not children
    expect(messages.some(m => m.message === 'Hello')).toBe(true)
    expect(messages.some(m => m.message === 'Ignored children')).toBe(false)
  })

  it('extracts <Plural> with value={expr} prop', () => {
    const code = `const el = <Plural value={count} one="# item" other="# items" />`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toBe('{count, plural, one {# item} other {# items}}')
  })

  it('extracts <Plural> with value={expr} and zero category', () => {
    const code = `const el = <Plural value={n} zero="No items" one="# item" other="# items" />`
    const messages = extractFromTsx(code, 'App.tsx')
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('{n, plural,')
    expect(messages[0].message).toContain('zero {No items}')
  })
})
