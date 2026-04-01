import { describe, it, expect } from 'vitest'
import { rewriteFluentiImports } from '../src/codemod'

describe('rewriteFluentiImports', () => {
  it('keeps main-entry components and only moves interpolate to core/runtime', () => {
    const input = `
import { useI18n, Trans, Plural, interpolate } from '@fluenti/react'

export function Banner() {
  const { t } = useI18n()
  return <Trans>{t\`Hello\`}</Trans>
}
`

    const result = rewriteFluentiImports(input)

    expect(result.changed).toBe(true)
    expect(result.code).toContain("import { useI18n, Trans, Plural } from '@fluenti/react'")
    expect(result.code).toContain("import { interpolate } from '@fluenti/core/runtime'")
    expect(result.code).not.toContain("import { useI18n, Trans, Plural, interpolate } from '@fluenti/react'")
  })

  it('renames createFluentiContext to createFluenti for solid imports and usages', () => {
    const input = `
import { createFluentiContext, Trans } from '@fluenti/solid'

const i18n = createFluentiContext({ locale: 'en', messages: { en: {} } })
`

    const result = rewriteFluentiImports(input)

    expect(result.changed).toBe(true)
    expect(result.code).toContain("import { createFluenti, Trans } from '@fluenti/solid'")
    expect(result.code).toContain("const i18n = createFluenti({ locale: 'en', messages: { en: {} } })")
    expect(result.code).not.toContain('createFluentiContext')
  })

  it('moves interpolate out of components entry imports', () => {
    const input = `
import { Trans, interpolate } from '@fluenti/react/components'
`

    const result = rewriteFluentiImports(input)

    expect(result.changed).toBe(true)
    expect(result.code).toContain("import { Trans } from '@fluenti/react/components'")
    expect(result.code).toContain("import { interpolate } from '@fluenti/core/runtime'")
  })

  it('moves non-component imports back to the main entry when imported from /components', () => {
    const input = `
import { Trans, useI18n } from '@fluenti/react/components'
`

    const result = rewriteFluentiImports(input)

    expect(result.changed).toBe(true)
    expect(result.code).toContain("import { useI18n } from '@fluenti/react'")
    expect(result.code).toContain("import { Trans } from '@fluenti/react/components'")
  })
})
