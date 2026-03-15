<script lang="ts">
  import { setI18nContext, getI18n, Plural, Select, DateTime, Number as NumberFmt } from '@fluenti/svelte'
  import { msg } from '@fluenti/core'
  import en from './locales/compiled/en'
  import zhCN from './locales/compiled/zh-CN'
  import ja from './locales/compiled/ja'

  const i18n = setI18nContext({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en, 'zh-CN': zhCN, ja },
  })

  const localeLabels: Record<string, string> = {
    en: 'English',
    'zh-CN': '中文',
    ja: '日本語',
  }

  // Plural counters
  let appleCount = $state(0)
  let cartCount = $state(0)

  // Select gender
  let gender = $state('female')

  // Reactivity counter
  let reactivityCount = $state(0)

  // msg`` lazy messages
  const ROLES = {
    admin: msg`Administrator`,
    user: msg`Regular User`,
  }

  const now = Date.now()
</script>

<div class="app">
  <header>
    <div class="header-top">
      <h1>{i18n.t('Fluenti Svelte Playground')}</h1>
      <div class="lang-buttons">
        {#each i18n.getLocales() as loc}
          <button
            class:active={loc === i18n.locale}
            onclick={() => i18n.setLocale(loc)}
          >
            {localeLabels[loc] || loc}
          </button>
        {/each}
      </div>
    </div>
    <p class="tagline">{i18n.t('Write text. Fluenti translates it. Zero config.')}</p>
    {#if i18n.isLoading}
      <div class="loading-indicator">{i18n.t('Loading translations...')}</div>
    {/if}
  </header>

  <main>
    <!-- ═══════════════════════════════════════════ -->
    <!-- Welcome & Basic APIs                       -->
    <!-- ═══════════════════════════════════════════ -->
    <h2>{i18n.t('Welcome to Fluenti')}</h2>
    <p>{i18n.t('A type-safe i18n library for Svelte 5')}</p>

    <div class="section">
      <h2>t() — Catalog Translations</h2>
      <div class="demo-item">
        <div class="demo-label">t('Hello, {'{name}'}!', {'{ name: \'World\' }'})</div>
        <div>{i18n.t('Hello, {name}!', { name: 'World' })}</div>
      </div>
      <div class="demo-item">
        <div class="demo-label">t('Current locale: {'{locale}'}', {'{ locale }'})</div>
        <div>{i18n.t('Current locale: {locale}', { locale: i18n.locale })}</div>
      </div>
      <div class="demo-item">
        <div class="demo-label">t('You have {'{count}'} items in your cart.', {'{ count: 5 }'})</div>
        <div>{i18n.t('You have {count} items in your cart.', { count: 5 })}</div>
      </div>
    </div>

    <div class="section">
      <h2>format() — Direct ICU Formatting</h2>
      <div class="demo-item">
        <div class="demo-label">format('{'{count}'} items at {'{price}'} each', ...)</div>
        <div>{i18n.format('{count} items at {price} each', { count: 3, price: '$9.99' })}</div>
      </div>
    </div>

    <div class="section">
      <h2>d() — Date Formatting</h2>
      <div class="demo-item">
        <div class="demo-label">d(Date.now())</div>
        <div>{i18n.d(now)}</div>
      </div>
    </div>

    <div class="section">
      <h2>n() — Number Formatting</h2>
      <div class="demo-item">
        <div class="demo-label">n(1234567.89)</div>
        <div>{i18n.n(1234567.89)}</div>
      </div>
      <div class="demo-item">
        <div class="demo-label">n(0.42)</div>
        <div>{i18n.n(0.42)}</div>
      </div>
    </div>

    <div class="section">
      <h2>{i18n.t('Features')}</h2>
      <ul>
        <li>{i18n.t('Reactive locale switching')}</li>
        <li>{i18n.t('Rich text with Svelte components')}</li>
        <li>{i18n.t('Built-in plural support')}</li>
        <li>{i18n.t('Type-safe message catalogs')}</li>
      </ul>
    </div>

    <hr class="section-divider" />

    <!-- ═══════════════════════════════════════════ -->
    <!-- Script Features — msg``                    -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="section">
      <h2>msg`` — Lazy Messages</h2>
      <div class="demo-item">
        <div class="demo-label">msg`` from constants</div>
        <div>Admin: {i18n.t(ROLES.admin)} / User: {i18n.t(ROLES.user)}</div>
      </div>
    </div>

    <hr class="section-divider" />

    <!-- ═══════════════════════════════════════════ -->
    <!-- Plural Demos                               -->
    <!-- ═══════════════════════════════════════════ -->
    <h2>Plural Component</h2>

    <div class="section">
      <h3>&lt;Plural&gt; — Apples</h3>
      <div class="controls">
        <button onclick={() => appleCount = Math.max(0, appleCount - 1)}>{i18n.t('Remove')}</button>
        <span class="counter-display">{appleCount}</span>
        <button onclick={() => appleCount++}>{i18n.t('Add')}</button>
        <button onclick={() => appleCount = 0}>{i18n.t('Reset')}</button>
      </div>
      <div class="demo-item">
        <Plural value={appleCount} zero="No apples" one="1 apple" other="# apples" />
      </div>
    </div>

    <div class="section">
      <h3>&lt;Plural&gt; — Cart Items</h3>
      <div class="controls">
        <button onclick={() => cartCount = Math.max(0, cartCount - 1)}>-</button>
        <span class="counter-display">{cartCount}</span>
        <button onclick={() => cartCount++}>+</button>
        <button onclick={() => cartCount = 0}>{i18n.t('Reset')}</button>
      </div>
      <div class="demo-item">
        <Plural
          value={cartCount}
          zero="Your cart is empty."
          one="You have # item in your cart."
          other="You have # items in your cart."
        />
      </div>
    </div>

    <hr class="section-divider" />

    <!-- ═══════════════════════════════════════════ -->
    <!-- Select Component                           -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="section">
      <h2>Select Component</h2>
      <div class="controls">
        {#each ['male', 'female', 'other'] as g}
          <button
            class:active={gender === g}
            onclick={() => gender = g}
          >
            {g}
          </button>
        {/each}
      </div>
      <div class="demo-item">
        <Select
          value={gender}
          options={{ male: i18n.t('He liked this'), female: i18n.t('She liked this') }}
          other={i18n.t('They liked this')}
        />
      </div>
    </div>

    <hr class="section-divider" />

    <!-- ═══════════════════════════════════════════ -->
    <!-- DateTime and Number Components             -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="section">
      <h2>&lt;DateTime&gt; Component</h2>
      <div class="demo-item">
        <div class="demo-label">&lt;DateTime value={'{now}'} /&gt;</div>
        <div><DateTime value={now} /></div>
      </div>
    </div>

    <div class="section">
      <h2>&lt;Number&gt; Component</h2>
      <div class="demo-item">
        <div class="demo-label">&lt;Number value={'{1234.56}'} /&gt;</div>
        <div><NumberFmt value={1234.56} /></div>
      </div>
    </div>

    <hr class="section-divider" />

    <!-- ═══════════════════════════════════════════ -->
    <!-- Reactivity Demo                            -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="section">
      <h2>Reactivity Demo</h2>
      <div class="demo-item">
        <p class="counter-text">{i18n.t('Counter value: {count}', { count: reactivityCount })}</p>
        <div class="controls">
          <button onclick={() => reactivityCount--}>{i18n.t('Decrement')}</button>
          <button onclick={() => reactivityCount++}>{i18n.t('Increment')}</button>
          <button onclick={() => reactivityCount = 0}>{i18n.t('Reset')}</button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- Input Placeholder                          -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="section">
      <h2>Attribute Translation</h2>
      <div class="demo-item">
        <input placeholder={i18n.t('Search products...')} class="demo-input" />
      </div>
    </div>
  </main>

  <footer>
    <p>{i18n.t('Built with Fluenti and Svelte 5')}</p>
  </footer>
</div>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  background: linear-gradient(135deg, #ff3e00 0%, #aa1100 100%);
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
  border: 1px solid #ff3e00;
  background: #fff;
  color: #ff3e00;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

button:hover {
  background: #ff3e00;
  color: #fff;
}

button.active {
  background: #ff3e00;
  color: #fff;
}

header .lang-buttons button {
  border-color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.15);
  color: #fff;
}

header .lang-buttons button.active {
  background: #fff;
  color: #ff3e00;
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
  border-bottom: 2px solid #ff3e00;
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

.counter-text {
  font-size: 1.2rem;
  margin-bottom: 8px;
}

ul {
  padding-left: 20px;
}

li {
  padding: 4px 0;
}

.demo-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 220px;
}

a {
  color: #ff3e00;
  text-decoration: underline;
}
</style>
