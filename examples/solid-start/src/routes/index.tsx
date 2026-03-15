import { useI18n } from '@fluenti/solid'

export default function HomePage() {
  const { t, locale, d, n } = useI18n()

  return (
    <div>
      <h1>{t('Welcome to Fluenti')}</h1>
      <p style={{ color: '#666', 'margin-bottom': '16px' }}>
        {t('A compile-time i18n library with SSR support')}
      </p>

      <section style={{ 'margin-bottom': '24px' }}>
        <h2>{t('Hello, {name}!', { name: 'Developer' })}</h2>
        <p>{t('This page is server-side rendered with per-request locale isolation.')}</p>
        <p style={{ 'margin-top': '8px', 'font-style': 'italic' }}>
          {t('Current locale: {locale}', { locale: locale() })}
        </p>
      </section>

      <section style={{
        'background': 'white',
        'padding': '16px',
        'border-radius': '8px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
        'margin-bottom': '16px',
      }}>
        <h3 style={{ 'margin-bottom': '8px' }}>d() Date Formatting</h3>
        <p>{d(new Date(2026, 2, 15))}</p>
      </section>

      <section style={{
        'background': 'white',
        'padding': '16px',
        'border-radius': '8px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ 'margin-bottom': '8px' }}>n() Number Formatting</h3>
        <p>{n(1234567.89)}</p>
      </section>
    </div>
  )
}
