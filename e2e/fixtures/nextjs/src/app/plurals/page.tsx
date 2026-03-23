'use client'

import { useState } from 'react'
import { Plural, Select, useI18n } from '@fluenti/react'

export default function Plurals() {
  const { t } = useI18n()
  const [count, setCount] = useState(0)
  const [gender, setGender] = useState('other')

  return (
    <div data-testid="plurals-page">
      <h1>Plural Demos</h1>
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
        <button data-testid="btn-reset" onClick={() => setCount(0)}>
          {t`Reset`}
        </button>
      </div>

      <h2>Select Demo</h2>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button data-testid="gender-male" onClick={() => setGender('male')}>Male</button>
        <button data-testid="gender-female" onClick={() => setGender('female')}>Female</button>
        <button data-testid="gender-other" onClick={() => setGender('other')}>Other</button>
      </div>
      <div data-testid="select-result">
        <Select value={gender} male="He liked it" female="She liked it" other="They liked it" />
      </div>
    </div>
  )
}
