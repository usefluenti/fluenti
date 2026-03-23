import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { App } from './App'

export function render(url: string, locale: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App initialLocale={locale} />
    </StaticRouter>,
  )
}
