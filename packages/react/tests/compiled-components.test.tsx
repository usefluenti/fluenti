import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { interpolate } from '../../core/src/runtime'
import { I18nProvider } from '../src'
import {
  __FluentiCompiledTrans,
  __FluentiCompiledRichTrans,
  __FluentiCompiledPlural,
  __FluentiCompiledSelect,
  __FluentiCompiledRichPlural,
  __FluentiCompiledRichSelect,
} from '../src/components-entry'

describe('compiled component fast paths', () => {
  afterEach(cleanup)

  it('renders the compiled plain-text Trans path', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <__FluentiCompiledTrans message="Welcome back" />
      </I18nProvider>,
    )

    expect(screen.getByText('Welcome back')).toBeDefined()
  })

  it('renders the compiled rich Trans path', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <__FluentiCompiledRichTrans
          message="Click <0>docs</0> now"
          components={[<strong key="docs" />]}
        />
      </I18nProvider>,
    )

    expect(screen.getByText('docs').tagName).toBe('STRONG')
    expect(screen.getByText(/now/)).toBeDefined()
  })

  it('renders the compiled plain-text plural path', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledPlural
          value={3}
          message="{count, plural, one {# item} other {# items}}"
        />
      </I18nProvider>,
    )

    expect(screen.getByText('3 items')).toBeDefined()
  })

  it('renders the compiled plain-text select path', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledSelect
          value="admin"
          message="{value, select, admin {Admin} other {Guest}}"
          valueMap={{ admin: 'admin' }}
        />
      </I18nProvider>,
    )

    expect(screen.getByText('Admin')).toBeDefined()
  })

  it('renders the compiled rich plural path', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledRichPlural
          value={3}
          message="{count, plural, one {<0>#</0> item} other {<1>#</1> items}}"
          components={[<strong key="one" />, <strong key="other" />]}
        />
      </I18nProvider>,
    )

    expect(screen.getByText('3')).toBeDefined()
    expect(screen.getByText('3').tagName).toBe('STRONG')
    expect(screen.getByText('items')).toBeDefined()
  })

  it('renders the compiled rich select path', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
        <__FluentiCompiledRichSelect
          value="admin"
          message="{value, select, admin {<0>Admin</0>} other {<1>Guest</1>}}"
          valueMap={{ admin: 'admin' }}
          components={[<strong key="admin" />, <em key="guest" />]}
        />
      </I18nProvider>,
    )

    expect(screen.getByText('Admin').tagName).toBe('STRONG')
  })
})
