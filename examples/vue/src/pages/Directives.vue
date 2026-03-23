<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const { locale } = useI18n()
</script>

<template>
  <h2 v-t>v-t Directive — Zero Config i18n</h2>
  <p class="section-desc" v-t>
    Just write text. Fluenti extracts and translates it at build time. No keys, no imports, no boilerplate.
  </p>

  <div class="section">
    <h2>v-t — Plain Text & Variables</h2>

    <div class="demo-item">
      <div class="demo-label">v-t plain text</div>
      <p v-t>Welcome to Fluenti</p>
    </div>

    <div class="demo-item">
      <div class="demo-label">v-t with variable</div>
      <p v-t>Hello {{ locale }}, welcome back!</p>
    </div>

    <div class="demo-item">
      <div class="demo-label">v-t:explicit.id</div>
      <p v-t:nav.home>Home</p>
    </div>
  </div>

  <hr class="section-divider" />

  <div class="section">
    <h2>Feature: v-t Attribute Modifiers</h2>

    <div class="demo-item">
      <div class="demo-label">v-t.alt on &lt;img&gt;</div>
      <img v-t.alt src="https://invalid.test/broken.png" alt="Welcome banner image" class="demo-img" />
    </div>

    <div class="demo-item">
      <div class="demo-label">v-t.placeholder on &lt;input&gt;</div>
      <input v-t.placeholder placeholder="Search products..." class="demo-input" />
    </div>

    <div class="demo-item">
      <div class="demo-label">v-t.title on &lt;abbr&gt;</div>
      <abbr v-t.title title="Hypertext Markup Language" class="demo-abbr">HTML</abbr>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;img v-t.alt alt="Welcome banner" /&gt;</div>
      <img v-t.alt alt="Welcome banner image" src="https://invalid.test/broken.png" style="width: 100px; height: 40px; background: #eee; display: inline-block" />
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;input v-t.placeholder placeholder="Search..." /&gt;</div>
      <input v-t.placeholder placeholder="Search products..." style="padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px" />
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;abbr v-t.title title="HTML"&gt;HTML&lt;/abbr&gt;</div>
      <abbr v-t.title title="Hypertext Markup Language" style="cursor: help; text-decoration: underline dotted">HTML</abbr>
    </div>
  </div>
</template>
