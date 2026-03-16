'use client'

import { useState } from 'react'
import { useI18n } from '@fluenti/react'
import { greetAction } from './actions'

export default function ServerActionPage() {
  const { i18n } = useI18n()
  const [result, setResult] = useState<string | null>(null)

  return (
    <div data-testid="action-page">
      <h1 data-testid="action-title">{i18n.t('Server Action Demo')}</h1>
      <button
        data-testid="action-submit"
        onClick={async () => {
          const msg = await greetAction()
          setResult(msg)
        }}
      >
        {i18n.t('Submit')}
      </button>
      {result && (
        <p data-testid="action-result">{i18n.t('Server says: {message}', { message: result })}</p>
      )}
    </div>
  )
}
