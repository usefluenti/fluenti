import { describe, it, expect } from 'vitest'
import { transformSolidJsx } from '../src/solid-jsx-transform'

describe('transformSolidJsx', () => {
  it('returns code unchanged with changed: false for plain code', () => {
    const code = "const x = 1\nconsole.log('hello')"
    const result = transformSolidJsx(code)
    expect(result.code).toBe(code)
    expect(result.changed).toBe(false)
  })

  it('returns JSX input unchanged with changed: false', () => {
    const code = [
      "import { Trans } from '@fluenti/solid'",
      'function App() {',
      '  return <Trans>Hello world</Trans>',
      '}',
    ].join('\n')
    const result = transformSolidJsx(code)
    expect(result.code).toBe(code)
    expect(result.changed).toBe(false)
  })

  it('returns empty string unchanged with changed: false', () => {
    const result = transformSolidJsx('')
    expect(result.code).toBe('')
    expect(result.changed).toBe(false)
  })
})
