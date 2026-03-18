import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useI18n } from '@fluenti/react'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))

function Nav() {
  const { t, locale, isLoading, preloadLocale, setLocale } = useI18n()

  return (
    <div>
      <nav>
        <Link to="/" data-testid="nav-home">{t('Home')}</Link>
        {' '}
        <Link to="/about" data-testid="nav-about">{t('About')}</Link>
      </nav>

      <div className="locale-switcher">
        <button
          data-testid="lang-en"
          className={locale === 'en' ? 'active' : ''}
          onMouseEnter={() => preloadLocale('en')}
          onClick={() => setLocale('en')}
        >English</button>
        <button
          data-testid="lang-ja"
          className={locale === 'ja' ? 'active' : ''}
          onMouseEnter={() => preloadLocale('ja')}
          onClick={() => setLocale('ja')}
        >日本語</button>
      </div>

      {isLoading && <p data-testid="loading">Loading...</p>}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
