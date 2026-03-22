import { useI18n } from '@fluenti/react'

export function App({ onLocaleChange }: { onLocaleChange: (locale: string) => void }) {
  const { t, te, locale, setLocale } = useI18n()

  const handleSetLocale = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
    document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = loc
  }

  return (
    <div>
      <nav>
        <button data-testid="lang-en" onClick={() => handleSetLocale('en')}>English</button>
        <button data-testid="lang-ja" onClick={() => handleSetLocale('ja')}>日本語</button>
        <button data-testid="lang-ar" onClick={() => handleSetLocale('ar')}>العربية</button>
      </nav>

      <section>
        <h2>Plurals (cart)</h2>
        <p data-testid="plural-0">{t('plural.cart', { count: 0 })}</p>
        <p data-testid="plural-1">{t('plural.cart', { count: 1 })}</p>
        <p data-testid="plural-2">{t('plural.cart', { count: 2 })}</p>
        <p data-testid="plural-3">{t('plural.cart', { count: 3 })}</p>
        <p data-testid="plural-5">{t('plural.cart', { count: 5 })}</p>
        <p data-testid="plural-100">{t('plural.cart', { count: 100 })}</p>
      </section>

      <section>
        <h2>Arabic Plurals</h2>
        <p data-testid="arabic-0">{t('plural.arabic', { count: 0 })}</p>
        <p data-testid="arabic-1">{t('plural.arabic', { count: 1 })}</p>
        <p data-testid="arabic-2">{t('plural.arabic', { count: 2 })}</p>
        <p data-testid="arabic-3">{t('plural.arabic', { count: 3 })}</p>
        <p data-testid="arabic-11">{t('plural.arabic', { count: 11 })}</p>
        <p data-testid="arabic-100">{t('plural.arabic', { count: 100 })}</p>
      </section>

      <section>
        <h2>Nested Select + Plural</h2>
        <p data-testid="select-male-1">{t('select.nested', { gender: 'male', count: 1 })}</p>
        <p data-testid="select-female-3">{t('select.nested', { gender: 'female', count: 3 })}</p>
        <p data-testid="select-other-5">{t('select.nested', { gender: 'other', count: 5 })}</p>
      </section>

      <section>
        <h2>Number Formatting</h2>
        <p data-testid="currency-usd">{t('format.currency', { amount: 1234.56 })}</p>
        <p data-testid="percent">{t('format.percent', { value: 0.75 })}</p>
      </section>

      <section>
        <h2>Missing Key Handling</h2>
        <p data-testid="missing-key">{t('this.key.does.not.exist')}</p>
        <p data-testid="te-exists">{String(te('plural.cart'))}</p>
        <p data-testid="te-missing">{String(te('nonexistent'))}</p>
      </section>

      <section>
        <h2>Fallback</h2>
        <p data-testid="fallback-test">{t('fallback.exists')}</p>
      </section>

      <section>
        <h2>Edge Cases</h2>
        <p data-testid="empty-string">{t('edge.empty')}</p>
        <p data-testid="long-message">{t('edge.long')}</p>
        <p data-testid="special-chars">{t('edge.special')}</p>
      </section>

      <p data-testid="current-locale">Current: {locale}</p>
    </div>
  )
}
