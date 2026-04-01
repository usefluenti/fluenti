<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
import { getDirection } from '@fluenti/core'
import { useHead } from '#imports'
import { watch, onMounted } from 'vue'

const { locale, setLocale, getLocales, isLoading, preloadLocale } = useI18n()

const locales = getLocales()

const localeLabels: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  ar: 'العربية',
}

function updateDirection(loc: string) {
  if (import.meta.client) {
    document.documentElement.dir = getDirection(loc)
    document.documentElement.lang = loc
  }
}

onMounted(() => {
  updateDirection(locale.value)
})

watch(locale, (newLocale) => {
  updateDirection(newLocale)
})

function switchLocale(loc: string) {
  // Set a cookie so the server can detect locale on next request
  if (import.meta.client) {
    document.cookie = `fluenti_locale=${loc};path=/;max-age=31536000`

    const url = new URL(window.location.href)
    if (loc === 'en') {
      url.searchParams.delete('locale')
    } else {
      url.searchParams.set('locale', loc)
    }
    window.history.replaceState(window.history.state, '', url)
  }
  setLocale(loc)
}

// Inject SSR locale script into <head> for client-side hydration
if (import.meta.server) {
  useHead({
    script: [{ innerHTML: `window.__FLUENTI_LOCALE__=${JSON.stringify(locale.value)}` }],
  })
}
</script>

<template>
  <div class="app">

    <header>
      <div class="header-top">
        <h1 v-t>Fluenti Nuxt Playground</h1>
        <div class="lang-buttons">
          <button
            v-for="loc in locales"
            :key="loc"
            :class="{ active: loc === locale }"
            @click="switchLocale(loc)"
            @mouseenter="preloadLocale(loc)"
          >
            {{ localeLabels[loc] || loc }}
          </button>
        </div>
      </div>
      <p class="tagline" v-t>Server-rendered i18n with Nuxt 3 and Fluenti.</p>
      <div v-if="isLoading" class="loading-indicator" v-t>Loading translations...</div>
    </header>

    <nav class="nav-links">
      <a href="/" v-t>Home</a>
      <a href="/rich-text" v-t>Rich Text</a>
      <a href="/plurals" v-t>Plurals</a>
    </nav>

    <main>
      <NuxtPage />
    </main>

    <footer>
      <p v-t>Built with Fluenti and Nuxt 3</p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  background: linear-gradient(135deg, #00dc82 0%, #1e293b 100%);
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 0;
  color: #fff;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

header h1 {
  font-size: 1.5rem;
}

.tagline {
  margin-top: 8px;
  opacity: 0.9;
  font-size: 0.95rem;
}

.loading-indicator {
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
  font-size: 0.85rem;
  display: inline-block;
}

.lang-buttons {
  display: flex;
  gap: 6px;
}

.nav-links {
  display: flex;
  gap: 0;
  background: #1e293b;
  border-radius: 0 0 8px 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.nav-links a {
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  padding: 10px 20px;
  font-size: 0.9rem;
  transition: background 0.15s;
}

.nav-links a:hover,
.nav-links a.router-link-exact-active {
  background: rgba(0,220,130,0.3);
  color: #fff;
}

button {
  padding: 6px 14px;
  border: 1px solid #00dc82;
  background: #fff;
  color: #00dc82;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

button:hover {
  background: #00dc82;
  color: #fff;
}

button.active {
  background: #00dc82;
  color: #fff;
}

header .lang-buttons button {
  border-color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.15);
  color: #fff;
}

header .lang-buttons button.active {
  background: #fff;
  color: #00dc82;
}

main {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

footer {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 0.85rem;
}

.section {
  margin-bottom: 24px;
}

.section h2 {
  font-size: 1.2rem;
  color: #2c3e50;
  margin-bottom: 12px;
  border-bottom: 2px solid #00dc82;
  padding-bottom: 4px;
}

.demo-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.demo-item:last-child {
  border-bottom: none;
}

.demo-label {
  font-size: 0.8rem;
  color: #999;
  font-family: monospace;
}

.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 12px 0;
}

.counter-display {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
  min-width: 40px;
  text-align: center;
}
</style>
