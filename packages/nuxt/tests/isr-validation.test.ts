import { describe, it, expect } from 'vitest'
import { validateISRConfig } from '../src/isr-validation'

describe('validateISRConfig', () => {
  it('returns no warnings when ISR is disabled', () => {
    const warnings = validateISRConfig(undefined, 'prefix', ['path', 'cookie'])
    expect(warnings).toHaveLength(0)
  })

  it('returns no warnings when ISR is disabled via enabled: false', () => {
    const warnings = validateISRConfig(
      { enabled: false },
      'prefix',
      ['path', 'cookie'],
    )
    expect(warnings).toHaveLength(0)
  })

  it('returns no warnings when ISR uses path-only detection', () => {
    const warnings = validateISRConfig(
      { enabled: true },
      'prefix',
      ['path'],
    )
    expect(warnings).toHaveLength(0)
  })

  it('warns when ISR is enabled with cookie detector', () => {
    const warnings = validateISRConfig(
      { enabled: true },
      'prefix',
      ['path', 'cookie'],
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.level).toBe('warn')
    expect(warnings[0]!.message).toContain('cookie')
    expect(warnings[0]!.message).toContain('ISR')
  })

  it('warns when ISR is enabled with header detector', () => {
    const warnings = validateISRConfig(
      { enabled: true },
      'prefix',
      ['path', 'header'],
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.message).toContain('header')
  })

  it('warns when ISR is enabled with both cookie and header detectors', () => {
    const warnings = validateISRConfig(
      { enabled: true },
      'prefix',
      ['path', 'cookie', 'header'],
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.message).toContain('cookie, header')
  })

  it('warns when ISR is enabled with no_prefix strategy', () => {
    const warnings = validateISRConfig(
      { enabled: true },
      'no_prefix',
      ['path'],
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.level).toBe('warn')
    expect(warnings[0]!.message).toContain('no_prefix')
  })

  it('returns multiple warnings for ISR + no_prefix + cookie', () => {
    const warnings = validateISRConfig(
      { enabled: true },
      'no_prefix',
      ['path', 'cookie'],
    )
    expect(warnings).toHaveLength(2)
    expect(warnings.some((w) => w.message.includes('cookie'))).toBe(true)
    expect(warnings.some((w) => w.message.includes('no_prefix'))).toBe(true)
  })

  it('does not warn about query detector', () => {
    const warnings = validateISRConfig(
      { enabled: true },
      'prefix',
      ['path', 'query'],
    )
    expect(warnings).toHaveLength(0)
  })
})
