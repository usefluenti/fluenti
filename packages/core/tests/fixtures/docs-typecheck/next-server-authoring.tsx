import { t, Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/react'

export default async function Page({ name }: { name: string }) {
  return (
    <>
      <h1>{t`Hello ${name}`}</h1>
      <Trans>Read the <a href="/docs">documentation</a>.</Trans>
      <Plural value={2} one="# item" other="# items" />
      <Select value="admin" options={{ admin: 'Administrator' }} other="Guest" />
      <DateTime value={new Date(Date.UTC(2025, 0, 15, 12))} />
      <NumberFormat value={1234.5} style="currency" />
    </>
  )
}
