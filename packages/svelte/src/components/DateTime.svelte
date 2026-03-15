<script lang="ts">
  import { getI18n } from '../context.svelte.js'

  interface Props {
    /** Date value to format */
    value: Date | number
    /** Named format style */
    style?: string
  }

  let { value, style }: Props = $props()

  const i18n = getI18n()

  let formatted = $derived(i18n.d(value, style))
</script>

{formatted}
