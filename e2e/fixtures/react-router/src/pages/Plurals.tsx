import { useState } from 'react'
import { t, Plural } from '@fluenti/react'

export function Plurals() {
  const [count, setCount] = useState(0)

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
    </div>
  )
}
