<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t, locale, setLocale } = useI18n()
</script>

<template>
  <div data-testid="page-home">
    <h1 data-testid="page-title">{{ t('home.title') }}</h1>
    <p data-testid="page-description">{{ t('home.description') }}</p>

    <div data-testid="locale-switcher">
      <button data-testid="switch-en" @click="setLocale('en')">EN</button>
      <button data-testid="switch-ja" @click="setLocale('ja')">JA</button>
      <button data-testid="switch-zh" @click="setLocale('zh')">ZH</button>
    </div>

    <NuxtLink :to="`/${locale}/about`" data-testid="link-about">About</NuxtLink>
    <NuxtLink :to="`/${locale}/no-middleware`" data-testid="link-no-middleware">No MW</NuxtLink>
  </div>
</template>
