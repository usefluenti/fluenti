import { useState } from 'react'
import { useI18n } from '@fluenti/react'

/**
 * A stateful component that exercises React Compiler's auto-memoization.
 * Verifies that useState + useI18n work correctly after Compiler transforms.
 */
export function Counter() {
  const { t } = useI18n()
  const [count, setCount] = useState(0)

  return (
    <div>
      <p data-testid="counter-value">{t('counter.label', { count })}</p>
      <button data-testid="counter-inc" onClick={() => setCount((c) => c + 1)}>+</button>
      <button data-testid="counter-dec" onClick={() => setCount((c) => c - 1)}>-</button>
    </div>
  )
}
