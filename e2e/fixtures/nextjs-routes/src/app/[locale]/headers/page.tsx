import { headers } from 'next/headers'

export default async function HeadersPage() {
  const headerStore = await headers()
  const localeHeader = headerStore.get('x-fluenti-locale') ?? 'not-set'
  const customHeader = headerStore.get('x-custom-test') ?? 'not-set'

  return (
    <div data-testid="headers-page">
      <p data-testid="locale-header">{localeHeader}</p>
      <p data-testid="custom-header">{customHeader}</p>
    </div>
  )
}
