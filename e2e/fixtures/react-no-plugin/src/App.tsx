import { useI18n, Trans } from '@fluenti/react'

export function App({ onLocaleChange }: { onLocaleChange: (locale: string) => void }) {
  const { t, locale, setLocale } = useI18n()

  const handleSetLocale = async (loc: string) => {
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <div>
      <div className="locale-switcher">
        <button data-testid="lang-en" onClick={() => handleSetLocale('en')}>English</button>
        <button data-testid="lang-ja" onClick={() => handleSetLocale('ja')}>日本語</button>
        <button data-testid="lang-zh" onClick={() => handleSetLocale('zh-CN')}>中文</button>
      </div>

      <p data-testid="welcome">{t`Welcome to Fluenti`}</p>

      <p data-testid="trans-basic">
        <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
      </p>
      <p data-testid="trans-bold">
        <Trans>This is <strong>important</strong> information.</Trans>
      </p>
      <p data-testid="trans-multi">
        <Trans>Please <a href="/login">sign in</a> or <strong>register</strong> to continue.</Trans>
      </p>
    </div>
  )
}
