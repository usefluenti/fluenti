<script lang="ts">
  import { setI18nContext } from '../../src/index.js'
  import Select from '../../src/components/Select.svelte'
  import type { Messages } from '@fluenti/core'

  interface Props {
    locale: string
    messages: Record<string, Messages>
    value: string
    other?: string
    options?: Record<string, string>
  }

  let { locale, messages, value, other = '', options }: Props = $props()

  setI18nContext({ locale, messages })
</script>

<Select {value} {other} {options} />
