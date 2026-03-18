import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import type { JSX } from 'solid-js'
import {
  contractLocale,
  contractMessages,
  pluralContract,
  selectContract,
  transContract,
} from '../../core/tests/fixtures/cross-framework-contract'
import { I18nProvider, Plural, Select, Trans } from '../src'

function renderWithI18n(node: () => JSX.Element) {
  return render(() => (
    <I18nProvider locale={contractLocale} messages={contractMessages}>
      {node()}
    </I18nProvider>
  ))
}

describe('cross-framework contract parity', () => {
  it('renders explicit-id Trans content and contextual rich Trans content', () => {
    const basic = renderWithI18n(() => (
      <Trans id={transContract.basic.id}>{transContract.basic.message}</Trans>
    ))
    expect(basic.container.textContent).toBe(transContract.basic.expectedText)

    const rich = renderWithI18n(() => (
      <Trans context={transContract.rich.context} comment={transContract.rich.comment}>
        Click <a href={transContract.rich.href}>the <strong>docs</strong></a> now
      </Trans>
    ))

    expect(rich.container.textContent).toBe(transContract.rich.expectedText)
    expect(rich.container.querySelector('a')?.getAttribute('href')).toBe(transContract.rich.href)
    expect(rich.container.querySelector('strong')?.textContent).toBe('ドキュメント')
  })

  it('keeps Plural offset, zero, and adjusted # semantics aligned', () => {
    const zero = renderWithI18n(() => (
      <Plural
        value={pluralContract.zeroValue}
        context={pluralContract.context}
        comment={pluralContract.comment}
        offset={pluralContract.offset}
        zero={pluralContract.zero}
        one={pluralContract.one}
        other={pluralContract.other}
      />
    ))

    expect(zero.container.textContent).toBe(pluralContract.expectedZeroText)

    const adjusted = renderWithI18n(() => (
      <Plural
        value={pluralContract.value}
        context={pluralContract.context}
        comment={pluralContract.comment}
        offset={pluralContract.offset}
        zero={pluralContract.zero}
        one={pluralContract.one}
        other={pluralContract.other}
      />
    ))

    expect(adjusted.container.textContent).toBe(pluralContract.expectedText)
  })

  it('keeps Select options precedence, fallback, and rich content aligned', () => {
    const translated = renderWithI18n(() => (
      <Select
        value={selectContract.value}
        context={selectContract.context}
        comment={selectContract.comment}
        options={selectContract.options}
        other={selectContract.other}
      />
    ))
    expect(translated.container.textContent).toBe(selectContract.expectedText)

    const precedence = renderWithI18n(() => (
      <Select
        value={selectContract.precedence.value}
        options={selectContract.precedence.options}
        admin={selectContract.precedence.directAdmin}
        other={selectContract.precedence.other}
      />
    ))
    expect(precedence.container.textContent).toBe(selectContract.precedence.expectedText)

    const fallback = renderWithI18n(() => (
      <Select
        value={selectContract.fallback.value}
        admin={selectContract.fallback.directAdmin}
        other={selectContract.fallback.other}
      />
    ))
    expect(fallback.container.textContent).toBe(selectContract.fallback.expectedText)

    const rich = renderWithI18n(() => (
      <Select
        value={selectContract.rich.value}
        context={selectContract.rich.context}
        comment={selectContract.rich.comment}
        admin={<><strong>Admin</strong> access</>}
        other={selectContract.rich.other}
      />
    ))

    expect(rich.container.textContent).toBe(selectContract.rich.expectedText)
    expect(rich.container.querySelector('strong')?.textContent).toBe('管理者')
  })
})
