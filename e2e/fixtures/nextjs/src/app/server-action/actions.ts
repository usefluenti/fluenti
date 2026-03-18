'use server'

import { t } from '@fluenti/react'

export async function greetAction(): Promise<string> {
  return t`Hello from server action`
}
