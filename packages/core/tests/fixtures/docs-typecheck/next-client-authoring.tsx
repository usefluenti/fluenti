'use client'

import { t } from '@fluenti/react'

export function Nav({ label }: { label: string }) {
  return <span>{t`Go to ${label}`}</span>
}
