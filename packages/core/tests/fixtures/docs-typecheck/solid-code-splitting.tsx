import { I18nProvider, useI18n } from '@fluenti/solid'

const en = {
  'Welcome to Fluenti': 'Welcome to Fluenti',
}

function LocaleButton() {
  const { preloadLocale, setLocale } = useI18n()

  return (
    <button onMouseEnter={() => preloadLocale('ja')} onClick={() => setLocale('ja')}>
      日本語
    </button>
  )
}

export function SolidCodeSplitting() {
  return (
    <I18nProvider
      locale="en"
      messages={{ en }}
      lazyLocaleLoading
      chunkLoader={(locale) => import(`./locales/compiled/${locale}.js`)}
    >
      <LocaleButton />
    </I18nProvider>
  )
}
