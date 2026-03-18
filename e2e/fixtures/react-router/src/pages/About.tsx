import { t } from '@fluenti/react'

export function About() {
  const email = 'hello@fluenti.dev'
  return (
    <div data-testid="about-page">
      <h1 data-testid="about-title">{t`About our project`}</h1>
      <p data-testid="about-desc">{t`Learn more about Fluenti.`}</p>
      <p data-testid="contact">{t`Contact us at ${email}`}</p>
    </div>
  )
}
