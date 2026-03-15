<script lang="ts">
  import { getI18n } from '../context.svelte.js'
  import type { Snippet } from 'svelte'

  interface Props {
    /** Override auto-generated hash id */
    id?: string
    /** Context for translators */
    comment?: string
    /** ICU message string with `<tag>content</tag>` markers */
    message?: string
    /** Interpolation values */
    values?: Record<string, unknown>
    /** Content to render */
    children?: Snippet
  }

  let { id, comment, message, values, children }: Props = $props()

  const i18n = getI18n()
</script>

{#if message}
  <!-- Legacy message prop API -->
  {@html ''}<!-- suppress whitespace -->{i18n.format(message, values)}
{:else if children}
  {@render children()}
{/if}
