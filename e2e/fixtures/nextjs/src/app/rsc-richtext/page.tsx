// No imports needed — Trans, Plural, DateTime, NumberFormat are auto-injected by the loader
export default async function RSCRichTextPage() {
  return (
    <div data-testid="rsc-richtext-page">
      <h1 data-testid="rsc-richtext-title">RSC Rich Text</h1>

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
        <DateTime value={new Date(2024, 0, 15)} />
      </p>

      <p data-testid="rsc-number">
        <NumberFormat value={1234.56} />
      </p>
    </div>
  )
}
