import { createSignal } from 'solid-js'
import { Plural, t } from '@fluenti/solid'

export default function PluralsPage() {
  const [count, setCount] = createSignal(0)

  return (
    <div>
      <h1>{t`Plurals`}</h1>
      <p style={{ color: '#666', 'margin-bottom': '16px' }}>
        The Plural component selects the correct plural form based on Intl.PluralRules.
      </p>

      <div style={{
        background: 'white',
        padding: '24px',
        'border-radius': '8px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
        'text-align': 'center',
      }}>
        <div style={{
          'font-size': '48px',
          'font-weight': 'bold',
          'margin-bottom': '16px',
          color: '#4a90d9',
        }}>
          {count()}
        </div>

        <p style={{ 'font-size': '18px', 'margin-bottom': '24px' }}>
          <Plural
            value={count()}
            zero={t`Your cart is empty.`}
            one={t`You have # item in your cart.`}
            other={t`You have # items in your cart.`}
          />
        </p>

        <div style={{ display: 'flex', gap: '8px', 'justify-content': 'center' }}>
          <button
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            style={{
              padding: '8px 20px',
              'font-size': '18px',
              'border-radius': '4px',
              border: '1px solid #ddd',
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <button
            onClick={() => setCount((c) => c + 1)}
            style={{
              padding: '8px 20px',
              'font-size': '18px',
              'border-radius': '4px',
              border: '1px solid #ddd',
              cursor: 'pointer',
            }}
          >
            +
          </button>
          <button
            onClick={() => setCount(0)}
            style={{
              padding: '8px 20px',
              'font-size': '14px',
              'border-radius': '4px',
              border: '1px solid #ddd',
              cursor: 'pointer',
            }}
          >
            {t`Reset`}
          </button>
        </div>
      </div>
    </div>
  )
}
