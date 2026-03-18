import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock React.cache — simulates request-scoped caching
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: (fn: () => unknown) => {
      let value: unknown
      return () => {
        if (value === undefined) value = fn()
        return value
      }
    },
  }
})

import { createServerI18n } from '../src/server'
import { hashMessage } from '../src/components/trans-core'

const enMessages: Record<string, string | ((v: Record<string, unknown>) => string)> = {
  greeting: 'Hello',
  farewell: 'Goodbye',
}
const jaMessages: Record<string, string | ((v: Record<string, unknown>) => string)> = {
  greeting: 'こんにちは',
  farewell: 'さようなら',
}

function createTestI18n() {
  return createServerI18n({
    loadMessages: async (locale: string) => {
      if (locale === 'en') return enMessages
      if (locale === 'ja') return jaMessages
      throw new Error(`Unknown locale: ${locale}`)
    },
    fallbackLocale: 'en',
  })
}

describe('Server Trans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders simple text (source fallback)', async () => {
    const { setLocale, Trans } = createTestI18n()
    setLocale('en')
    const element = await Trans({ children: 'Hello World' })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('Hello World')
  })

  it('renders translated text when hash matches', async () => {
    const sourceText = 'greeting'
    const hash = hashMessage(sourceText)
    const messagesWithHash = { ...enMessages, [hash]: 'Welcome!' }

    const { setLocale, Trans } = createServerI18n({
      loadMessages: async () => messagesWithHash,
    })
    setLocale('en')
    const element = await Trans({ children: sourceText })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('Welcome!')
  })

  it('preserves nested components', async () => {
    const { setLocale, Trans } = createTestI18n()
    setLocale('en')

    const children = [
      'Read the ',
      createElement('a', { href: '/docs' }, 'documentation'),
      ' for more info.',
    ]

    const element = await Trans({ children })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('<a href="/docs">documentation</a>')
    expect(html).toContain('Read the ')
    expect(html).toContain(' for more info.')
  })

  it('supports custom id prop', async () => {
    const { setLocale, Trans } = createServerI18n({
      loadMessages: async () => ({ 'custom-id': 'Custom translation' }),
    })
    setLocale('en')

    const element = await Trans({ children: 'Original text', id: 'custom-id' })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('Custom translation')
  })

  it('supports render prop', async () => {
    const { setLocale, Trans } = createTestI18n()
    setLocale('en')

    const element = await Trans({
      children: 'Hello',
      render: (content) => createElement('div', { className: 'wrapper' }, content),
    })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('<div class="wrapper">Hello</div>')
  })
})

describe('Server Plural', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects correct plural form', async () => {
    const { setLocale, Plural } = createTestI18n()
    setLocale('en')

    const element = await Plural({ value: 1, one: '# item', other: '# items' })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('1 item')
  })

  it('uses other for plural values', async () => {
    const { setLocale, Plural } = createTestI18n()
    setLocale('en')

    const element = await Plural({ value: 5, one: '# item', other: '# items' })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('5 items')
  })

  it('handles zero form', async () => {
    const { setLocale, Plural } = createTestI18n()
    setLocale('en')

    const element = await Plural({ value: 0, zero: 'No items', one: '# item', other: '# items' })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('No items')
  })

  it('supports offset', async () => {
    const { setLocale, Plural } = createTestI18n()
    setLocale('en')

    const element = await Plural({ value: 2, offset: 1, one: '# item left', other: '# items left' })
    const html = renderToStaticMarkup(element)
    // offset=1 means adjustedValue=1, so "one" form is selected and # uses the adjusted count
    expect(html).toBe('1 item left')
  })

  it('uses catalog translation for synthetic ICU plural messages', async () => {
    const { setLocale, Plural } = createServerI18n({
      loadMessages: async () => ({
        '{count, plural, =0 {No apples} one {# apple} other {# apples}}':
          '{count, plural, =0 {没有苹果} one {# 个苹果} other {# 个苹果}}',
      }),
    })
    setLocale('en')

    const element = await Plural({ value: 5, zero: 'No apples', one: '# apple', other: '# apples' })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('5 个苹果')
  })
})

describe('Server Select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects the translated string case via synthetic ICU select messages', async () => {
    const { setLocale, Select } = createServerI18n({
      loadMessages: async () => ({
        '{value, select, male {He liked your post} female {She liked your post} other {They liked your post}}':
          '{value, select, male {彼があなたの投稿を気に入りました} female {彼女があなたの投稿を気に入りました} other {その人があなたの投稿を気に入りました}}',
      }),
    })
    setLocale('en')

    const element = await Select({
      value: 'male',
      male: 'He liked your post',
      female: 'She liked your post',
      other: 'They liked your post',
    })
    const html = renderToStaticMarkup(element)
    expect(html).toBe('彼があなたの投稿を気に入りました')
  })
})

describe('Server DateTime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats a date', async () => {
    const { setLocale, DateTime } = createTestI18n()
    setLocale('en')

    const element = await DateTime({ value: new Date(2024, 0, 15) })
    const html = renderToStaticMarkup(element)
    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain('2024')
  })
})

describe('Server NumberFormat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats a number', async () => {
    const { setLocale, NumberFormat } = createTestI18n()
    setLocale('en')

    const element = await NumberFormat({ value: 1234.56 })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('1')
    expect(html).toContain('234')
  })
})
