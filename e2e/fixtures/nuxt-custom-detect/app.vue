<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t, locale } = useI18n()
const route = useRoute()
</script>

<template>
  <div id="app">
    <div data-testid="current-locale">{{ locale }}</div>
    <div data-testid="current-path">{{ route.path }}</div>

    <NuxtPage />
  </div>
</template>
