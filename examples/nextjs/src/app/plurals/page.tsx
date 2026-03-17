'use client'

import { useState } from 'react'
import { Plural, Select, useI18n } from '@fluenti/react'

export default function PluralsPage() {
  const { t } = useI18n()
  const [count, setCount] = useState(0)
  const [gender, setGender] = useState('other')

  return (
    <div data-testid="plurals-section">
      <h2>{t`Plurals`}</h2>
      <div data-testid="plural-result">
        <Plural
          value={count}
          zero="No messages"
          one="# message"
          other="# messages"
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button data-testid="btn-add" onClick={() => setCount(c => c + 1)}>
          {t`Add`}
        </button>
        <button data-testid="btn-remove" onClick={() => setCount(c => Math.max(0, c - 1))}>
          {t`Remove`}
        </button>
        <button data-testid="btn-reset" onClick={() => setCount(0)}>
          {t`Reset`}
        </button>
      </div>

      <h3>{t`Select Demo`}</h3>
      <div data-testid="select-result">
        <Select
          value={gender}
          male="He liked your post"
          female="She liked your post"
          other="They liked your post"
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button data-testid="gender-male" onClick={() => setGender('male')}>{t`Male`}</button>
        <button data-testid="gender-female" onClick={() => setGender('female')}>{t`Female`}</button>
        <button data-testid="gender-other" onClick={() => setGender('other')}>{t`Other`}</button>
      </div>
    </div>
  )
}
