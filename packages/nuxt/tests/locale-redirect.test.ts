import { describe, it, expect, vi } from 'vitest'

// Mock h3 so we can test the handler without a real Nitro/h3 environment
vi.mock('h3', () => ({
  defineEventHandler: (fn: (event: unknown) => unknown) => fn,
  sendRedirect: vi.fn((event, url, code) => ({ redirected: true, url, code })),
  getHeader: vi.fn(),
  getCookie: vi.fn(),
  getQuery: vi.fn(),
}))

import { sendRedirect, getHeader, getCookie, getQuery } from 'h3'
import handler from '../src/runtime/server/locale-redirect'

type Handler = (event: Record<string, unknown>) => unknown

function makeEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    path: '/',
    context: {
      __fluenti_config: {
        locales: ['en', 'ja', 'fr'],
        defaultLocale: 'en',
        strategy: 'prefix',
        queryParamKey: 'locale',
      },
    },
    ...overrides,
  }
}

describe('locale-redirect — query parameter detection', () => {
  it('detects locale from valid string query param', () => {
    vi.mocked(getQuery).mockReturnValue({ locale: 'ja' })
    vi.mocked(getCookie).mockReturnValue(undefined)
    vi.mocked(getHeader).mockReturnValue(null)

    ;(handler as Handler)(makeEvent())

    expect(sendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/ja',
      302,
    )
  })

  it('falls through to cookie when query param is an array (e.g. ?locale=en&locale=ja)', () => {
    // Array query param — h3 getQuery returns string[] for duplicate params
    vi.mocked(getQuery).mockReturnValue({ locale: ['en', 'ja'] })
    vi.mocked(getCookie).mockReturnValue('fr')
    vi.mocked(getHeader).mockReturnValue(null)

    ;(handler as Handler)(makeEvent())

    // Should NOT use the array value; should fall through to cookie → 'fr'
    expect(sendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/fr',
      302,
    )
  })

  it('falls through to Accept-Language when query param is array and no cookie', () => {
    vi.mocked(getQuery).mockReturnValue({ locale: ['en', 'ja'] })
    vi.mocked(getCookie).mockReturnValue(undefined)
    vi.mocked(getHeader).mockReturnValue('fr;q=0.9,en;q=0.8')

    ;(handler as Handler)(makeEvent())

    expect(sendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/fr',
      302,
    )
  })

  it('uses defaultLocale when query is array, no cookie, no matching Accept-Language', () => {
    vi.mocked(getQuery).mockReturnValue({ locale: ['xx', 'zz'] })
    vi.mocked(getCookie).mockReturnValue(undefined)
    vi.mocked(getHeader).mockReturnValue(null)

    ;(handler as Handler)(makeEvent())

    expect(sendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/en',
      302,
    )
  })
})
