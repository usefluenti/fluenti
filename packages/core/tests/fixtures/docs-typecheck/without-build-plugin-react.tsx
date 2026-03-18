import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/react'

export function Banner({ count, role }: { count: number; role: string }) {
  return (
    <>
      <Trans>Hello <strong>world</strong></Trans>
      <Plural value={count} one="# item" other="# items" />
      <Select value={role} options={{ admin: 'Admin' }} other="Guest" />
      <DateTime value={new Date(Date.UTC(2025, 0, 15, 12))} />
      <NumberFormat value={1234.5} style="currency" />
    </>
  )
}
