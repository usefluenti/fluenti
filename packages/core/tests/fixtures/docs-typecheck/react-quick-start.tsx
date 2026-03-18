import { t, useI18n, Trans, Plural } from '@fluenti/react'

export function Home() {
  const { setLocale } = useI18n()
  const name = 'World'
  const count = 3

  return (
    <div>
      <h1>{t`Welcome to my app`}</h1>
      <p>{t`Hello, ${name}!`}</p>
      <p>{t`You have ${count} items`}</p>
      <Trans>Read the <a href="/docs">documentation</a> to learn more.</Trans>
      <Plural value={count} one="# item in cart" other="# items in cart" />
      <button onClick={() => setLocale('en')}>English</button>
      <button onClick={() => setLocale('zh-CN')}>中文</button>
    </div>
  )
}
