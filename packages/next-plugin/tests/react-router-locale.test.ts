import { describe, it, expect } from 'vitest'
import {
  AVAILABLE_LOCALES,
  getCookieLocale,
  getQueryLocale,
  serializeLocaleCookie,
} from '../../../examples/react-router/src/locale'

describe('react-router locale helpers', () => {
  it('accepts supported query locales', () => {
    expect(getQueryLocale('?lang=ja', AVAILABLE_LOCALES)).toBe('ja')
  })

  it('ignores unsupported query locales', () => {
    expect(getQueryLocale('?lang=fr', AVAILABLE_LOCALES)).toBeNull()
  })

  it('accepts supported cookie locales', () => {
    expect(getCookieLocale('locale=zh-CN', AVAILABLE_LOCALES)).toBe('zh-CN')
  })

  it('ignores unsupported cookie locales', () => {
    expect(getCookieLocale('locale=fr', AVAILABLE_LOCALES)).toBeNull()
  })

  it('serializes locale cookies with encoding', () => {
    expect(serializeLocaleCookie('zh-CN')).toBe('locale=zh-CN;path=/;max-age=31536000')
  })
})
