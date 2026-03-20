<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
const { locale } = useI18n()
</script>

<template>
  <div data-testid="layout-admin">
    <header data-testid="admin-header">
      <span data-testid="current-locale">{{ locale }}</span>
      <span data-testid="layout-name">admin</span>
    </header>
    <slot />
  </div>
</template>
