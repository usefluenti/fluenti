'use server'

import { getI18n } from '@/lib/i18n.server'

export async function greetAction(): Promise<string> {
  const i18n = await getI18n()
  return i18n.t('Hello from server action')
}
