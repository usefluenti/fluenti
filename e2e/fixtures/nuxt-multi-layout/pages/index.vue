<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
</script>

<template>
  <div data-testid="page-home">
    <h1 data-testid="page-title">{{ t('home.title') }}</h1>
    <NuxtLink to="/admin" data-testid="link-admin">Admin</NuxtLink>
  </div>
</template>
