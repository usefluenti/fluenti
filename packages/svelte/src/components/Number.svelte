<script lang="ts">
  import { getI18n } from '../context.svelte.js'

  interface Props {
    /** Number value to format */
    value: number
    /** Named format style */
    style?: string
  }

  let { value, style }: Props = $props()

  const i18n = getI18n()

  let formatted = $derived(i18n.n(value, style))
</script>

{formatted}
