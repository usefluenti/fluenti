import { useI18n } from '@fluenti/react'

export default function Index() {
  const { i18n } = useI18n()
  return (
    <div data-testid="home-page">
      <h1 data-testid="welcome">{i18n.t('Welcome to Fluenti')}</h1>
      <p data-testid="home-desc">{i18n.t('This is the home page.')}</p>
      <p data-testid="greeting">{i18n.t('Hello, {name}!', { name: 'World' })}</p>
    </div>
  )
}
