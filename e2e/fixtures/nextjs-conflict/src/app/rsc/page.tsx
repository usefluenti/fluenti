import { t } from '@fluenti/react'
import { getI18n } from '@fluenti/next'

export default async function RSCPage() {
  const i18n = await getI18n()

  return (
    <div data-testid="rsc-page">
      <h1 data-testid="rsc-title">{t`Server rendered`}</h1>
      <p data-testid="rsc-locale">{t`Current server locale: ${i18n.locale}`}</p>
    </div>
  )
}
