<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
const localeHead = useLocaleHead({
  addSeoAttributes: true,
  baseUrl: 'https://example.com',
})

useHead(localeHead.value)
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

    <!-- SEO data exposed for testing -->
    <div data-testid="html-lang" style="display:none">{{ localeHead.htmlAttrs.lang }}</div>
    <template v-for="link in localeHead.link" :key="link.hreflang">
      <div :data-testid="`hreflang-${link.hreflang}`" style="display:none">{{ link.href }}</div>
    </template>

    <NuxtPage />
  </div>
</template>
