import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@solidjs/testing-library'
import { I18nProvider } from '../src'
import { __useI18n } from '../src/hooks/__useI18n'
import { resetGlobalI18nContext } from '../src/context'

const messages = {
  en: { hello: 'Hello' },
}

describe('__useI18n (internal hook)', () => {
  afterEach(() => {
    cleanup()
    resetGlobalI18nContext()
  })

  it('returns the i18n context inside a provider', () => {
    let ctx: ReturnType<typeof __useI18n> | undefined

    function Capture() {
      ctx = __useI18n()
      return <span>ok</span>
    }

    render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Capture />
      </I18nProvider>
    ))

    expect(ctx).toBeDefined()
    expect(ctx!.t).toBeTypeOf('function')
    expect(ctx!.d).toBeTypeOf('function')
    expect(ctx!.n).toBeTypeOf('function')
    expect(ctx!.locale()).toBe('en')
  })

  it('returns a context whose t() translates messages', () => {
    let result = ''

    function Capture() {
      const i18n = __useI18n()
      result = i18n.t('hello')
      return <span>{result}</span>
    }

    const { getByText } = render(() => (
      <I18nProvider locale="en" messages={messages}>
        <Capture />
      </I18nProvider>
    ))

    expect(result).toBe('Hello')
    expect(getByText('Hello')).toBeDefined()
  })

  it('throws when used outside a provider', () => {
    function Bad() {
      __useI18n()
      return <span>fail</span>
    }

    expect(() => render(() => <Bad />)).toThrow(
      'useI18n requires either createI18n()',
    )
  })
})
