import { useState } from 'react'
import { useI18n, msg } from '@fluenti/react'

// msg`` in plain JSX (no TypeScript) — the key scenario this fixture tests
const ROLES = {
  admin: msg`Administrator`,
  user: msg`Regular User`,
}

export function App({ onLocaleChange }) {
  const { t, setLocale } = useI18n()
  const [count, setCount] = useState(0)

  const handleSetLocale = async (loc) => {
    await setLocale(loc)
    onLocaleChange(loc)
  }

  return (
    <div>
      <div>
        <button data-testid="lang-en" onClick={() => handleSetLocale('en')}>EN</button>
        <button data-testid="lang-ja" onClick={() => handleSetLocale('ja')}>JA</button>
      </div>

      <p data-testid="hello">{t`Hello World`}</p>
      <p data-testid="msg-admin">{t(ROLES.admin)}</p>
      <p data-testid="msg-user">{t(ROLES.user)}</p>

      <p data-testid="count">{t`You have ${count} items.`}</p>
      <button data-testid="count-add" onClick={() => setCount((n) => n + 1)}>+</button>
      <button data-testid="count-reset" onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
