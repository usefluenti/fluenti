<script lang="ts">
  import { getI18n } from '../context.svelte.js'

  interface Props {
    /** The value to match against prop keys */
    value: string
    /** Fallback text when no option matches */
    other?: string
    /** Named options map */
    options?: Record<string, string>
    [key: string]: unknown
  }

  let { value, other = '', options, ...rest }: Props = $props()

  // Ensure context is available
  getI18n()

  let text = $derived.by(() => {
    if (options !== undefined) {
      const match = options[value]
      if (typeof match === 'string') return match
      return other
    }

    // Fall back to rest props
    const attrMatch = rest[value]
    if (typeof attrMatch === 'string') return attrMatch
    return other
  })
</script>

{text}
