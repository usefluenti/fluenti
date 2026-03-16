'use server'

import { getI18n } from '@fluenti/next/__generated'

export async function greetAction(): Promise<string> {
  const i18n = await getI18n()
  return t`Hello from server action`
}
