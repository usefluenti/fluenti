<script lang="ts">
  import { setI18nContext } from '../../src/index.js'
  import DateTime from '../../src/components/DateTime.svelte'
  import type { Messages } from '@fluenti/core'

  interface Props {
    locale: string
    messages: Record<string, Messages>
    value: Date | number
    style?: string
  }

  let { locale, messages, value, style }: Props = $props()

  setI18nContext({ locale, messages })
</script>

<DateTime {value} {style} />
