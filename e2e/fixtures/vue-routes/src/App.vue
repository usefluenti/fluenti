<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@fluenti/vue'
import {
  useLocalePath,
  useSwitchLocalePath,
  useLocaleHead,
} from '@fluenti/nuxt/client'
import type { FluentNuxtRuntimeConfig } from '@fluenti/nuxt/client'
import { RUNTIME_CONFIG_KEY } from './main'

const { t, locale, setLocale } = useI18n()
const route = useRoute()
const router = useRouter()
const config = inject(RUNTIME_CONFIG_KEY)!

// Create composable instances
const getLocalePath = useLocalePath(locale, config)
const currentPath = computed(() => route.path)
const getSwitchLocalePath = useSwitchLocalePath(currentPath, config)
const localeHead = useLocaleHead(locale, currentPath, config, {
  addSeoAttributes: true,
  baseUrl: 'https://example.com',
})

async function switchToLocale(loc: string) {
  const newPath = getSwitchLocalePath(loc)
  await setLocale(loc)
  router.push(newPath)
}
</script>

<template>
  <div id="routes-app">
    <header>
      <h1 data-testid="app-title">Fluenti Routing Demo</h1>
      <div class="locale-switcher">
        <button
          v-for="loc in config.locales"
          :key="loc"
          :data-testid="`lang-${loc}`"
          :class="{ active: locale === loc }"
          @click="switchToLocale(loc)"
        >{{ loc.toUpperCase() }}</button>
      </div>
      <p data-testid="current-locale">Locale: {{ locale }}</p>
      <p data-testid="current-path">Path: {{ route.path }}</p>
    </header>

    <nav>
      <router-link :to="getLocalePath('/')" data-testid="nav-home">{{ t('nav.home') }}</router-link>
      <router-link :to="getLocalePath('/about')" data-testid="nav-about">{{ t('nav.about') }}</router-link>
      <router-link :to="getLocalePath('/contact')" data-testid="nav-contact">{{ t('nav.contact') }}</router-link>
    </nav>

    <!-- Switch locale path display -->
    <section data-testid="switch-paths">
      <h2>Switch Locale Paths</h2>
      <ul>
        <li v-for="loc in config.locales" :key="loc" :data-testid="`switch-${loc}`">
          {{ loc }}: {{ getSwitchLocalePath(loc) }}
        </li>
      </ul>
    </section>

    <!-- Locale head SEO data -->
    <section data-testid="seo-section">
      <h2>SEO Head Data</h2>
      <p data-testid="html-lang">html lang: {{ localeHead.htmlAttrs.lang }}</p>
      <ul data-testid="hreflang-list">
        <li v-for="link in localeHead.link" :key="link.hreflang" :data-testid="`hreflang-${link.hreflang}`">
          {{ link.hreflang }}: {{ link.href }}
        </li>
      </ul>
      <p data-testid="og-locale">og:locale: {{ localeHead.meta.find(m => m.property === 'og:locale')?.content }}</p>
    </section>

    <main>
      <router-view />
    </main>
  </div>
</template>

<style>
body { font-family: sans-serif; margin: 20px; }
header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
.locale-switcher { display: flex; gap: 4px; }
button { padding: 4px 12px; cursor: pointer; }
button.active { background: #4CAF50; color: white; }
nav { display: flex; gap: 12px; margin-bottom: 16px; padding: 8px; background: #f0f0f0; border-radius: 4px; }
nav a { text-decoration: none; color: #333; }
nav a.router-link-exact-active { font-weight: bold; color: #4CAF50; }
section { margin-bottom: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
h2 { margin: 0 0 8px; font-size: 1rem; }
main { padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
</style>
