<script lang="ts">
  import { setI18nContext, getI18n } from '../../src/index.js'
  import type { Messages, MessageDescriptor } from '@fluenti/core'

  interface Props {
    locale: string
    messages: Record<string, Messages>
    fallbackLocale?: string
    messageId?: string
    descriptor?: MessageDescriptor
    values?: Record<string, unknown>
    showLocale?: boolean
    showLocales?: boolean
  }

  let { locale, messages, fallbackLocale, messageId = 'hello', descriptor, values, showLocale = false, showLocales = false }: Props = $props()

  const i18n = setI18nContext({
    locale,
    fallbackLocale,
    messages,
  })

  let translated = $derived(
    descriptor
      ? i18n.t(descriptor, values)
      : i18n.t(messageId, values)
  )
</script>

<span data-testid="text">{translated}</span>
{#if showLocale}<span>locale:{i18n.locale}</span>{/if}
{#if showLocales}<span>locales:{i18n.getLocales().join(',')}</span>{/if}
