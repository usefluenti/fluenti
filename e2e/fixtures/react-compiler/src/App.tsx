import { useI18n } from '@fluenti/react'
import { Counter } from './Counter'

export function App({ onLocaleChange }: { onLocaleChange: (locale: string) => void }) {
  const { t, te, locale, setLocale, isLoading } = useI18n()

  const handleSetLocale = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
    document.documentElement.lang = loc
  }

  return (
    <div>
      <nav>
        <button data-testid="lang-en" onClick={() => handleSetLocale('en')}>English</button>
        <button data-testid="lang-ja" onClick={() => handleSetLocale('ja')}>日本語</button>
      </nav>

      <p data-testid="current-locale">Current: {locale}</p>
      <p data-testid="is-loading">{String(isLoading)}</p>

      <section>
        <h2>Interpolation</h2>
        <p data-testid="greeting">{t('greeting', { name: 'World' })}</p>
      </section>

      <section>
        <h2>Plurals</h2>
        <p data-testid="plural-0">{t('plural.items', { count: 0 })}</p>
        <p data-testid="plural-1">{t('plural.items', { count: 1 })}</p>
        <p data-testid="plural-5">{t('plural.items', { count: 5 })}</p>
      </section>

      <section>
        <h2>Select</h2>
        <p data-testid="select-male">{t('select.gender', { gender: 'male' })}</p>
        <p data-testid="select-female">{t('select.gender', { gender: 'female' })}</p>
        <p data-testid="select-other">{t('select.gender', { gender: 'other' })}</p>
      </section>

      <section>
        <h2>Nested Select + Plural</h2>
        <p data-testid="nested-male-1">{t('nested', { gender: 'male', count: 1 })}</p>
        <p data-testid="nested-female-3">{t('nested', { gender: 'female', count: 3 })}</p>
      </section>

      <section>
        <h2>Number Formatting</h2>
        <p data-testid="currency">{t('format.currency', { amount: 1234.56 })}</p>
        <p data-testid="percent">{t('format.percent', { value: 0.85 })}</p>
      </section>

      <section>
        <h2>Fallback & te()</h2>
        <p data-testid="fallback">{t('fallback.only-en')}</p>
        <p data-testid="te-exists">{String(te('greeting'))}</p>
        <p data-testid="te-missing">{String(te('nonexistent'))}</p>
      </section>

      <section>
        <h2>Stateful Component</h2>
        <Counter />
      </section>
    </div>
  )
}
