<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
</script>

<template>
  <div id="app">
    <header>
      <nav>
        <NuxtLinkLocale to="/" data-testid="nav-home">{{ t('nav.home') }}</NuxtLinkLocale>
        <NuxtLinkLocale to="/about" data-testid="nav-about">{{ t('nav.about') }}</NuxtLinkLocale>
      </nav>
      <div class="locale-switcher">
        <NuxtLink
          v-for="loc in ['en', 'ja', 'zh']"
          :key="loc"
          :to="switchLocalePath(loc)"
          :data-testid="`lang-${loc}`"
        >{{ loc.toUpperCase() }}</NuxtLink>
      </div>
    </header>

    <div data-testid="current-locale">{{ locale }}</div>
    <div data-testid="current-path">{{ route.path }}</div>
    <div data-testid="render-mode">SPA</div>

    <NuxtPage />
  </div>
</template>
