import { useState } from 'react'
import { useI18n, Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/react'

const DEMO_DATE = new Date(Date.UTC(2025, 0, 15, 12))

export function App({ onLocaleChange }: { onLocaleChange: (locale: string) => void }) {
  const { t, locale, setLocale } = useI18n()
  const [count, setCount] = useState(0)
  const [role, setRole] = useState('admin')

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

      <p data-testid="plural-basic">
        <Plural id="cart-count" value={count} zero="No items" one="# item" other="# items" />
      </p>
      <div>
        <button data-testid="count-add" onClick={() => setCount((value) => value + 1)}>Add</button>
        <button data-testid="count-reset" onClick={() => setCount(0)}>Reset</button>
      </div>

      <p data-testid="select-basic">
        <Select
          id="role-select"
          value={role}
          options={{ admin: 'Administrator', user: 'User' }}
          other="Guest"
        />
      </p>
      <div>
        <button data-testid="role-admin" onClick={() => setRole('admin')}>Admin</button>
        <button data-testid="role-user" onClick={() => setRole('user')}>User</button>
        <button data-testid="role-other" onClick={() => setRole('other')}>Other</button>
      </div>

      <p data-testid="date-basic">
        <DateTime value={DEMO_DATE} />
      </p>
      <p data-testid="number-basic">
        <NumberFormat value={1234.5} style="currency" />
      </p>
    </div>
  )
}
