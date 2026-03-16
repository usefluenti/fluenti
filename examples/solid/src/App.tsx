import { createSignal, type Component, type JSX } from 'solid-js'
import { createI18n, useI18n, Trans, Plural, Select } from '@fluenti/solid'
import en from './locales/compiled/en'
import zhCN from './locales/compiled/zh-CN'
import ja from './locales/compiled/ja'

createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
  },
})

const Bold: Component<{ children?: JSX.Element }> = (props) => (
  <strong style={{ color: '#2c3e50' }}>{props.children}</strong>
)

const Italic: Component<{ children?: JSX.Element }> = (props) => (
  <em style={{ color: '#8e44ad' }}>{props.children}</em>
)

const Link: Component<{ children?: JSX.Element }> = (props) => (
  <a href="#" style={{ color: '#3498db', 'text-decoration': 'underline' }}>{props.children}</a>
)

const richComponents = { bold: Bold, italic: Italic, link: Link }

const LanguageSwitcher: Component = () => {
  const { locale, setLocale, isLoading, preloadLocale } = useI18n()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh-CN', label: '中文' },
    { code: 'ja', label: '日本語' },
  ] as const

  return (
    <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
      {languages.map((lang) => (
        <button
          onClick={() => setLocale(lang.code)}
          onMouseEnter={() => preloadLocale(lang.code)}
          style={{
            'font-weight': locale() === lang.code ? 'bold' : 'normal',
            'background': locale() === lang.code ? '#4a90d9' : '#e0e0e0',
            'color': locale() === lang.code ? 'white' : '#333',
            'border': 'none',
            'padding': '6px 12px',
            'border-radius': '4px',
            'cursor': 'pointer',
          }}
        >
          {lang.label}
        </button>
      ))}
      {isLoading() && <span style={{ color: '#999', 'font-size': '0.85rem' }}>Loading...</span>}
    </div>
  )
}

export const App: Component = () => {
  const { d, n, format, locale } = useI18n()
  const [name, setName] = createSignal('Developer')
  const [compileCount, setCompileCount] = createSignal(3)
  const [price, setPrice] = createSignal(29.99)
  const [pluralCount, setPluralCount] = createSignal(0)
  const [reactivityCount, setReactivityCount] = createSignal(0)
  const [gender, setGender] = createSignal('female')
  const formattedPrice = () => '$' + price()
  const developer = 'Developer'

  const now = Date.now()
  const pastDate = new Date(Date.now() - 86400000 * 3)

  console.log('[Reactivity] Component body executed — this should appear only once!')

  const cardStyle = {
    background: 'white',
    padding: '16px',
    'border-radius': '8px',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
  }

  const demoItemStyle = {
    'margin-bottom': '12px',
  }

  const demoLabelStyle = {
    'font-size': '0.85rem',
    color: '#999',
    'font-family': 'monospace',
    'margin-bottom': '4px',
  }

  return (
    <div style={{
      'max-width': '800px',
      'margin': '0 auto',
      'padding': '24px',
    }}>
      <header style={{
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '24px',
        'padding-bottom': '16px',
        'border-bottom': '1px solid #ddd',
      }}>
        <LanguageSwitcher />
      </header>
      <main style={{ 'display': 'flex', 'flex-direction': 'column', 'gap': '32px' }}>

        {/* ── Home ── */}
        <div>
          <h1>{t`Welcome to Fluenti`}</h1>
          <p style={{ color: '#666', 'margin-bottom': '16px' }}>{t`A type-safe i18n library for Solid`}</p>

          <section style={{ 'margin-bottom': '24px' }}>
            <h2>{t`Hello, ${developer}!`}</h2>
            <p>{t`This playground demonstrates the features of @fluenti/solid.`}</p>
            <p style={{ 'margin-top': '8px', 'font-style': 'italic' }}>
              {t`Current locale: ${locale()}`}
            </p>
          </section>

          <section style={cardStyle}>
            <h3 style={{ 'margin-bottom': '12px' }}>{t`Username`}</h3>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <label>
                {t`Username`}
                <input type="text" placeholder={t`Username`} style={{ 'margin-left': '8px' }} />
              </label>
              <label>
                {t`Email`}
                <input type="email" placeholder={t`Email`} style={{ 'margin-left': '8px' }} />
              </label>
              <label>
                {t`Password`}
                <input type="password" placeholder={t`Password`} style={{ 'margin-left': '8px' }} />
              </label>
              <small style={{ color: '#999' }}>{t`This field is required`}</small>
              <div style={{ display: 'flex', gap: '8px', 'margin-top': '8px' }}>
                <button>{t`Submit`}</button>
                <button>{t`Cancel`}</button>
              </div>
            </div>
          </section>
        </div>

        <hr style={{ border: 'none', 'border-top': '1px solid #ddd' }} />

        {/* ── Compile-Time Transforms ── */}
        <div>
          <h1>{t`Compile-Time Transforms`}</h1>
          <p style={{ color: '#666', 'margin-bottom': '16px' }}>
            {t`These demos showcase compile-time features: function calls and tagged templates — all transformed at build time by the Vite plugin.`}
          </p>

          <section style={{ ...cardStyle, 'margin-bottom': '16px' }}>
            <h2 style={{ 'margin-bottom': '12px', color: '#2c3e50' }}>
              Tagged Template — Source Text as Key
            </h2>
            <p style={{ color: '#888', 'font-size': '0.85rem', 'margin-bottom': '12px' }}>
              <code>{'t`source text`'}</code> tagged templates use the source text as the key. The CLI extracts it,
              translators translate it, and the compiled output maps it to the right locale.
            </p>

            <div style={{ 'border-bottom': '1px solid #eee', 'padding': '8px 0' }}>
              <div style={{ 'font-family': 'monospace', 'font-size': '0.8rem', color: '#999' }}>
                {'t`Hello, ${name()}!`'}
              </div>
              <div>{t`Hello, ${name()}!`}</div>
            </div>

            <div style={{ 'border-bottom': '1px solid #eee', 'padding': '8px 0' }}>
              <div style={{ 'font-family': 'monospace', 'font-size': '0.8rem', color: '#999' }}>
                {'t`You have ${compileCount()} items.`'}
              </div>
              <div>{t`You have ${compileCount()} items.`}</div>
            </div>

            <div style={{ 'padding': '8px 0' }}>
              <div style={{ 'font-family': 'monospace', 'font-size': '0.8rem', color: '#999' }}>
                {'t`Current locale: ${locale()}`'}
              </div>
              <div>{t`Current locale: ${locale()}`}</div>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ 'margin-bottom': '12px', color: '#2c3e50' }}>
              Interactive — Reactive Signals
            </h2>

            <div style={{ 'border-bottom': '1px solid #eee', 'padding': '8px 0' }}>
              <label>
                Name:
                <input
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  style={{ 'margin-left': '8px', padding: '4px 8px', border: '1px solid #ddd', 'border-radius': '4px' }}
                />
              </label>
              <div style={{ 'margin-top': '4px' }}>{t`Hello, ${name()}!`}</div>
            </div>

            <div style={{ 'border-bottom': '1px solid #eee', 'padding': '8px 0' }}>
              <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                <button
                  onClick={() => setCompileCount((c) => Math.max(0, c - 1))}
                  style={{ padding: '4px 12px', border: '1px solid #ddd', 'border-radius': '4px', cursor: 'pointer' }}
                >-</button>
                <span style={{ 'font-size': '1.5rem', 'font-weight': 'bold', 'min-width': '40px', 'text-align': 'center' }}>
                  {compileCount()}
                </span>
                <button
                  onClick={() => setCompileCount((c) => c + 1)}
                  style={{ padding: '4px 12px', border: '1px solid #ddd', 'border-radius': '4px', cursor: 'pointer' }}
                >+</button>
              </div>
              <div style={{ 'margin-top': '4px' }}>{t`You have ${compileCount()} items in your cart.`}</div>
            </div>

            <div style={{ 'padding': '8px 0' }}>
              <label>
                Price:
                <input
                  type="number"
                  step="0.01"
                  value={price()}
                  onInput={(e) => setPrice(parseFloat(e.currentTarget.value) || 0)}
                  style={{ 'margin-left': '8px', padding: '4px 8px', border: '1px solid #ddd', 'border-radius': '4px', width: '100px' }}
                />
              </label>
              <div style={{ 'margin-top': '4px' }}>{t`Total: ${formattedPrice()}`}</div>
            </div>
          </section>
        </div>

        <hr style={{ border: 'none', 'border-top': '1px solid #ddd' }} />

        {/* ── Rich Text ── */}
        <div>
          <h1>{t`Rich Text`}</h1>
          <p style={{ color: '#666', 'margin-bottom': '16px' }}>
            The Trans component renders rich text with embedded components.
          </p>

          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={{ 'margin-bottom': '8px' }}>Welcome Message</h3>
              <p>
                <Trans
                  message={t`Welcome to <bold>Fluenti</bold> for <italic>SolidJS</italic>!`}
                  components={richComponents}
                />
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ 'margin-bottom': '8px' }}>Feature List</h3>
              <p>
                <Trans
                  message={t`Supports <bold>bold</bold>, <italic>italic</italic>, and <link>links</link>.`}
                  components={richComponents}
                />
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ 'margin-bottom': '8px' }}>Nested Components</h3>
              <p>
                <Trans
                  message={t`You can even <bold>nest <italic>components</italic> inside</bold> each other.`}
                  components={richComponents}
                />
              </p>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', 'border-top': '1px solid #ddd' }} />

        {/* ── Plurals ── */}
        <div>
          <h1>{t`Plurals`}</h1>
          <p style={{ color: '#666', 'margin-bottom': '16px' }}>
            The Plural component selects the correct plural form based on Intl.PluralRules.
          </p>

          <div style={{ ...cardStyle, padding: '24px', 'text-align': 'center' }}>
            <div style={{
              'font-size': '48px',
              'font-weight': 'bold',
              'margin-bottom': '16px',
              color: '#4a90d9',
            }}>
              {pluralCount()}
            </div>

            <p style={{ 'font-size': '18px', 'margin-bottom': '24px' }}>
              <Plural
                value={pluralCount()}
                zero={t`Your cart is empty.`}
                one={t`You have # item in your cart.`}
                other={t`You have # items in your cart.`}
              />
            </p>

            <div style={{ display: 'flex', gap: '8px', 'justify-content': 'center' }}>
              <button
                onClick={() => setPluralCount((c) => Math.max(0, c - 1))}
                style={{
                  padding: '8px 20px',
                  'font-size': '18px',
                  'border-radius': '4px',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                }}
              >
                -
              </button>
              <button
                onClick={() => setPluralCount((c) => c + 1)}
                style={{
                  padding: '8px 20px',
                  'font-size': '18px',
                  'border-radius': '4px',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
              <button
                onClick={() => setPluralCount(0)}
                style={{
                  padding: '8px 20px',
                  'font-size': '14px',
                  'border-radius': '4px',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                }}
              >
                {t`Reset`}
              </button>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', 'border-top': '1px solid #ddd' }} />

        {/* ── Reactivity Demo ── */}
        <div>
          <h1>{t`Reactivity Demo`}</h1>
          <p style={{ color: '#666', 'margin-bottom': '16px' }}>
            {t`In SolidJS, the component body runs only once. Text nodes update reactively.`}
          </p>

          <div style={{ ...cardStyle, padding: '24px', 'margin-bottom': '16px' }}>
            <h3 style={{ 'margin-bottom': '12px' }}>Signal Counter</h3>
            <p style={{ 'font-size': '24px', 'margin-bottom': '16px' }}>
              {t`Counter value: ${reactivityCount()}`}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setReactivityCount((c) => c - 1)}>
                {t`Decrement`}
              </button>
              <button onClick={() => setReactivityCount((c) => c + 1)}>
                {t`Increment`}
              </button>
              <button onClick={() => setReactivityCount(0)}>
                {t`Reset`}
              </button>
            </div>
          </div>

          <div style={{
            background: '#fffbea',
            padding: '16px',
            'border-radius': '8px',
            border: '1px solid #f0e68c',
          }}>
            <h3 style={{ 'margin-bottom': '8px' }}>How it works</h3>
            <ul style={{ 'padding-left': '20px' }}>
              <li>The component function runs <strong>once</strong></li>
              <li>
                <code>t()</code> reads <code>locale()</code> internally, making it reactive
              </li>
              <li>Changing locale updates all translated text without re-running the component</li>
              <li>Open the console to see the proof — the log message appears only once</li>
              <li>Current locale: <strong>{locale()}</strong></li>
            </ul>
          </div>
        </div>

        <hr style={{ border: 'none', 'border-top': '1px solid #ddd' }} />

        {/* ── Formatting Showcase ── */}
        <div>
          <h1>{t`Formatting Showcase`}</h1>
          <p style={{ color: '#666', 'margin-bottom': '16px' }}>
            Date formatting, number formatting, direct ICU interpolation, and select components.
          </p>

          <section style={{ 'margin-bottom': '24px' }}>
            <h2 style={{ 'margin-bottom': '12px' }}>Feature: d() Date Formatting</h2>
            <div style={cardStyle}>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>d(date) — default</div>
                <div>{d(now)}</div>
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>d(date, 'short')</div>
                <div>{d(now, 'short')}</div>
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>d(date, 'long')</div>
                <div>{d(now, 'long')}</div>
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>d(date, 'relative') — past date</div>
                <div>{d(pastDate, 'relative')}</div>
              </div>
            </div>
          </section>

          <section style={{ 'margin-bottom': '24px' }}>
            <h2 style={{ 'margin-bottom': '12px' }}>Feature: n() Number Formatting</h2>
            <div style={cardStyle}>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>n(1234567.89) — default</div>
                <div>{n(1234567.89)}</div>
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>n(42.5, 'currency')</div>
                <div>{n(42.5, 'currency')}</div>
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>n(0.856, 'percent')</div>
                <div>{n(0.856, 'percent')}</div>
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>n(1234.5, 'decimal')</div>
                <div>{n(1234.5, 'decimal')}</div>
              </div>
            </div>
          </section>

          <section style={{ 'margin-bottom': '24px' }}>
            <h2 style={{ 'margin-bottom': '12px' }}>Feature: format() Direct ICU Interpolation</h2>
            <div style={cardStyle}>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>format(serverTemplate, values)</div>
                <div>
                  {format('Hello {name}, you have {count} notifications', {
                    name: 'Developer',
                    count: 5,
                  })}
                </div>
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>format(template) — no values</div>
                <div>{format('Welcome to the app!')}</div>
              </div>
            </div>
          </section>

          <section style={{ 'margin-bottom': '24px' }}>
            <h2 style={{ 'margin-bottom': '12px' }}>{'Feature: <Select> Component'}</h2>
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '8px', 'margin-bottom': '16px' }}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button
                    onClick={() => setGender(g)}
                    style={{
                      'font-weight': gender() === g ? 'bold' : 'normal',
                      background: gender() === g ? '#4a90d9' : '#e0e0e0',
                      color: gender() === g ? 'white' : '#333',
                      border: 'none',
                      padding: '6px 12px',
                      'border-radius': '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div style={demoItemStyle}>
                <div style={demoLabelStyle}>{'<Select value={gender} options={...} other="..." />'}</div>
                <div>
                  <Select
                    value={gender()}
                    options={{
                      male: t`He liked this`,
                      female: t`She liked this`,
                    }}
                    other={t`They liked this`}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

      </main>
    </div>
  )
}
