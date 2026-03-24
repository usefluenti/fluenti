import { describe, expect, it } from 'vitest'
import { createRoot } from 'solid-js'
import { createFluentiContext } from '../src/context'

describe('Solid tagged-template runtime fallback', () => {
  it('interpolates runtime tagged templates with argN placeholders', () => {
    createRoot((dispose) => {
      const i18n = createFluentiContext({
        locale: 'en',
        messages: {
          en: {
            'Hello {arg0}!': 'Hi {arg0}!',
          },
        },
      })

      expect(i18n.t`Hello ${'Ada'}!`).toBe('Hi Ada!')
      expect(i18n.t('Hello {arg0}!', { arg0: 'Ada' })).toBe('Hi Ada!')

      dispose()
    })
  })
})
