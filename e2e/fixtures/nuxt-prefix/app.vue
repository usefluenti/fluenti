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
        <!-- NuxtLinkLocale with explicit locale prop override -->
        <NuxtLinkLocale to="/about" locale="ja" data-testid="link-about-ja">{{ t('nav.about') }} (JA)</NuxtLinkLocale>
        <NuxtLinkLocale to="/about" locale="zh" data-testid="link-about-zh">{{ t('nav.about') }} (ZH)</NuxtLinkLocale>
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

    <NuxtPage />
  </div>
</template>
