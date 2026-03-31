import { h } from 'vue'
import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/vue'

export function renderBanner(count: number, role: string) {
  return [
    h(Trans, null, {
      default: () => ['Hello ', h('strong', 'world')],
    }),
    h(Plural, { value: count, one: '# item', other: '# items' }),
    h(Select, { value: role, options: { admin: 'Admin' }, other: 'Guest' }),
    h(DateTime, { value: new Date(Date.UTC(2025, 0, 15, 12)) }),
    h(NumberFormat, { value: 1234.5, style: 'currency' }),
  ]
}
