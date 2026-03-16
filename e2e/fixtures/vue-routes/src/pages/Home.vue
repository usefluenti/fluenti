<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
</script>

<template>
  <div data-testid="page-home">
    <h2 data-testid="page-title">{{ t('home.title') }}</h2>
    <p data-testid="page-description">{{ t('home.description') }}</p>
  </div>
</template>
