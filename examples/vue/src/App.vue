<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@fluenti/vue'
import { msg } from '@fluenti/core'

const { locale, setLocale, getLocales, isLoading, preloadLocale, t, format, d, n } = useI18n()

const locales = computed(() => getLocales())

const localeLabels: Record<string, string> = {
  en: 'English',
  'zh-CN': '中文',
  ja: '日本語',
}

// Home — server template
const serverTemplate = ref('{user} just {action}')

// VtDirectiveShowcase — plural counter
const count = ref(3)
const vtPluralForms = computed(() => {
  const loc = locale.value
  if (loc === 'zh-CN') return { zero: '没有苹果', one: '1 个苹果', other: '# 个苹果' }
  if (loc === 'ja') return { zero: 'りんごなし', one: 'りんご 1 個', other: 'りんご # 個' }
  return { zero: 'No apples', one: '1 apple', other: '# apples' }
})

// ScriptFeatures
const userName = ref('World')
const itemCount = ref(3)
const ROLES = {
  admin: msg`Administrator`,
  user: msg`Regular User`,
}
const pluralIcu = '{n, plural, one {# item} other {# items}}'
const cartMessage = computed(() =>
  t('You have {count} items in your cart.', { count: itemCount.value }),
)

// Plurals
const appleCount = ref(0)
const messageCount = ref(1)
const fileCount = ref(5)

// FormattingShowcase
const now = Date.now()
const pastDate = new Date(Date.now() - 86400000 * 3)
const gender = ref('female')
</script>

<template>
  <div class="app">
    <header>
      <div class="header-top">
        <h1 v-t>Fluenti Vue Playground</h1>
        <div class="lang-buttons">
          <button
            v-for="loc in locales"
            :key="loc"
            :class="{ active: loc === locale }"
            @click="setLocale(loc)"
            @mouseenter="preloadLocale(loc)"
          >
            {{ localeLabels[loc] || loc }}
          </button>
        </div>
      </div>
      <p class="tagline" v-t>Write text. Fluenti translates it. Zero config.</p>
      <div v-if="isLoading" class="loading-indicator" v-t>Loading translations...</div>
    </header>

    <main>
      <!-- ═══════════════════════════════════════════ -->
      <!-- Home — Welcome & Basic APIs                -->
      <!-- ═══════════════════════════════════════════ -->
      <h2 v-t>Welcome to Fluenti</h2>
      <p v-t>A modern i18n library for Vue 3</p>
      <p v-t>Fluenti provides reactive translations, rich text support, and plural handling out of the box.</p>

      <div class="section">
        <h2>t() — Catalog Translations</h2>
        <div class="demo-item">
          <div class="demo-label">t('Hello, {name}!', { name: 'World' })</div>
          <div>{{ t('Hello, {name}!', { name: 'World' }) }}</div>
        </div>
        <div class="demo-item">
          <div class="demo-label">t('Current locale: {locale}', { locale })</div>
          <div>{{ t('Current locale: {locale}', { locale: locale }) }}</div>
        </div>
        <div class="demo-item">
          <div class="demo-label">t('You have {count} items in your cart.', { count: 5 })</div>
          <div>{{ t('You have {count} items in your cart.', { count: 5 }) }}</div>
        </div>
      </div>

      <div class="section">
        <h2>format() — Direct ICU Formatting</h2>
        <p class="section-desc">Use <code>format()</code> for dynamic patterns not in the catalog — e.g. server-provided templates or user-generated content.</p>
        <div class="demo-item">
          <div class="demo-label">Server-provided template</div>
          <div>{{ format(serverTemplate, { user: 'Alice', action: 'logged in' }) }}</div>
        </div>
      </div>

      <div class="section">
        <h2>d() — Date Formatting</h2>
        <div class="demo-item">
          <div class="demo-label">d(Date.now())</div>
          <div>{{ d(Date.now()) }}</div>
        </div>
      </div>

      <div class="section">
        <h2>n() — Number Formatting</h2>
        <div class="demo-item">
          <div class="demo-label">n(1234567.89)</div>
          <div>{{ n(1234567.89) }}</div>
        </div>
        <div class="demo-item">
          <div class="demo-label">n(0.42)</div>
          <div>{{ n(0.42) }}</div>
        </div>
      </div>

      <div class="section">
        <h2 v-t>Features</h2>
        <ul>
          <li v-t>Reactive locale switching</li>
          <li v-t>Rich text with Vue components</li>
          <li v-t>Built-in plural support</li>
          <li v-t>Type-safe message catalogs</li>
        </ul>
      </div>

      <hr class="section-divider" />

      <!-- ═══════════════════════════════════════════ -->
      <!-- v-t Directive Showcase                     -->
      <!-- ═══════════════════════════════════════════ -->
      <div class="section">
        <h2 v-t>v-t Directive — Zero Config i18n</h2>
        <p class="section-desc" v-t>
          Just write text. Fluenti extracts and translates it at build time. No keys, no imports, no boilerplate.
        </p>

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

        <div class="demo-item">
          <div class="demo-label">v-t.plural — interactive counter</div>
          <div class="controls">
            <button @click="count = Math.max(0, count - 1)">−</button>
            <span class="counter-display">{{ count }}</span>
            <button @click="count++">+</button>
          </div>
          <Plural
            :value="count"
            v-bind="vtPluralForms"
          />
        </div>

        <div class="demo-item">
          <div class="demo-label">v-t with &lt;a&gt; child (rich text)</div>
          <p v-t>Read the <a href="/terms">terms of service</a> before continuing</p>
        </div>

        <div class="demo-item">
          <div class="demo-label">v-t with &lt;strong&gt; child</div>
          <p v-t>This is <strong>very important</strong> information</p>
        </div>

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
      </div>

      <hr class="section-divider" />

      <!-- ═══════════════════════════════════════════ -->
      <!-- Rich Text Demos                            -->
      <!-- ═══════════════════════════════════════════ -->
      <h2 v-t>Rich Text Demos</h2>

      <div class="section">
        <h2>&lt;Trans&gt; — Rich Text with Components</h2>

        <div class="demo-item">
          <div class="demo-label">Link example (external &lt;a&gt;)</div>
          <Trans>Visit our <a href="https://github.com" target="_blank">documentation</a> to learn more.</Trans>
        </div>

        <div class="demo-item">
          <div class="demo-label">Bold example (&lt;strong&gt;)</div>
          <Trans>This is <strong>important</strong> information.</Trans>
        </div>

        <div class="demo-item">
          <div class="demo-label">Combined: link + bold</div>
          <Trans>Please <a href="#" @click.prevent>sign in</a> or <strong>register</strong> to continue.</Trans>
        </div>

        <div class="demo-item">
          <div class="demo-label">With internal links</div>
          <Trans>Go to the <a href="#" @click.prevent>home page</a> or check out <a href="#" @click.prevent>plurals</a>.</Trans>
        </div>

        <div class="demo-item">
          <div class="demo-label">Styled link</div>
          <Trans>Read the <a href="#" class="styled-link" @click.prevent>getting started guide</a> for setup instructions.</Trans>
        </div>
      </div>

      <hr class="section-divider" />

      <!-- ═══════════════════════════════════════════ -->
      <!-- Script Features — t() / format() / msg``   -->
      <!-- ═══════════════════════════════════════════ -->
      <div class="section">
        <h2>Script Features — t() / format() / msg``</h2>

        <div class="demo-item">
          <div class="demo-label">t('Hello, {name}!', { name })</div>
          <div>{{ t('Hello, {name}!', { name: userName }) }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">t('You have {count} items.', { count })</div>
          <div>{{ t('You have {count} items.', { count: itemCount }) }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">t('Current locale: {locale}', { locale })</div>
          <div>{{ t('Current locale: {locale}', { locale: locale }) }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">format('{count} items at {price} each', ...)</div>
          <div>{{ format('{count} items at {price} each', { count: 3, price: '$9.99' }) }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">format(pluralIcu, { n: itemCount })</div>
          <div>{{ format(pluralIcu, { n: itemCount }) }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">msg`` — lazy messages from constants</div>
          <div>Admin: {{ t(ROLES.admin) }} / User: {{ t(ROLES.user) }}</div>
        </div>

        <div class="demo-item">
          <label>
            Name: <input v-model="userName" class="demo-input" />
          </label>
          <div style="margin-top: 4px">{{ t('Hello, {name}!', { name: userName }) }}</div>
        </div>

        <div class="demo-item">
          <div class="controls">
            <button @click="itemCount = Math.max(0, itemCount - 1)">−</button>
            <span class="counter-display">{{ itemCount }}</span>
            <button @click="itemCount++">+</button>
          </div>
          <div>{{ cartMessage }}</div>
        </div>
      </div>

      <hr class="section-divider" />

      <!-- ═══════════════════════════════════════════ -->
      <!-- Plural Demos                               -->
      <!-- ═══════════════════════════════════════════ -->
      <h2 v-t>Plural Demos</h2>

      <div class="section">
        <h2>&lt;Plural&gt; — Apples</h2>
        <div class="controls">
          <button @click="appleCount = Math.max(0, appleCount - 1)" v-t>Remove</button>
          <span class="counter-display">{{ appleCount }}</span>
          <button @click="appleCount++" v-t>Add</button>
          <button @click="appleCount = 0" v-t>Reset</button>
        </div>
        <div class="demo-item">
          <div class="demo-label">&lt;Plural :value="appleCount" zero/one/other&gt;</div>
          <Plural
            :value="appleCount"
            zero="No apples"
            one="1 apple"
            other="# apples"
          />
        </div>
      </div>

      <div class="section">
        <h2>&lt;Plural&gt; — Messages</h2>
        <div class="controls">
          <button @click="messageCount = Math.max(0, messageCount - 1)" v-t>Remove</button>
          <span class="counter-display">{{ messageCount }}</span>
          <button @click="messageCount++" v-t>Add</button>
          <button @click="messageCount = 0" v-t>Reset</button>
        </div>
        <div class="demo-item">
          <div class="demo-label">&lt;Plural :value="messageCount" zero/one/other&gt;</div>
          <Plural
            :value="messageCount"
            zero="No new messages"
            one="1 new message"
            other="# new messages"
          />
        </div>
      </div>

      <div class="section">
        <h2>&lt;Plural&gt; — Files</h2>
        <div class="controls">
          <button @click="fileCount = Math.max(0, fileCount - 1)" v-t>Remove</button>
          <span class="counter-display">{{ fileCount }}</span>
          <button @click="fileCount++" v-t>Add</button>
          <button @click="fileCount = 0" v-t>Reset</button>
        </div>
        <div class="demo-item">
          <div class="demo-label">&lt;Plural :value="fileCount" zero/one/other&gt;</div>
          <Plural
            :value="fileCount"
            zero="No files selected"
            one="1 file selected"
            other="# files selected"
          />
        </div>
      </div>

      <hr class="section-divider" />

      <!-- ═══════════════════════════════════════════ -->
      <!-- Formatting Showcase — d() / n() / Select   -->
      <!-- ═══════════════════════════════════════════ -->
      <div class="section">
        <h2>Feature: $d() Date Formatting</h2>

        <div class="demo-item">
          <div class="demo-label">$d(date) — default</div>
          <div>{{ d(now) }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">$d(date, 'short')</div>
          <div>{{ d(now, 'short') }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">$d(date, 'long')</div>
          <div>{{ d(now, 'long') }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">$d(date, 'relative') — past date</div>
          <div>{{ d(pastDate, 'relative') }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">$d(date, 'datetime')</div>
          <div>{{ d(now, 'datetime') }}</div>
        </div>
      </div>

      <div class="section">
        <h2>Feature: $n() Number Formatting</h2>

        <div class="demo-item">
          <div class="demo-label">$n(1234567.89) — default</div>
          <div>{{ n(1234567.89) }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">$n(42.5, 'currency')</div>
          <div>{{ n(42.5, 'currency') }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">$n(0.856, 'percent')</div>
          <div>{{ n(0.856, 'percent') }}</div>
        </div>

        <div class="demo-item">
          <div class="demo-label">$n(1234.5, 'decimal')</div>
          <div>{{ n(1234.5, 'decimal') }}</div>
        </div>
      </div>

      <div class="section">
        <h2>Feature: &lt;Select&gt; Component</h2>

        <div class="controls">
          <button
            v-for="g in ['male', 'female', 'other']"
            :key="g"
            :class="{ active: gender === g }"
            @click="gender = g"
          >
            {{ g }}
          </button>
        </div>

        <div class="demo-item">
          <div class="demo-label">&lt;Select :value :options&gt; (type-safe)</div>
          <Select
            :value="gender"
            :options="{ male: t('He liked this'), female: t('She liked this') }"
            :other="t('They liked this')"
          />
        </div>
      </div>

      <div class="section">
        <h2>Feature: v-t Attribute Modifiers</h2>

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
    </main>

    <footer>
      <p v-t>Built with Fluenti and Vue 3</p>
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
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
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

button {
  padding: 6px 14px;
  border: 1px solid #42b883;
  background: #fff;
  color: #42b883;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

button:hover {
  background: #42b883;
  color: #fff;
}

button.active {
  background: #42b883;
  color: #fff;
}

header .lang-buttons button {
  border-color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.15);
  color: #fff;
}

header .lang-buttons button.active {
  background: #fff;
  color: #42b883;
}

main {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

.section-divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 24px 0;
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
  border-bottom: 2px solid #42b883;
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

.section-desc {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 12px;
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

ul {
  padding-left: 20px;
}

li {
  padding: 4px 0;
}

.demo-img {
  width: 120px;
  height: 40px;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 4px;
  display: inline-block;
}

.demo-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 220px;
}

.demo-abbr {
  cursor: help;
  text-decoration: underline dotted;
  font-size: 1.1rem;
}

a {
  color: #42b883;
  text-decoration: underline;
}

strong {
  color: #e74c3c;
}

.styled-link {
  color: #3498db;
  font-weight: bold;
  text-decoration: none;
  border-bottom: 2px dashed #3498db;
}
</style>
