/**
 * RSC page using t`` tagged templates — zero imports, zero await.
 * The loader transforms t`` to __getServerI18n().t() automatically.
 */
export default function RSCTaggedPage() {
  const framework = 'Next.js'

  return (
    <div data-testid="rsc-tagged-page">
      <h1 data-testid="rsc-tagged-title">{t`Server rendered`}</h1>
      <p data-testid="rsc-tagged-interpolation">{t`Welcome to ${framework}`}</p>
      <p data-testid="rsc-tagged-simple">{t`This page uses tagged templates in a Server Component.`}</p>
    </div>
  )
}
