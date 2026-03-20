<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { locale } = useI18n()
</script>

<template>
  <div id="app">
    <div data-testid="current-locale">{{ locale }}</div>
    <NuxtPage />
  </div>
</template>
