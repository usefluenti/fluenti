import { describe, it, expect } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createFluentVue } from '../src/plugin'
import { useI18n } from '../src/use-i18n'

describe('SSR safety', () => {
  it('per-request isolation: separate instances do not share state', () => {
    const instance1 = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    const instance2 = createFluentVue({
      locale: 'fr',
      messages: { fr: { hello: 'Bonjour' } },
    })

    expect(instance1.global.locale.value).toBe('en')
    expect(instance2.global.locale.value).toBe('fr')

    instance1.global.setLocale('de')
    expect(instance1.global.locale.value).toBe('de')
    expect(instance2.global.locale.value).toBe('fr')
  })

  it('per-request isolation: loaded messages do not leak', () => {
    const instance1 = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    const instance2 = createFluentVue({
      locale: 'en',
      messages: { en: {} },
    })

    instance1.global.loadMessages('en', { secret: 'leaked' })

    expect(instance1.global.t('secret')).toBe('leaked')
    expect(instance2.global.t('secret')).toBe('secret') // returns id, not leaked
  })

  it('renders correctly with createSSRApp and renderToString', async () => {
    const plugin = createFluentVue({
      locale: 'en',
      messages: { en: { greeting: 'Hello SSR' } },
    })

    const Comp = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('div', t('greeting'))
      },
    })

    const app = createSSRApp(Comp)
    app.use(plugin)

    const html = await renderToString(app)
    expect(html).toContain('Hello SSR')
  })

  it('multiple SSR requests render independently', async () => {
    async function renderRequest(locale: string, messages: Record<string, string>) {
      const plugin = createFluentVue({
        locale,
        messages: { [locale]: messages },
      })

      const Comp = defineComponent({
        setup() {
          const { t } = useI18n()
          return () => h('div', t('greeting'))
        },
      })

      const app = createSSRApp(Comp)
      app.use(plugin)
      return renderToString(app)
    }

    const [html1, html2] = await Promise.all([
      renderRequest('en', { greeting: 'Hello' }),
      renderRequest('fr', { greeting: 'Bonjour' }),
    ])

    expect(html1).toContain('Hello')
    expect(html2).toContain('Bonjour')

    // Ensure no cross-contamination
    expect(html1).not.toContain('Bonjour')
    expect(html2).not.toContain('Hello')
  })

  it('initial messages are not shared between instances', () => {
    const sharedMessages = { en: { hello: 'Hello' } }

    const i1 = createFluentVue({ locale: 'en', messages: sharedMessages })
    const i2 = createFluentVue({ locale: 'en', messages: sharedMessages })

    i1.global.loadMessages('en', { extra: 'Extra' })

    expect(i1.global.t('extra')).toBe('Extra')
    expect(i2.global.t('extra')).toBe('extra') // not leaked
  })
})
