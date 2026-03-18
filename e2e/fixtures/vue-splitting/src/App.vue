<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { t, locale, setLocale, isLoading, preloadLocale } = useI18n()
</script>

<template>
  <div id="splitting-app">
    <nav>
      <router-link to="/" data-testid="nav-home">{{ t('Home') }}</router-link>
      <router-link to="/about" data-testid="nav-about">{{ t('About') }}</router-link>
    </nav>

    <div class="locale-switcher">
      <button
        data-testid="lang-en"
        :class="{ active: locale === 'en' }"
        @mouseenter="preloadLocale('en')"
        @click="setLocale('en')"
      >English</button>
      <button
        data-testid="lang-ja"
        :class="{ active: locale === 'ja' }"
        @mouseenter="preloadLocale('ja')"
        @click="setLocale('ja')"
      >日本語</button>
    </div>

    <p v-if="isLoading" data-testid="loading">Loading...</p>

    <router-view />
  </div>
</template>
