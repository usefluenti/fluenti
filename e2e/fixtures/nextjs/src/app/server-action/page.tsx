'use client'

import { useState } from 'react'
import { useI18n } from '@fluenti/react'
import { greetAction } from './actions'

export default function ServerActionPage() {
  const [result, setResult] = useState<string | null>(null)
  const { t } = useI18n()

  return (
    <div data-testid="action-page">
      <h1 data-testid="action-title">{t`Server Action Demo`}</h1>
      <button
        data-testid="action-submit"
        onClick={async () => {
          const msg = await greetAction()
          setResult(msg)
        }}
      >
        {t`Submit`}
      </button>
      {result && (
        <p data-testid="action-result">{t`Server says: ${result}`}</p>
      )}
    </div>
  )
}
