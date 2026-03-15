<script lang="ts">
  import { setI18nContext } from '../../src/index.js'
  import Plural from '../../src/components/Plural.svelte'
  import type { Messages } from '@fluenti/core'

  interface Props {
    locale: string
    messages: Record<string, Messages>
    value: number
    zero?: string
    one?: string
    two?: string
    few?: string
    many?: string
    other?: string
  }

  let { locale, messages, value, zero, one, two, few, many, other = '' }: Props = $props()

  setI18nContext({ locale, messages })
</script>

<Plural {value} {zero} {one} {two} {few} {many} {other} />
