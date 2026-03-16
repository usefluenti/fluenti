<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
</script>

<template>
  <div data-testid="page-about">
    <h1 data-testid="page-title">{{ t('about.title') }}</h1>
    <p data-testid="page-description">{{ t('about.description') }}</p>
  </div>
</template>
