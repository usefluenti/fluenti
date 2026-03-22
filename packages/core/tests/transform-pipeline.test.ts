import { describe, it, expect } from 'vitest'
import {
  createTransformPipeline,
  hasScopeTransformCandidate,
} from '../src/transform'

describe('createTransformPipeline', () => {
  const pipeline = createTransformPipeline({ framework: 'react' })

  it('transforms JSX file with <Trans> component', () => {
    const code = `
import { Trans } from '@fluenti/react'
export default function App() {
  return <Trans>Hello <b>world</b></Trans>
}
`
    const result = pipeline.transform(code, 'src/App.tsx')
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id')
  })

  it('transforms file with t`` from useI18n()', () => {
    const code = `
import { useI18n } from '@fluenti/react'
function App() {
  const { t } = useI18n()
  return t\`Hello\`
}
`
    const result = pipeline.transform(code, 'src/App.tsx')
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  it('transforms file with both <Trans> and t``', () => {
    const code = `
import { useI18n, Trans } from '@fluenti/react'
function App() {
  const { t } = useI18n()
  const msg = t\`Greeting\`
  return <Trans>Hello <b>world</b></Trans>
}
`
    const result = pipeline.transform(code, 'src/App.tsx')
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id')
    expect(result.code).toContain("message: 'Greeting'")
  })

  it('skips Trans transform for .ts files (non-JSX)', () => {
    const code = `
import { useI18n } from '@fluenti/react'
function helper() {
  const { t } = useI18n()
  return t\`Hello\`
}
`
    const result = pipeline.transform(code, 'src/helper.ts')
    expect(result.transformed).toBe(true)
    // Scope transform ran but no Trans transform
    expect(result.code).toContain("message: 'Hello'")
  })

  it('returns transformed: false when no Fluenti patterns found', () => {
    const code = `
const x = 42
console.log(x)
`
    const result = pipeline.transform(code, 'src/util.ts')
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('transformTrans() delegates correctly', () => {
    const code = `
import { Trans } from '@fluenti/react'
export default () => <Trans>Hello <b>world</b></Trans>
`
    const result = pipeline.transformTrans(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('__id')
  })

  it('transformScope() accepts overrides', () => {
    const code = `
import { t } from '@fluenti/vue'
const msg = t\`Hello\`
`
    const vuePipeline = createTransformPipeline({ framework: 'vue' })
    const result = vuePipeline.transformScope(code, { allowTopLevelImportedT: true })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  it('transformScope() uses base options when no overrides', () => {
    const code = `
import { useI18n } from '@fluenti/react'
function App() {
  const { t } = useI18n()
  return t\`Hello\`
}
`
    const result = pipeline.transformScope(code)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })
})

describe('hasScopeTransformCandidate', () => {
  it('matches t("key") call pattern', () => {
    expect(hasScopeTransformCandidate('const x = t("hello")')).toBe(true)
  })

  it('matches tagged template with useI18n', () => {
    const code = `
const { t } = useI18n()
const msg = t\`Hello\`
`
    expect(hasScopeTransformCandidate(code)).toBe(true)
  })

  it('matches tagged template with getI18n', () => {
    const code = `
const i18n = await getI18n()
const msg = i18n.t\`Hello\`
`
    expect(hasScopeTransformCandidate(code)).toBe(true)
  })

  it('matches import { t } from @fluenti/react', () => {
    expect(hasScopeTransformCandidate("import { t } from '@fluenti/react'")).toBe(true)
  })

  it('matches import { t as translate } from @fluenti/vue', () => {
    expect(hasScopeTransformCandidate("import { t as translate } from '@fluenti/vue'")).toBe(true)
  })

  it('does not match plain code without Fluenti patterns', () => {
    expect(hasScopeTransformCandidate('const x = 42\nconsole.log(x)')).toBe(false)
  })

  it('does not match t from non-fluenti package', () => {
    expect(hasScopeTransformCandidate("import { t } from 'other-lib'")).toBe(false)
  })
})
