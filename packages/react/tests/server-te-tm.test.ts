import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerI18n } from '../src/server'

// Mock React.cache — simulates per-request scoping
vi.mock('react', () => ({
  cache: (fn: () => unknown) => {
    let value: unknown
    return () => {
      if (value === undefined) value = fn()
      return value
    }
  },
}))

const enMessages = {
  greeting: 'Hello',
  farewell: 'Goodbye',
  dynamic: (values?: Record<string, unknown>) => `Hello ${values?.name}`,
}
const deMessages = {
  greeting: 'Hallo',
}

describe('ServerI18n te/tm', () => {
  let loadMessages: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    loadMessages = vi.fn(async (locale: string) => {
      if (locale === 'en') return enMessages
      if (locale === 'de') return deMessages
      return {}
    })
  })

  describe('te', () => {
    it('returns true for an existing key', async () => {
      const { setLocale, te } = createServerI18n({ loadMessages })
      setLocale('en')

      expect(await te('greeting')).toBe(true)
    })

    it('returns false for a missing key', async () => {
      const { setLocale, te } = createServerI18n({ loadMessages })
      setLocale('en')

      expect(await te('nonexistent')).toBe(false)
    })

    it('checks the specified locale instead of current', async () => {
      const { setLocale, te } = createServerI18n({ loadMessages })
      setLocale('en')

      // 'farewell' exists in en but not in de
      expect(await te('farewell', 'de')).toBe(false)
      expect(await te('farewell', 'en')).toBe(true)
    })

    it('checks current locale by default', async () => {
      const { setLocale, te } = createServerI18n({ loadMessages })
      setLocale('de')

      // 'greeting' exists in de
      expect(await te('greeting')).toBe(true)
      // 'farewell' does not exist in de
      expect(await te('farewell')).toBe(false)
    })
  })

  describe('tm', () => {
    it('returns the compiled message for an existing key', async () => {
      const { setLocale, tm } = createServerI18n({ loadMessages })
      setLocale('en')

      expect(await tm('greeting')).toBe('Hello')
    })

    it('returns undefined for a missing key', async () => {
      const { setLocale, tm } = createServerI18n({ loadMessages })
      setLocale('en')

      expect(await tm('nonexistent')).toBeUndefined()
    })

    it('returns a function for dynamic messages', async () => {
      const { setLocale, tm } = createServerI18n({ loadMessages })
      setLocale('en')

      const msg = await tm('dynamic')
      expect(typeof msg).toBe('function')
      if (typeof msg === 'function') {
        expect(msg({ name: 'World' })).toBe('Hello World')
      }
    })

    it('checks the specified locale instead of current', async () => {
      const { setLocale, tm } = createServerI18n({ loadMessages })
      setLocale('en')

      expect(await tm('greeting', 'de')).toBe('Hallo')
      expect(await tm('farewell', 'de')).toBeUndefined()
    })
  })
})
