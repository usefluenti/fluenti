import { useI18n } from '@fluenti/react'

export function About() {
  const { i18n } = useI18n()
  return (
    <div data-testid="about-page">
      <h1 data-testid="about-title">{i18n.t('About our project')}</h1>
      <p data-testid="about-desc">{i18n.t('Learn more about Fluenti.')}</p>
      <p data-testid="contact">{i18n.t('Contact us at {email}', { email: 'hello@fluenti.dev' })}</p>
    </div>
  )
}
