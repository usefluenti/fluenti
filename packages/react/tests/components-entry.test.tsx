import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Trans, Plural, Select, DateTime, NumberFormat } from '../src/components-entry'
import { I18nProvider } from '../src'
import { interpolate } from '../../core/src/interpolate'
import * as mainExports from '../src'

describe('components-entry subpath', () => {
  afterEach(cleanup)

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider locale="en" messages={{ en: {} }} interpolate={interpolate}>
      {children}
    </I18nProvider>
  )

  it('exports all components as defined values (not undefined)', () => {
    // memo() wraps components as objects with a $$typeof Symbol, not plain functions
    expect(Trans).toBeDefined()
    expect(Plural).toBeDefined()
    expect(Select).toBeDefined()
    expect(DateTime).toBeDefined()
    expect(NumberFormat).toBeDefined()

    // Each should be a valid React component (memo returns an object with a type property)
    expect((Trans as any).$$typeof).toBeDefined()
    expect((Plural as any).$$typeof).toBeDefined()
    expect((Select as any).$$typeof).toBeDefined()
    expect((DateTime as any).$$typeof).toBeDefined()
    expect((NumberFormat as any).$$typeof).toBeDefined()
  })

  it('main entry exports Trans but not other component values', () => {
    // Trans is compile-time (no parser dep) — exported from main entry
    expect((mainExports as Record<string, unknown>).Trans).toBeDefined()
    // Plural/Select/DateTime/NumberFormat require parser — only in /components
    expect((mainExports as Record<string, unknown>).Plural).toBeUndefined()
    expect((mainExports as Record<string, unknown>).Select).toBeUndefined()
    expect((mainExports as Record<string, unknown>).DateTime).toBeUndefined()
    expect((mainExports as Record<string, unknown>).NumberFormat).toBeUndefined()
  })

  it('renders Trans component', () => {
    render(
      <Trans>Hello World</Trans>,
      { wrapper },
    )
    expect(screen.getByText('Hello World')).toBeDefined()
  })

  it('renders Plural component', () => {
    render(
      <Plural value={1} one="# item" other="# items" />,
      { wrapper },
    )
    expect(screen.getByText('1 item')).toBeDefined()
  })

  it('renders Select component', () => {
    render(
      <Select value="male" male="He" female="She" other="They" />,
      { wrapper },
    )
    expect(screen.getByText('He')).toBeDefined()
  })

  it('renders DateTime component', () => {
    render(
      <DateTime value={new Date(2024, 0, 15)} />,
      { wrapper },
    )
    // The formatted date should contain the year
    const el = screen.getByText((content) => content.includes('2024'))
    expect(el).toBeDefined()
  })

  it('renders NumberFormat component', () => {
    render(
      <NumberFormat value={1234} />,
      { wrapper },
    )
    // The formatted number should contain digits
    const el = screen.getByText((content) => content.includes('1') && content.includes('234'))
    expect(el).toBeDefined()
  })
})
