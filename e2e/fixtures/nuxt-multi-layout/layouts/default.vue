<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
const { locale } = useI18n()
</script>

<template>
  <div data-testid="layout-default">
    <header data-testid="default-header">
      <span data-testid="current-locale">{{ locale }}</span>
      <span data-testid="layout-name">default</span>
    </header>
    <slot />
  </div>
</template>
