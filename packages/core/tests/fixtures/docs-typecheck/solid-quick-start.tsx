import { createSignal } from 'solid-js'
import { t, useI18n, Trans, Plural } from '@fluenti/solid'

export function Home() {
  const { setLocale } = useI18n()
  const [name] = createSignal('World')
  const [count] = createSignal(3)

  return (
    <div>
      <h1>{t`Welcome to my app`}</h1>
      <p>{t`Hello, ${name()}`}</p>
      <Trans>Read the <a href="/docs">documentation</a> to learn more.</Trans>
      <Plural value={count()} one="# item in cart" other="# items in cart" />
      <button onClick={() => setLocale('en')}>English</button>
      <button onClick={() => setLocale('zh-CN')}>中文</button>
    </div>
  )
}
