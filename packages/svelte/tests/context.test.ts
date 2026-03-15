import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'

// We'll test context via wrapper components since setContext/getContext
// require component initialization context
import ContextTestWrapper from './fixtures/ContextTestWrapper.svelte'
import ContextErrorTest from './fixtures/ContextErrorTest.svelte'
import LocaleSwitchTest from './fixtures/LocaleSwitchTest.svelte'
import FormattingTest from './fixtures/FormattingTest.svelte'

const messages = {
  en: {
    hello: 'Hello',
    greeting: 'Hi {name}',
    goodbye: 'Goodbye',
  },
  fr: {
    hello: 'Bonjour',
    greeting: 'Salut {name}',
    goodbye: 'Au revoir',
  },
}

describe('setI18nContext / getI18n', () => {
  it('provides locale and t() to child components', () => {
    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'en',
        messages,
      },
    })

    expect(container.textContent).toContain('Hello')
  })

  it('translates with interpolation values', () => {
    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'en',
        messages,
        messageId: 'greeting',
        values: { name: 'World' },
      },
    })

    expect(container.textContent).toContain('Hi World')
  })

  it('uses fallback locale when message missing', () => {
    const partialMessages = {
      en: { hello: 'Hello', goodbye: 'Goodbye' },
      fr: { hello: 'Bonjour' },  // no 'goodbye' in fr
    }

    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'fr',
        fallbackLocale: 'en',
        messages: partialMessages,
        messageId: 'goodbye',
      },
    })

    expect(container.textContent).toContain('Goodbye')
  })

  it('returns message id when no translation found', () => {
    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'en',
        messages: { en: {} },
        messageId: 'nonexistent',
      },
    })

    expect(container.textContent).toContain('nonexistent')
  })

  it('handles MessageDescriptor with fallback message', () => {
    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'en',
        messages: { en: {} },
        descriptor: { id: 'missing', message: 'Fallback {name}' },
        values: { name: 'Test' },
      },
    })

    expect(container.textContent).toContain('Fallback Test')
  })

  it('supports compiled message functions', () => {
    const msgs = {
      en: {
        compiled: (vals?: Record<string, unknown>) =>
          `Count: ${vals?.['count'] ?? 0}`,
      },
    }

    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'en',
        messages: msgs,
        messageId: 'compiled',
        values: { count: 42 },
      },
    })

    expect(container.textContent).toContain('Count: 42')
  })

  it('exposes locale as reactive value', () => {
    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'en',
        messages,
        showLocale: true,
      },
    })

    expect(container.textContent).toContain('locale:en')
  })

  it('getLocales returns available locales', () => {
    const { container } = render(ContextTestWrapper, {
      props: {
        locale: 'en',
        messages,
        showLocales: true,
      },
    })

    expect(container.textContent).toContain('en')
    expect(container.textContent).toContain('fr')
  })
})

describe('setLocale', () => {
  it('switches locale for loaded messages', async () => {
    const { container } = render(LocaleSwitchTest, {
      props: {
        locale: 'en',
        messages,
      },
    })

    expect(container.textContent).toContain('Hello')

    // Click the button to switch to fr
    const button = container.querySelector('button')!
    button.click()
    await tick()

    expect(container.textContent).toContain('Bonjour')
  })

  it('loads messages asynchronously with loadMessages callback', async () => {
    const loadMessages = vi.fn().mockResolvedValue({
      hello: 'Hola',
    })

    const { container } = render(LocaleSwitchTest, {
      props: {
        locale: 'en',
        messages: { en: { hello: 'Hello' } },
        loadMessages,
        targetLocale: 'es',
      },
    })

    expect(container.textContent).toContain('Hello')

    const button = container.querySelector('button')!
    button.click()
    await tick()
    // Wait for async load
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Hola')
    })

    expect(loadMessages).toHaveBeenCalledWith('es')
  })

  it('sets isLoading during async load', async () => {
    let resolveLoad: (msgs: Record<string, string>) => void
    const loadMessages = vi.fn().mockImplementation(() =>
      new Promise((resolve) => { resolveLoad = resolve })
    )

    const { container } = render(LocaleSwitchTest, {
      props: {
        locale: 'en',
        messages: { en: { hello: 'Hello' } },
        loadMessages,
        targetLocale: 'es',
        showLoading: true,
      },
    })

    expect(container.textContent).toContain('loading:false')

    const button = container.querySelector('button')!
    button.click()
    await tick()

    expect(container.textContent).toContain('loading:true')

    resolveLoad!({ hello: 'Hola' })
    await vi.waitFor(() => {
      expect(container.textContent).toContain('loading:false')
    })
  })
})

describe('formatting', () => {
  it('d() formats dates', () => {
    const { container } = render(FormattingTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        testType: 'date',
      },
    })

    // Should produce some date string
    expect(container.textContent).toBeTruthy()
    expect(container.textContent!.length).toBeGreaterThan(0)
  })

  it('n() formats numbers', () => {
    const { container } = render(FormattingTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        testType: 'number',
      },
    })

    expect(container.textContent).toContain('1,234')
  })

  it('format() interpolates message strings', () => {
    const { container } = render(FormattingTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        testType: 'format',
      },
    })

    expect(container.textContent).toContain('Hello Alice')
  })
})
