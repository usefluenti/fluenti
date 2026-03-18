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

  it('supports the options prop and uses catalog translation for string forms', () => {
    render(
      <I18nProvider
        locale="ja"
        messages={{
          ja: {
            '{value, select, male {He liked your post} female {She liked your post} other {They liked your post}}':
              '{value, select, male {彼があなたの投稿を気に入りました} female {彼女があなたの投稿を気に入りました} other {その人があなたの投稿を気に入りました}}',
          },
        }}
      >
        <Select
          value="male"
          options={{
            male: 'He liked your post',
            female: 'She liked your post',
          }}
          other="They liked your post"
        />
      </I18nProvider>,
    )

    expect(screen.getByText('彼があなたの投稿を気に入りました')).toBeDefined()
  })

  it('reconstructs rich translated select content', () => {
    render(
      <I18nProvider
        locale="ja"
        messages={{
          ja: {
            '{value, select, admin {<0>Admin</0> access} other {Regular access}}':
              '{value, select, admin {アクセス権: <0>管理者</0>} other {通常アクセス}}',
          },
        }}
      >
        <Select
          value="admin"
          admin={<><b>Admin</b> access</>}
          other="Regular access"
        />
      </I18nProvider>,
    )

    const bold = screen.getByText('管理者')
    expect(bold.tagName).toBe('B')
    expect(screen.getAllByText((_, node) => node?.textContent === 'アクセス権: 管理者').length).toBeGreaterThan(0)
  })
})
