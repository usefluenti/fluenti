<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
</script>

<template>
  <div data-testid="page-about">
    <h2 data-testid="page-title">{{ t('about.title') }}</h2>
    <p data-testid="page-description">{{ t('about.description') }}</p>
  </div>
</template>
