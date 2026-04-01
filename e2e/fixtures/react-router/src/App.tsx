import { Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@fluenti/react'
import { interpolate } from '@fluenti/core/runtime'
import { getDirection } from '@fluenti/core'
import { useState, useEffect } from 'react'
import en from './locales/compiled/en.js'
import ja from './locales/compiled/ja.js'
import ar from './locales/compiled/ar.js'
import { Layout } from './pages/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Plurals } from './pages/Plurals'
import { RichText } from './pages/RichText'

export const messages: Record<string, Record<string, string>> = { en, ja, ar }

export function App({ initialLocale = 'en' }: { initialLocale?: string }) {
  const [locale, setLocale] = useState(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getDirection(locale)
  }, [locale])

  const handleLocaleChange = (loc: string) => {
    document.cookie = `locale=${loc};path=/;max-age=31536000`
    setLocale(loc)
  }

  return (
    <I18nProvider locale={locale} fallbackLocale="en" messages={messages} interpolate={interpolate}>
      <Routes>
        <Route element={<Layout onLocaleChange={handleLocaleChange} />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/plurals" element={<Plurals />} />
          <Route path="/richtext" element={<RichText />} />
        </Route>
      </Routes>
    </I18nProvider>
  )
}
