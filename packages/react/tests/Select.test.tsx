import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Select, I18nProvider } from '../src'

describe('Select', () => {
  afterEach(cleanup)
  it('selects correct case based on value', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Select
          value="male"
          male="He liked your post"
          female="She liked your post"
          other="They liked your post"
        />
      </I18nProvider>,
    )
    expect(screen.getByText('He liked your post')).toBeDefined()
  })

  it('falls back to other for missing cases', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Select
          value="nonbinary"
          male="He"
          female="She"
          other="They"
        />
      </I18nProvider>,
    )
    expect(screen.getByText('They')).toBeDefined()
  })

  it('handles rich text in cases', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Select
          value="admin"
          admin={<b>Admin access</b>}
          other="Regular access"
        />
      </I18nProvider>,
    )
    const bold = screen.getByText('Admin access')
    expect(bold.tagName).toBe('B')
  })
})
