<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t } = useI18n()

// No middleware — unprefixed access should NOT redirect
</script>

<template>
  <div data-testid="page-no-middleware">
    <h1 data-testid="page-title">{{ t('no-middleware.title') }}</h1>
  </div>
</template>
