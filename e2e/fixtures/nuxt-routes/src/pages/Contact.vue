<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
</script>

<template>
  <div data-testid="page-contact">
    <h2 data-testid="page-title">{{ t('contact.title') }}</h2>
    <p data-testid="page-description">{{ t('contact.description') }}</p>
  </div>
</template>
