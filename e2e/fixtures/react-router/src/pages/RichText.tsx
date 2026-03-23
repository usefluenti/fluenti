import { Trans } from '@fluenti/react'

export function RichText() {
  return (
    <div data-testid="richtext-page">
      <h1>Rich Text Demos</h1>
      <p data-testid="trans-basic">
        <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
      </p>
      <p data-testid="trans-bold">
        <Trans>This is <strong>important</strong> information.</Trans>
      </p>
    </div>
  )
}
