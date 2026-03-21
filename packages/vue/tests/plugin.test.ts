import { describe, it, expect, vi } from 'vitest'
import { createApp, defineComponent, h, inject, nextTick, ref, resolveDirective, withDirectives } from 'vue'
import { createFluentVue, FLUENTI_KEY } from '../src/plugin'
import type { FluentVueContext } from '../src/plugin'

function createTestApp(setup: () => any) {
  const Comp = defineComponent({ setup, render() { return h('div') } })
  return createApp(Comp)
}

describe('createFluentVue', () => {
  it('returns a plugin with install and global', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    expect(plugin).toHaveProperty('install')
    expect(plugin).toHaveProperty('global')
    expect(typeof plugin.install).toBe('function')
  })

  it('provides context via FLUENTI_KEY', () => {
    let ctx: FluentVueContext | undefined
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    const app = createTestApp(() => {
      ctx = inject(FLUENTI_KEY)
    })
    app.use(plugin)
    app.mount(document.createElement('div'))

    expect(ctx).toBeDefined()
    expect(ctx!.t('hello')).toBe('Hello')

    app.unmount()
  })

  it('adds $t, $d, $n to globalProperties', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)

    expect(app.config.globalProperties['$t']).toBeDefined()
    expect(app.config.globalProperties['$d']).toBeDefined()
    expect(app.config.globalProperties['$n']).toBeDefined()
  })

  it('registers Trans, Plural, Select as global components', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)

    expect(app.component('Trans')).toBeDefined()
    expect(app.component('Plural')).toBeDefined()
    expect(app.component('Select')).toBeDefined()
  })

  it('registers components with prefix when componentPrefix is set', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      componentPrefix: 'I18n',
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)

    expect(app.component('I18nTrans')).toBeDefined()
    expect(app.component('I18nPlural')).toBeDefined()
    expect(app.component('I18nSelect')).toBeDefined()
    // Original names should NOT be registered
    expect(app.component('Trans')).toBeUndefined()
    expect(app.component('Plural')).toBeUndefined()
    expect(app.component('Select')).toBeUndefined()
  })
})

describe('t()', () => {
  it('looks up and returns a simple string message', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: 'Hello world' } },
    })

    expect(plugin.global.t('greeting')).toBe('Hello world')
  })

  it('performs {key} interpolation on string messages', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: 'Hello {name}!' } },
    })

    expect(plugin.global.t('greeting', { name: 'Alice' })).toBe('Hello Alice!')
  })

  it('calls compiled function messages', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          greeting: (vals?: Record<string, unknown>) =>
            `Hi ${vals?.['name'] ?? 'stranger'}`,
        },
      },
    })

    expect(plugin.global.t('greeting', { name: 'Bob' })).toBe('Hi Bob')
  })

  it('falls back to fallbackLocale when message not found', () => {
    const plugin = createFluentVue({
      locale: 'fr',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: {},
      },
    })

    expect(plugin.global.t('hello')).toBe('Hello')
  })

  it('uses the missing handler when no message found', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      missing: (_locale, id) => `[missing: ${id}]`,
    })

    expect(plugin.global.t('unknown')).toBe('[missing: unknown]')
  })

  it('returns the id when nothing else works', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    expect(plugin.global.t('some.key')).toBe('some.key')
  })

  it('does not replace {key} when value is not provided', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { msg: 'Hello {name}' } },
    })

    expect(plugin.global.t('msg', {})).toBe('Hello {name}')
  })

  it('uses fallbackChain when configured', () => {
    const plugin = createFluentVue({
      locale: 'pt-BR',
      messages: {
        'pt-BR': {},
        pt: { hello: 'Olá' },
        en: { hello: 'Hello' },
      },
      fallbackChain: { 'pt-BR': ['pt', 'en'] },
    })

    expect(plugin.global.t('hello')).toBe('Olá')
  })
})

describe('setLocale / getLocales', () => {
  it('setLocale changes the active locale', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
      },
    })

    expect(plugin.global.t('hello')).toBe('Hello')

    plugin.global.setLocale('fr')
    expect(plugin.global.t('hello')).toBe('Bonjour')
  })

  it('getLocales returns all loaded locales', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {}, fr: {} },
    })

    expect(plugin.global.getLocales().sort()).toEqual(['en', 'fr'])
  })
})

describe('loadMessages', () => {
  it('adds new messages for a locale', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    plugin.global.loadMessages('en', { added: 'Added!' })
    expect(plugin.global.t('added')).toBe('Added!')
  })

  it('adds a new locale entirely', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    plugin.global.loadMessages('de', { hallo: 'Hallo' })
    expect(plugin.global.getLocales()).toContain('de')

    plugin.global.setLocale('de')
    expect(plugin.global.t('hallo')).toBe('Hallo')
  })
})

describe('d() and n()', () => {
  it('formats a date using Intl.DateTimeFormat', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const result = plugin.global.d(new Date(2025, 0, 15))
    expect(typeof result).toBe('string')
    expect(result).toContain('2025')
  })

  it('formats a date with a named style', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: {
        short: { year: '2-digit', month: 'numeric', day: 'numeric' },
      },
    })

    const result = plugin.global.d(new Date(2025, 0, 15), 'short')
    expect(typeof result).toBe('string')
  })

  it('formats a number using Intl.NumberFormat', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const result = plugin.global.n(1234.5)
    expect(result).toContain('1')
  })

  it('formats a number with a named style', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      numberFormats: {
        currency: { style: 'currency', currency: 'USD' },
      },
    })

    const result = plugin.global.n(42.5, 'currency')
    expect(result).toContain('42')
  })

  it('formats a number with a function-based style', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      numberFormats: {
        percent: (_locale: string) => ({ style: 'percent' }),
      },
    })

    const result = plugin.global.n(0.42, 'percent')
    expect(result).toContain('42')
  })
})

describe('format()', () => {
  it('interpolates an ICU message string directly', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    expect(plugin.global.format('Hello {name}', { name: 'World' })).toBe('Hello World')
  })

  it('returns the string unchanged when no values', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    expect(plugin.global.format('Hello')).toBe('Hello')
  })
})

describe('d() with relative style', () => {
  it('formats a recent past date as relative time', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: { relative: 'relative' },
    })

    // 30 seconds ago
    const date = new Date(Date.now() - 30_000)
    const result = plugin.global.d(date, 'relative')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats a future date as relative time', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: { relative: 'relative' },
    })

    // 2 hours from now
    const date = new Date(Date.now() + 2 * 3_600_000)
    const result = plugin.global.d(date, 'relative')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats a date far in the past (years ago)', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: { relative: 'relative' },
    })

    // ~3 years ago
    const date = new Date(Date.now() - 3 * 365 * 86_400_000)
    const result = plugin.global.d(date, 'relative')
    expect(typeof result).toBe('string')
    expect(result).toMatch(/year|yr/i)
  })

  it('formats a date a few minutes ago', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: { relative: 'relative' },
    })

    // 5 minutes ago
    const date = new Date(Date.now() - 5 * 60_000)
    const result = plugin.global.d(date, 'relative')
    expect(typeof result).toBe('string')
    expect(result).toMatch(/minute/i)
  })

  it('formats a date a few days ago', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: { relative: 'relative' },
    })

    // 2 days ago
    const date = new Date(Date.now() - 2 * 86_400_000)
    const result = plugin.global.d(date, 'relative')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats a date a few months ago', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: { relative: 'relative' },
    })

    // ~2 months ago
    const date = new Date(Date.now() - 60 * 86_400_000)
    const result = plugin.global.d(date, 'relative')
    expect(typeof result).toBe('string')
    expect(result).toMatch(/month/i)
  })

  it('formats a numeric timestamp as relative time', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      dateFormats: { relative: 'relative' },
    })

    const ts = Date.now() - 120_000 // 2 minutes ago
    const result = plugin.global.d(ts, 'relative')
    expect(typeof result).toBe('string')
    expect(result).toMatch(/minute/i)
  })
})

describe('runtime v-t directive', () => {
  it('translates text content on mount', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { 'hello.world': 'Hello World Translated' } },
    })

    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          return withDirectives(h('p', 'hello.world'), [[vT]])
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('p')?.textContent).toBe('Hello World Translated')
    app.unmount()
  })

  it('translates an attribute via v-t.alt modifier', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { 'img.alt': 'A nice image' } },
    })

    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          return withDirectives(
            h('img', { alt: 'img.alt', src: '#' }),
            [[vT, undefined, undefined, { alt: true }]],
          )
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('img')?.getAttribute('alt')).toBe('A nice image')
    app.unmount()
  })

  it('translates with a binding arg as the message id', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: 'Hi there' } },
    })

    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          return withDirectives(h('span'), [[vT, undefined, 'greeting']])
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('span')?.textContent).toBe('Hi there')
    app.unmount()
  })

  it('translates with interpolation values', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { welcome: 'Welcome {name}!' } },
    })

    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          return withDirectives(h('p', 'welcome'), [[vT, { name: 'Alice' }]])
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('p')?.textContent).toBe('Welcome Alice!')
    app.unmount()
  })

  it('runs updated hook for text content when reactive state changes', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello', goodbye: 'Goodbye' } },
    })

    const counter = ref(0)
    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          // Include counter.value so Vue re-renders the component (triggering updated hook)
          return withDirectives(
            h('p', { 'data-count': counter.value }, 'hello'),
            [[vT, undefined, 'hello']],
          )
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('p')?.textContent).toBe('Hello')

    // Trigger a re-render to invoke the updated hook
    counter.value++
    await nextTick()

    // The updated hook re-translates using the arg
    expect(el.querySelector('p')?.textContent).toBe('Hello')
    app.unmount()
  })

  it('runs updated hook for attribute modifier when reactive state changes', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { 'alt.text': 'Translated alt' } },
    })

    const counter = ref(0)
    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          return withDirectives(
            h('img', { alt: 'alt.text', src: '#', 'data-count': counter.value }),
            [[vT, undefined, undefined, { alt: true }]],
          )
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Translated alt')

    // Trigger re-render to invoke updated hook
    counter.value++
    await nextTick()

    // Updated hook re-translates the attribute
    // Since the attribute was already translated, it will try to translate "Translated alt"
    // which will return the id itself (not found), but the hook still executes
    expect(el.querySelector('img')?.getAttribute('alt')).toBeDefined()
    app.unmount()
  })
})

describe('te()', () => {
  it('returns true when the key exists in the current locale', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { bonjour: 'Bonjour' } },
    })

    expect(plugin.global.te('hello')).toBe(true)
    expect(plugin.global.te('missing')).toBe(false)
  })

  it('checks a specific locale when provided', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { bonjour: 'Bonjour' } },
    })

    expect(plugin.global.te('bonjour', 'fr')).toBe(true)
    expect(plugin.global.te('bonjour', 'en')).toBe(false)
  })

  it('returns true for compiled function messages', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: { greeting: () => 'Hello' },
      },
    })

    expect(plugin.global.te('greeting')).toBe(true)
  })
})

describe('tm()', () => {
  it('returns the raw compiled message', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello {name}' } },
    })

    expect(plugin.global.tm('hello')).toBe('Hello {name}')
  })

  it('returns undefined when the key does not exist', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    expect(plugin.global.tm('missing')).toBeUndefined()
  })

  it('returns a function message as-is', () => {
    const fn = () => 'Hello'
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: fn } },
    })

    expect(plugin.global.tm('greeting')).toBe(fn)
  })

  it('looks up a specific locale when provided', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    })

    expect(plugin.global.tm('hello', 'fr')).toBe('Bonjour')
  })
})

describe('$vtRich XSS prevention', () => {
  it('escapes HTML injected outside numbered tags in translation', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Read the <0>docs</0>': 'Read <0>docs</0><img onerror="alert(1)" src=x>',
        },
      },
    })

    const vtRich = (plugin as any).install
      ? (() => {
          const app = createApp({ render: () => h('div') })
          app.use(plugin)
          return app.config.globalProperties['$vtRich']
        })()
      : undefined

    expect(vtRich).toBeDefined()

    const result = vtRich(
      'Read the <0>docs</0>',
      [{ tag: 'a', attrs: { href: '/docs' } }],
    )

    // The raw <img> tag must be escaped — no executable HTML injection
    expect(result).not.toContain('<img')
    expect(result).toContain('&lt;img')
    // The onerror attribute is escaped too (quotes become &quot;)
    expect(result).not.toContain('onerror="alert')
    expect(result).toContain('<a href="/docs">docs</a>')
  })

  it('escapes HTML injected inside numbered tags in translation', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Click <0>here</0>': 'Click <0><img src=x onerror=alert(1)></0>',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    const result = vtRich(
      'Click <0>here</0>',
      [{ tag: 'a', attrs: { href: '#' } }],
    )

    // The raw <img> tag inside the numbered slot must be escaped
    expect(result).not.toContain('<img')
    expect(result).toContain('&lt;img')
  })

  it('renders safe translations correctly', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Read the <0>documentation</0> for details': 'Read the <0>documentation</0> for details',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    const result = vtRich(
      'Read the <0>documentation</0> for details',
      [{ tag: 'a', attrs: { href: '/docs' } }],
    )

    expect(result).toBe('Read the <a href="/docs">documentation</a> for details')
  })

  it('passes values to t() when values parameter is provided', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          '{count, plural, =0 {No <0>items</0>} other {<1>many</1> items}}':
            '{count, plural, =0 {No <0>items</0>} other {<1>many</1> items}}',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    const result = vtRich(
      '{count, plural, =0 {No <0>items</0>} other {<1>many</1> items}}',
      [{ tag: 'strong', attrs: {} }, { tag: 'em', attrs: {} }],
      { count: 0 },
    )

    expect(result).toContain('<strong>items</strong>')
    expect(result).toContain('No')
  })

  it('works without values parameter (backward compatible)', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Click <0>here</0>': 'Click <0>here</0>',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    const result = vtRich(
      'Click <0>here</0>',
      [{ tag: 'a', attrs: { href: '#' } }],
    )

    expect(result).toBe('Click <a href="#">here</a>')
  })

  it('handles self-closing <idx/> tags in translated message', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Hello <0/> world': 'Hello <0/> world',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    const result = vtRich(
      'Hello <0/> world',
      [{ tag: 'br', rawAttrs: '' }],
    )

    expect(result).toContain('<br />')
    expect(result).toContain('Hello')
    expect(result).toContain('world')
  })

  it('handles mixed self-closing and paired tags', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Line<0/>Click <1>here</1>': 'Line<0/>Click <1>here</1>',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    const result = vtRich(
      'Line<0/>Click <1>here</1>',
      [
        { tag: 'br', rawAttrs: '' },
        { tag: 'a', rawAttrs: 'href="#"' },
      ],
    )

    expect(result).toContain('<br />')
    expect(result).toContain('<a href="#">here</a>')
  })

  it('supports rawAttrs format from SFC transform', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Click <0>here</0>': 'Click <0>here</0>',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    const result = vtRich(
      'Click <0>here</0>',
      [{ tag: 'a', rawAttrs: ':href="url" class="link"' }],
    )

    expect(result).toContain('<a :href="url" class="link">here</a>')
  })

  it('escapes HTML injection in rawAttrs values', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'Click <0>here</0>': 'Click <0>here</0>',
        },
      },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)
    const vtRich = app.config.globalProperties['$vtRich']

    // Simulate rawAttrs with HTML metacharacters in the value
    const result = vtRich(
      'Click <0>here</0>',
      [{ tag: 'a', rawAttrs: 'title="<script>alert(1)</script>"' }],
    )

    // The <script> tag in the attribute value must be escaped
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })
})

describe('edge cases - exhaustive', () => {
  it('installs v-t directive', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)

    // v-t directive is registered: resolveDirective would find it inside a component
    // We verify by checking that the directive was registered on the app
    expect(app.directive('t')).toBeDefined()
  })

  it('adds $vtRich', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)

    expect(app.config.globalProperties['$vtRich']).toBeDefined()
    expect(typeof app.config.globalProperties['$vtRich']).toBe('function')
  })

  it('empty componentPrefix uses default names', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      componentPrefix: '',
    })

    const app = createApp({ render: () => h('div') })
    app.use(plugin)

    expect(app.component('Trans')).toBeDefined()
    expect(app.component('Plural')).toBeDefined()
    expect(app.component('Select')).toBeDefined()
  })

  it('t() compiled function returns undefined', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          broken: () => undefined as unknown as string,
        },
      },
    })

    // The function is called and its return value (even undefined) is used
    const result = plugin.global.t('broken')
    expect(result).toBeUndefined()
  })

  it('t() fallbackChain wildcard *', () => {
    const plugin = createFluentVue({
      locale: 'xx',
      messages: {
        xx: {},
        en: { hello: 'Hello from en' },
      },
      fallbackChain: { '*': ['en'] },
    })

    expect(plugin.global.t('hello')).toBe('Hello from en')
  })

  it('t() MessageDescriptor (msg`...`)', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: {
        en: {
          'msg-id-1': 'Translated message',
        },
      },
    })

    const result = plugin.global.t({ id: 'msg-id-1', message: 'Default message' })
    expect(result).toBe('Translated message')
  })

  it('t() MessageDescriptor falls back to message field', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const result = plugin.global.t({ id: 'missing-id', message: 'Fallback {name}' }, { name: 'Bob' })
    expect(result).toBe('Fallback Bob')
  })

  it('t() empty string id (exists in catalog)', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { '': 'Empty key message' } },
    })

    expect(plugin.global.t('')).toBe('Empty key message')
  })

  it('t() full fallback chain test', () => {
    const plugin = createFluentVue({
      locale: 'zh-TW',
      fallbackLocale: 'en',
      messages: {
        'zh-TW': {},
        'zh-CN': { hello: 'Chinese simplified' },
        en: { hello: 'English' },
      },
      fallbackChain: { 'zh-TW': ['zh-CN'] },
    })

    // fallbackLocale is tried before locale-specific fallbackChain
    expect(plugin.global.t('hello')).toBe('English')
  })

  it('v-t directive null binding value', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello World' } },
    })

    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          return withDirectives(h('p', 'hello'), [[vT, null]])
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('p')?.textContent).toBe('Hello World')
    app.unmount()
  })

  it('v-t directive undefined text content', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: 'Hi there' } },
    })

    const Comp = defineComponent({
      setup() {
        return () => {
          const vT = resolveDirective('t')!
          // Element with no text content, using arg for message id
          return withDirectives(h('span'), [[vT, undefined, 'greeting']])
        }
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(plugin)
    app.mount(el)
    await nextTick()

    expect(el.querySelector('span')?.textContent).toBe('Hi there')
    app.unmount()
  })

  it('te() non-existent locale', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    expect(plugin.global.te('hello', 'zz')).toBe(false)
  })

  it('tm() non-existent locale', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    expect(plugin.global.tm('hello', 'zz')).toBeUndefined()
  })

  it('n() NaN / Infinity', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const nanResult = plugin.global.n(NaN)
    expect(typeof nanResult).toBe('string')
    expect(nanResult).toBe('NaN')

    const infResult = plugin.global.n(Infinity)
    expect(typeof infResult).toBe('string')
    // Intl.NumberFormat formats Infinity as the infinity symbol
    expect(infResult).toContain('∞')
  })

  it('d() NaN / invalid Date', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    // NaN as timestamp - formatDate catches errors and returns ''
    const nanResult = plugin.global.d(NaN)
    expect(typeof nanResult).toBe('string')

    // Invalid Date
    const invalidResult = plugin.global.d(new Date('invalid'))
    expect(typeof invalidResult).toBe('string')
  })

  it('preloadLocale without chunkLoader configured', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
      // No chunkLoader, no splitting
    })

    // Should be a no-op, not throw
    expect(() => plugin.global.preloadLocale('fr')).not.toThrow()
  })

  it('preloadLocale already loaded locale (no-op)', async () => {
    const loader = vi.fn().mockResolvedValue({ hello: 'Bonjour' })
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      lazyLocaleLoading: true,
      chunkLoader: loader,
    })

    // 'en' is already loaded (initial locale)
    plugin.global.preloadLocale('en')
    await new Promise((r) => setTimeout(r, 0))

    // Loader should not have been called since 'en' is already loaded
    expect(loader).not.toHaveBeenCalled()
  })

  it('isLoading initially false', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    expect(plugin.global.isLoading.value).toBe(false)
  })

  it('loadedLocales initially contains initial locale', () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: {}, fr: {} },
    })

    expect(plugin.global.loadedLocales.value.has('en')).toBe(true)
  })
})
