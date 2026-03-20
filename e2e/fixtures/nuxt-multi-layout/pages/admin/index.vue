<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

definePageMeta({ layout: 'admin' })

const { t } = useI18n()
</script>

<template>
  <div data-testid="page-admin">
    <h1 data-testid="admin-title">{{ t('admin.title') }}</h1>
    <NuxtLink to="/" data-testid="link-home">Home</NuxtLink>
  </div>
</template>
