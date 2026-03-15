import { describe, it, expect } from 'vitest'
import { transformSvelte } from '../src/index'

describe('transformSvelte', () => {
  it('returns unchanged code when no t`` found', () => {
    const code = `<script>let x = 1</script>\n<h1>Hello</h1>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('transforms t`` in template expressions to __i18n.t()', () => {
    const code = `<script>let x = 1</script>\n<h1>{t\`Hello\`}</h1>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`__i18n.t('Hello')`)
    expect(result.code).not.toContain('$derived')
    expect(result.code).toContain(`import { __getI18n as __getI18n } from '@fluenti/svelte'`)
    expect(result.code).toContain(`const __i18n = __getI18n()`)
  })

  it('wraps t`` variable assignments with $derived in script', () => {
    const code = `<script>\n  const greeting = t\`Hello\`\n</script>\n<h1>{greeting}</h1>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`const greeting = $derived(__i18n.t('Hello'))`)
  })

  it('handles t`` with interpolation in script', () => {
    const code = `<script>\n  let name = 'World'\n  const greeting = t\`Hello \${name}\`\n</script>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`$derived(__i18n.t('Hello {name}', { name: name }))`)
  })

  it('handles t`` with interpolation in template', () => {
    const code = `<script>let name = 'World'</script>\n<h1>{t\`Hello \${name}\`}</h1>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`__i18n.t('Hello {name}', { name: name })`)
    // Template expression should NOT have $derived
    expect(result.code).not.toContain('$derived')
  })

  it('handles property access expressions', () => {
    const code = `<script>let user = { name: 'World' }\n  const greeting = t\`Hello \${user.name}\`</script>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`__i18n.t('Hello {name}', { name: user.name })`)
  })

  it('transforms standalone t() calls in script', () => {
    const code = `<script>\n  let msg = t('Hello')\n</script>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`__i18n.t('Hello')`)
  })

  it('transforms standalone t() calls with values', () => {
    const code = `<script>\n  let msg = t('Hello', { name: 'World' })\n</script>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`__i18n.t('Hello', { name: 'World' })`)
  })

  it('transforms t() calls in template', () => {
    const code = `<script>let x = 1</script>\n<h1>{t('Hello')}</h1>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`__i18n.t('Hello')`)
  })

  it('does not transform .t() or $t() calls', () => {
    const code = `<script>\n  let x = obj.t('test')\n  let y = $t('test')\n</script>`
    const result = transformSvelte(code)
    // Neither should be transformed
    expect(result.code).toContain(`obj.t('test')`)
    expect(result.code).toContain(`$t('test')`)
  })

  it('only injects one import per file', () => {
    const code = `<script>\n  const a = t\`Hello\`\n  const b = t\`World\`\n</script>\n<p>{t\`Bye\`}</p>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    const importCount = (result.code.match(/__getI18n/g) || []).length
    // Should have: import { __getI18n as __getI18n }, const __i18n = __getI18n()
    expect(importCount).toBe(3)
  })

  it('handles script with lang="ts"', () => {
    const code = `<script lang="ts">\n  const greeting: string = t\`Hello\`\n</script>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`$derived(__i18n.t('Hello'))`)
  })

  it('handles let assignments with $derived', () => {
    const code = `<script>\n  let greeting = t\`Hello\`\n</script>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    expect(result.code).toContain(`let greeting = $derived(__i18n.t('Hello'))`)
  })

  it('does not wrap non-assignment t`` in script with $derived', () => {
    const code = `<script>\n  console.log(t\`Hello\`)\n</script>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(true)
    // Should be direct call, not $derived
    expect(result.code).toContain(`console.log(__i18n.t('Hello'))`)
    expect(result.code).not.toContain('$derived')
  })

  it('skips files without <script> block', () => {
    const code = `<h1>{t\`Hello\`}</h1>`
    const result = transformSvelte(code)
    expect(result.changed).toBe(false)
  })
})
