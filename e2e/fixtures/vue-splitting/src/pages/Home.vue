<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t } = useI18n()
</script>

<template>
  <div data-testid="home-page">
    <h1 data-testid="welcome">{{ t('Welcome to Fluenti') }}</h1>
    <p data-testid="home-desc">{{ t('This is the home page.') }}</p>
    <p data-testid="greeting">{{ t('Hello, {name}!', { name: 'World' }) }}</p>
  </div>
</template>
