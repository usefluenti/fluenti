import type { Component } from 'solid-js'
import { useI18n, DateTime, NumberFormat } from '@fluenti/solid'
import { msg } from '@fluenti/core'

// Demonstrate msg`` for module-level message descriptors
const pageTitle = msg`Date & Number Formatting`

const Formatting: Component = () => {
  const { t: translate } = useI18n()

  return (
    <div>
      <h1>{translate(pageTitle)}</h1>

      <section style={{ 'margin-bottom': '24px' }}>
        <h2>{t`Today's date:`}</h2>
        <p>
          Default: <DateTime value={Date.now()} />
        </p>
        <p>
          Short: <DateTime value={Date.now()} style="short" />
        </p>
        <p>
          Long: <DateTime value={Date.now()} style="long" />
        </p>
        <p>
          Time: <DateTime value={Date.now()} style="time" />
        </p>
      </section>

      <section style={{ 'margin-bottom': '24px' }}>
        <h2>{t`A large number:`}</h2>
        <p>
          Default: <NumberFormat value={1234567.89} />
        </p>
      </section>

      <section style={{ 'margin-bottom': '24px' }}>
        <h2>{t`Percentage:`}</h2>
        <p>
          <NumberFormat value={0.75} style="percent" />
        </p>
      </section>

      <section>
        <h2>{t`Currency:`}</h2>
        <p>
          <NumberFormat value={99.99} style="currency" />
        </p>
      </section>
    </div>
  )
}

export default Formatting
