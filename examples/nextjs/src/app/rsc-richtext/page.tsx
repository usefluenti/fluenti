import { Trans, Plural, DateTime, NumberFormat } from '@fluenti/next/__generated'

export default async function RSCRichTextPage() {
  return (
    <div data-testid="rsc-richtext-page">
      <h2 data-testid="rsc-richtext-title">{t`RSC Rich Text`}</h2>

      <p data-testid="rsc-trans-link">
        <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
      </p>

      <p data-testid="rsc-trans-bold">
        <Trans>This is <strong>important</strong> information.</Trans>
      </p>

      <p data-testid="rsc-plural">
        <Plural value={5} one="# item" other="# items" />
      </p>

      <p data-testid="rsc-plural-zero">
        <Plural value={0} zero="No items" one="# item" other="# items" />
      </p>

      <p data-testid="rsc-date">
        <DateTime value={new Date(2025, 0, 15)} />
      </p>

      <p data-testid="rsc-number">
        <NumberFormat value={1234.56} />
      </p>
    </div>
  )
}
