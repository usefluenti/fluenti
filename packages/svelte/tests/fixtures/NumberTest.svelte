<script lang="ts">
  import { setI18nContext } from '../../src/index.js'
  import Number from '../../src/components/Number.svelte'
  import type { Messages } from '@fluenti/core'

  interface Props {
    locale: string
    messages: Record<string, Messages>
    value: number
    style?: string
  }

  let { locale, messages, value, style }: Props = $props()

  setI18nContext({ locale, messages })
</script>

<Number {value} {style} />
