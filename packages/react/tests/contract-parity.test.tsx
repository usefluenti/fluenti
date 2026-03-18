import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  contractLocale,
  contractMessageIds,
  contractMessages,
  pluralContract,
  selectContract,
  transContract,
} from '../../core/tests/fixtures/cross-framework-contract'
import { I18nProvider, Plural, Select, Trans } from '../src'

afterEach(cleanup)

function renderWithI18n(node: ReactNode) {
  return render(
    <I18nProvider locale={contractLocale} messages={contractMessages}>
      {node}
    </I18nProvider>,
  )
}

describe('cross-framework contract parity', () => {
  it('renders explicit-id Trans content and contextual rich Trans content', () => {
    const basic = renderWithI18n(
      <Trans id={transContract.basic.id}>{transContract.basic.message}</Trans>,
    )
    expect(basic.container.textContent).toBe(transContract.basic.expectedText)

    cleanup()

    const runtime = renderWithI18n(
      <Trans context={transContract.rich.context} comment={transContract.rich.comment}>
        Click <a href={transContract.rich.href}>the <strong>docs</strong></a> now
      </Trans>,
    )
    expect(runtime.container.textContent).toBe(transContract.rich.expectedText)
    expect(runtime.container.querySelector('a')?.getAttribute('href')).toBe(transContract.rich.href)
    expect(runtime.container.querySelector('strong')?.textContent).toBe('ドキュメント')

    const runtimeHtml = runtime.container.innerHTML
    cleanup()

    const precomputed = renderWithI18n(
      <Trans
        id={contractMessageIds.transRich}
        context={transContract.rich.context}
        comment={transContract.rich.comment}
        __message={transContract.rich.message}
        __components={[
          <a key="0" href={transContract.rich.href} />,
          <strong key="1" />,
        ]}
      >
        {null}
      </Trans>,
    )

    expect(precomputed.container.textContent).toBe(transContract.rich.expectedText)
    expect(precomputed.container.innerHTML).toBe(runtimeHtml)
  })

  it('keeps Plural offset, zero, and adjusted # semantics aligned', () => {
    const zero = renderWithI18n(
      <Plural
        value={pluralContract.zeroValue}
        context={pluralContract.context}
        comment={pluralContract.comment}
        offset={pluralContract.offset}
        zero={pluralContract.zero}
        one={pluralContract.one}
        other={pluralContract.other}
      />,
    )

    expect(zero.container.textContent).toBe(pluralContract.expectedZeroText)

    cleanup()

    const adjusted = renderWithI18n(
      <Plural
        value={pluralContract.value}
        context={pluralContract.context}
        comment={pluralContract.comment}
        offset={pluralContract.offset}
        zero={pluralContract.zero}
        one={pluralContract.one}
        other={pluralContract.other}
      />,
    )

    expect(adjusted.container.textContent).toBe(pluralContract.expectedText)
  })

  it('keeps Select options precedence, fallback, and rich content aligned', () => {
    const translated = renderWithI18n(
      <Select
        value={selectContract.value}
        context={selectContract.context}
        comment={selectContract.comment}
        options={selectContract.options}
        other={selectContract.other}
      />,
    )
    expect(translated.container.textContent).toBe(selectContract.expectedText)

    cleanup()

    const precedence = renderWithI18n(
      <Select
        value={selectContract.precedence.value}
        options={selectContract.precedence.options}
        admin={selectContract.precedence.directAdmin}
        other={selectContract.precedence.other}
      />,
    )
    expect(precedence.container.textContent).toBe(selectContract.precedence.expectedText)

    cleanup()

    const fallback = renderWithI18n(
      <Select
        value={selectContract.fallback.value}
        admin={selectContract.fallback.directAdmin}
        other={selectContract.fallback.other}
      />,
    )
    expect(fallback.container.textContent).toBe(selectContract.fallback.expectedText)

    cleanup()

    const rich = renderWithI18n(
      <Select
        value={selectContract.rich.value}
        context={selectContract.rich.context}
        comment={selectContract.rich.comment}
        admin={<><strong>Admin</strong> access</>}
        other={selectContract.rich.other}
      />,
    )
    expect(rich.container.textContent).toBe(selectContract.rich.expectedText)
    expect(rich.container.querySelector('strong')?.textContent).toBe('管理者')
  })
})
