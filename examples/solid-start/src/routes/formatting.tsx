import type { Component } from 'solid-js'
import { useI18n } from '@fluenti/solid'
import { DateTime, NumberFormat } from '@fluenti/solid/components'
import { msg } from '@fluenti/core'

// Demonstrate msg`` for module-level message descriptors
const pageTitle = msg`Date & Number Formatting`

const Formatting: Component = () => {
  const { t: translate } = useI18n()

  return (
    <div>
      <h1 data-testid="formatting-title">{translate(pageTitle)}</h1>

      <section style={{ 'margin-bottom': '24px' }}>
        <h2>{translate`Today's date:`}</h2>
        <p>
          Default: <span data-testid="date-default"><DateTime value={Date.now()} /></span>
        </p>
        <p>
          Short: <span data-testid="date-short"><DateTime value={Date.now()} format="short" /></span>
        </p>
        <p>
          Long: <span data-testid="date-long"><DateTime value={Date.now()} format="long" /></span>
        </p>
        <p>
          Time: <span data-testid="date-time"><DateTime value={Date.now()} format="time" /></span>
        </p>
      </section>

      <section style={{ 'margin-bottom': '24px' }}>
        <h2>{translate`A large number:`}</h2>
        <p>
          Default: <span data-testid="number-default"><NumberFormat value={1234567.89} /></span>
        </p>
      </section>

      <section style={{ 'margin-bottom': '24px' }}>
        <h2>{translate`Percentage:`}</h2>
        <p>
          <span data-testid="number-percent"><NumberFormat value={0.75} format="percent" /></span>
        </p>
      </section>

      <section>
        <h2>{translate`Currency:`}</h2>
        <p>
          <span data-testid="number-currency"><NumberFormat value={99.99} format="currency" /></span>
        </p>
      </section>
    </div>
  )
}

export default Formatting
