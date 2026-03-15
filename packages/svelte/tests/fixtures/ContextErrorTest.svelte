<script lang="ts">
  import { getI18n } from '../../src/index.js'

  // This should throw because no parent called setI18nContext
  const i18n = getI18n()
</script>

<span>{i18n.locale}</span>
