<script lang="ts">
  import { setI18nContext } from '../../src/index.js'
  import type { Messages } from '@fluenti/core'

  interface Props {
    locale: string
    messages: Record<string, Messages>
    loadMessages?: (locale: string) => Promise<Messages>
    targetLocale?: string
    showLoading?: boolean
  }

  let { locale, messages, loadMessages: loadMessagesFn, targetLocale = 'fr', showLoading = false }: Props = $props()

  const i18n = setI18nContext({
    locale,
    messages,
    loadMessages: loadMessagesFn,
  })
</script>

<span data-testid="text">{i18n.t('hello')}</span>
{#if showLoading}<span>loading:{String(i18n.isLoading)}</span>{/if}
<button onclick={() => i18n.setLocale(targetLocale)}>Switch</button>
