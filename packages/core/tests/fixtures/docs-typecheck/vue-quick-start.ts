import { t, useI18n } from '@fluenti/vue'

export function setupHome() {
  const { setLocale } = useI18n()
  const name = 'World'

  const greeting: string = t`Hello, ${name}!`
  void setLocale('en')

  return { greeting }
}
