import { describe, it, expect } from 'vitest'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { createMockVueI18n } from './_helpers'

describe('formatting — date and number delegation', () => {
  function createBridge() {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })
    return { bridge, fluenti }
  }

  it('d() returns fluenti-formatted date', () => {
    const { bridge, fluenti } = createBridge()
    const date = new Date('2024-06-15')
    expect(bridge.global.d(date)).toBe(fluenti.global.d(date))
  })

  it('d() with Date object', () => {
    const { bridge } = createBridge()
    const date = new Date('2023-12-25')
    const result = bridge.global.d(date)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('d() with timestamp number', () => {
    const { bridge, fluenti } = createBridge()
    const timestamp = Date.now()
    expect(bridge.global.d(timestamp)).toBe(fluenti.global.d(timestamp))
  })

  it('n() returns fluenti-formatted number', () => {
    const { bridge, fluenti } = createBridge()
    expect(bridge.global.n(42)).toBe(fluenti.global.n(42))
  })

  it('n() with decimals', () => {
    const { bridge, fluenti } = createBridge()
    expect(bridge.global.n(3.14159)).toBe(fluenti.global.n(3.14159))
  })

  it('n() with large numbers', () => {
    const { bridge, fluenti } = createBridge()
    expect(bridge.global.n(1_000_000)).toBe(fluenti.global.n(1_000_000))
  })

  it('format() with ICU template', () => {
    const { bridge } = createBridge()
    const result = bridge.global.format('Hello {name}!', { name: 'World' })
    expect(result).toBe('Hello World!')
  })

  it('format() with multiple values', () => {
    const { bridge } = createBridge()
    const result = bridge.global.format('{greeting} {name}, you have {count} messages', {
      greeting: 'Hi',
      name: 'Alice',
      count: 5,
    })
    expect(result).toBe('Hi Alice, you have 5 messages')
  })

  it('format() with no values (static string)', () => {
    const { bridge } = createBridge()
    const result = bridge.global.format('No interpolation here')
    expect(result).toBe('No interpolation here')
  })
})
