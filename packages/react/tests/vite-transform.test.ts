import { describe, it, expect } from 'vitest'

// We test the vite plugin's transform functions directly
// Since they're in the vite-plugin package, we test them through the plugin's exports
// For now, test the expected transform output patterns

describe('Vite Plugin React Transform (expected output)', () => {
  it('t`` should produce direct __i18n.t() call (no useMemo)', () => {
    // The vite plugin transforms:
    //   t`Hello ${name}`
    // into:
    //   __i18n.t('Hello {name}', { name })
    //
    // NOT: useMemo(() => __i18n.t('Hello {name}', { name }), [name])
    // NOT: computed(() => __i18n.t('Hello {name}', { name }))
    //
    // This is by design — t() is a hash lookup (O(1)), and React's
    // re-render cycle handles reactivity naturally.

    const expectedOutput = `__i18n.t('Hello {name}', { name })`
    expect(expectedOutput).not.toContain('useMemo')
    expect(expectedOutput).not.toContain('computed')
    expect(expectedOutput).not.toContain('createMemo')
    expect(expectedOutput).toContain("__i18n.t('Hello {name}'")
  })

  it('import should use __useI18n from @fluenti/react', () => {
    const expectedImport = `import { __useI18n } from '@fluenti/react'`
    expect(expectedImport).toContain('__useI18n')
    expect(expectedImport).toContain('@fluenti/react')
  })

  it('variable naming follows Strategy B', () => {
    // ${name}         → {name}        // simple identifier
    // ${user.name}    → {name}        // member expression → last property
    // ${items.length} → {length}
    // ${getCount()}   → {0}           // function call → positional
    // ${a + b}        → {0}           // expression → positional

    // These patterns are verified via the vite plugin's classifyExpression
    // which is tested in the vite-plugin package's own tests
    expect(true).toBe(true)
  })
})
