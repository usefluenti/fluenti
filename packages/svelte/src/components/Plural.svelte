<script lang="ts">
  import { getI18n } from '../context.svelte.js'
  import { interpolate } from '@fluenti/core'
  import type { Snippet } from 'svelte'

  /** Plural category names in stable order */
  const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const
  type PluralCategory = (typeof PLURAL_CATEGORIES)[number]

  interface Props {
    /** The numeric value to pluralise on */
    value: number
    /** Text for zero items (maps to `=0`) */
    zero?: string
    /** Text for singular (maps to `one`) */
    one?: string
    /** Text for dual (maps to `two`) */
    two?: string
    /** Text for few (maps to `few`) */
    few?: string
    /** Text for many (maps to `many`) */
    many?: string
    /** Text for the default/other category */
    other?: string
    /** Snippet for zero */
    zeroSnippet?: Snippet
    /** Snippet for one */
    oneSnippet?: Snippet
    /** Snippet for other */
    otherSnippet?: Snippet
  }

  let { value, zero, one, two, few, many, other = '', zeroSnippet, oneSnippet, otherSnippet }: Props = $props()

  const i18n = getI18n()

  /**
   * Build an ICU plural message string from individual category props.
   */
  function buildICUPluralMessage(
    forms: Partial<Record<PluralCategory, string>> & { other: string },
  ): string {
    const parts: string[] = []
    for (const cat of PLURAL_CATEGORIES) {
      const text = forms[cat]
      if (text !== undefined) {
        const key = cat === 'zero' ? '=0' : cat
        parts.push(`${key} {${text}}`)
      }
    }
    return `{count, plural, ${parts.join(' ')}}`
  }

  /**
   * Resolve which plural category to use for snippet rendering.
   */
  function resolveCategory(
    val: number,
    loc: string,
    available: (cat: PluralCategory) => boolean,
  ): PluralCategory {
    if (val === 0 && available('zero')) return 'zero'
    const cldr = new Intl.PluralRules(loc).select(val) as PluralCategory
    if (available(cldr)) return cldr
    return 'other'
  }

  let text = $derived.by(() => {
    const forms: Partial<Record<PluralCategory, string>> & { other: string } = {
      ...(zero !== undefined && { zero }),
      ...(one !== undefined && { one }),
      ...(two !== undefined && { two }),
      ...(few !== undefined && { few }),
      ...(many !== undefined && { many }),
      other: other ?? '',
    }

    const icuMessage = buildICUPluralMessage(forms)

    // Use MessageDescriptor form for fallback
    const translated = i18n.t(
      { id: icuMessage, message: icuMessage },
      { count: value },
    )

    // If t() returned the raw ICU message (no catalog match), interpolate directly
    if (translated === icuMessage) {
      return interpolate(icuMessage, { count: value }, i18n.locale)
    }
    return translated
  })

  let hasSnippets = $derived(!!zeroSnippet || !!oneSnippet || !!otherSnippet)

  let snippetCategory = $derived.by(() => {
    if (!hasSnippets) return 'other' as PluralCategory
    return resolveCategory(value, i18n.locale, (c) => {
      if (c === 'zero') return !!zeroSnippet
      if (c === 'one') return !!oneSnippet
      if (c === 'other') return !!otherSnippet
      return false
    })
  })
</script>

{#if hasSnippets}
  {#if snippetCategory === 'zero' && zeroSnippet}
    {@render zeroSnippet()}
  {:else if snippetCategory === 'one' && oneSnippet}
    {@render oneSnippet()}
  {:else if otherSnippet}
    {@render otherSnippet()}
  {/if}
{:else}
  {text}
{/if}
