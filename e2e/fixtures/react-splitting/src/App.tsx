import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
// @ts-expect-error virtual module
import { __switchLocale, __currentLocale, __loading } from 'virtual:fluenti/runtime'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))

function Nav() {
  const [, forceUpdate] = useState(0)

  const switchLocale = async (locale: string) => {
    await __switchLocale(locale)
    forceUpdate((n: number) => n + 1)
  }

  return (
    <div>
      <nav>
        <Link to="/" data-testid="nav-home">{$t('Home')}</Link>
        {' '}
        <Link to="/about" data-testid="nav-about">{$t('About')}</Link>
      </nav>

      <div className="locale-switcher">
        <button
          data-testid="lang-en"
          className={__currentLocale === 'en' ? 'active' : ''}
          onClick={() => switchLocale('en')}
        >English</button>
        <button
          data-testid="lang-ja"
          className={__currentLocale === 'ja' ? 'active' : ''}
          onClick={() => switchLocale('ja')}
        >日本語</button>
      </div>

      {__loading && <p data-testid="loading">Loading...</p>}
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
