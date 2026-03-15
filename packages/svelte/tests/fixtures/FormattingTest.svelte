<script lang="ts">
  import { setI18nContext } from '../../src/index.js'
  import type { Messages } from '@fluenti/core'

  interface Props {
    locale: string
    messages: Record<string, Messages>
    testType: 'date' | 'number' | 'format'
  }

  let { locale, messages, testType }: Props = $props()

  const i18n = setI18nContext({ locale, messages })

  let result = $derived.by(() => {
    if (testType === 'date') return i18n.d(new Date(2024, 0, 15))
    if (testType === 'number') return i18n.n(1234.56)
    if (testType === 'format') return i18n.format('Hello {name}', { name: 'Alice' })
    return ''
  })
</script>

<span>{result}</span>
