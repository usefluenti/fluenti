import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/solid'

export function Banner(props: { count: number; role: string }) {
  return (
    <>
      <Trans>Hello <strong>world</strong></Trans>
      <Plural value={props.count} one="# item" other="# items" />
      <Select value={props.role} options={{ admin: 'Admin' }} other="Guest" />
      <DateTime value={new Date(Date.UTC(2025, 0, 15, 12))} />
      <NumberFormat value={1234.5} style="currency" />
    </>
  )
}
