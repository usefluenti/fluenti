import { describe, it, expect } from 'vitest'
import { formatProgressBar, colorizePercent, formatStatsRow } from '../src/stats-format'

describe('formatProgressBar', () => {
  it('returns all filled blocks at 100%', () => {
    expect(formatProgressBar(100, 10)).toBe('██████████')
  })

  it('returns all empty blocks at 0%', () => {
    expect(formatProgressBar(0, 10)).toBe('░░░░░░░░░░')
  })

  it('returns half filled at 50%', () => {
    expect(formatProgressBar(50, 10)).toBe('█████░░░░░')
  })

  it('uses default width of 20', () => {
    const bar = formatProgressBar(100)
    expect(bar.length).toBe(20)
    expect(bar).toBe('█'.repeat(20))
  })

  it('clamps values above 100', () => {
    expect(formatProgressBar(150, 10)).toBe('██████████')
  })

  it('clamps values below 0', () => {
    expect(formatProgressBar(-10, 10)).toBe('░░░░░░░░░░')
  })

  it('rounds to nearest block', () => {
    // 25% of 10 = 2.5 → rounds to 3
    expect(formatProgressBar(25, 10)).toBe('███░░░░░░░')
  })
})

describe('colorizePercent', () => {
  it('returns green ANSI for >= 90%', () => {
    const result = colorizePercent(95)
    expect(result).toContain('\x1b[32m')
    expect(result).toContain('95.0%')
    expect(result).toContain('\x1b[0m')
  })

  it('returns green ANSI at exactly 90%', () => {
    const result = colorizePercent(90)
    expect(result).toContain('\x1b[32m')
  })

  it('returns yellow ANSI for >= 70% and < 90%', () => {
    const result = colorizePercent(75)
    expect(result).toContain('\x1b[33m')
    expect(result).toContain('75.0%')
  })

  it('returns yellow ANSI at exactly 70%', () => {
    const result = colorizePercent(70)
    expect(result).toContain('\x1b[33m')
  })

  it('returns red ANSI for < 70%', () => {
    const result = colorizePercent(50)
    expect(result).toContain('\x1b[31m')
    expect(result).toContain('50.0%')
  })

  it('returns red ANSI at 0%', () => {
    const result = colorizePercent(0)
    expect(result).toContain('\x1b[31m')
    expect(result).toContain('0.0%')
  })
})

describe('formatStatsRow', () => {
  it('formats a row with progress bar and colorized percent', () => {
    const row = formatStatsRow('en', 10, 10)
    expect(row).toContain('en')
    expect(row).toContain('10')
    expect(row).toContain('█')
    expect(row).toContain('\x1b[32m') // green for 100%
  })

  it('shows dash for zero-total locale', () => {
    const row = formatStatsRow('de', 0, 0)
    expect(row).toContain('—')
  })
})
