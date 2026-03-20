<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t } = useI18n()

// Opt-in to the locale redirect middleware on this page only
definePageMeta({
  middleware: ['fluenti-locale-redirect'],
})
</script>

<template>
  <div data-testid="page-about">
    <h1 data-testid="page-title">{{ t('about.title') }}</h1>
  </div>
</template>
