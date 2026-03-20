<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { locale } = useI18n()
const route = useRoute()
</script>

<template>
  <div id="app">
    <div data-testid="current-locale">{{ locale }}</div>
    <div data-testid="current-path">{{ route.path }}</div>
    <!-- Test that third-party $t is preserved (fluenti does NOT inject $t) -->
    <div data-testid="third-party-t">{{ $t('test.key') }}</div>
    <div data-testid="third-party-localepath">{{ $localePath('/test') }}</div>

    <NuxtPage />
  </div>
</template>
