import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'

function getInitialLocale(): string {
  const urlParams = new URLSearchParams(window.location.search)
  const queryLang = urlParams.get('lang')
  if (queryLang) {
    document.cookie = `locale=${queryLang};path=/;max-age=31536000`
    return queryLang
  }
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  if (match) return decodeURIComponent(match[1])
  return 'en'
}

hydrateRoot(
  document.getElementById('root')!,
  <BrowserRouter>
    <App initialLocale={getInitialLocale()} />
  </BrowserRouter>,
)
