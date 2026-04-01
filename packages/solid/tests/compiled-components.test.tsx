import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import { interpolate } from '@fluenti/core/runtime'
import { I18nProvider } from '../src'
import {
  __FluentiCompiledTrans,
  __FluentiCompiledPlural,
  __FluentiCompiledSelect,
  __FluentiCompiledRichPlural,
  __FluentiCompiledRichSelect,
} from '../src/components-entry'

describe('compiled component fast paths', () => {
  it('renders the compiled plain-text plural path', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledPlural
          value={3}
          message="{count, plural, one {# item} other {# items}}"
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('3 items')
  })

  it('renders the compiled Trans path', () => {
    const { container } = render(() => (
      <I18nProvider
        locale="ja"
        messages={{
          ja: {
            greeting: 'こんにちは、<0>世界</0>！',
          },
        }}
      >
        <__FluentiCompiledTrans
          id="greeting"
          message="Hello, <0>world</0>!"
          components={[<strong />]}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('こんにちは、世界！')
    expect(container.querySelector('strong')?.textContent).toBe('世界')
  })

  it('renders the compiled plain-text select path', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledSelect
          value="admin"
          message="{value, select, admin {Admin} other {Guest}}"
          valueMap={{ admin: 'admin' }}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Admin')
  })

  it('renders the compiled rich plural path', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledRichPlural
          value={3}
          message="{count, plural, one {<0>#</0> item} other {<1>#</1> items}}"
          components={[<strong />, <strong />]}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('3 items')
    expect(container.querySelector('strong')?.textContent).toBe('3')
  })

  it('renders the compiled rich select path', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledRichSelect
          value="admin"
          message="{value, select, admin {<0>Admin</0>} other {<1>Guest</1>}}"
          valueMap={{ admin: 'admin' }}
          components={[<strong />, <em />]}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Admin')
    expect(container.querySelector('strong')?.textContent).toBe('Admin')
  })
})
