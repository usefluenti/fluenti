import { I18nProvider, useI18n } from '@fluenti/react'

const en = {
  'Welcome to Fluenti': 'Welcome to Fluenti',
}

export function ReactCodeSplitting() {
  const { preloadLocale, setLocale } = useI18n()

  return (
    <I18nProvider
      locale="en"
      messages={{ en }}
      loadMessages={(locale) => import(`./locales/compiled/${locale}.js`)}
    >
      <button onMouseEnter={() => preloadLocale('ja')} onClick={() => setLocale('ja')}>
        日本語
      </button>
    </I18nProvider>
  )
}
