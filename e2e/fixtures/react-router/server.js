import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '5188', 10)

async function createServer() {
  const app = express()

  // Serve static assets from the client build
  app.use(
    '/assets',
    express.static(path.resolve(__dirname, 'dist/client/assets'), {
      immutable: true,
      maxAge: '1y',
    }),
  )
  app.use(express.static(path.resolve(__dirname, 'dist/client'), { index: false }))

  // Read the HTML template
  const template = fs.readFileSync(
    path.resolve(__dirname, 'dist/client/index.html'),
    'utf-8',
  )

  // Import the server entry
  const { render } = await import('./dist/server/entry.server.js')

  app.get('/{*splat}', (req, res) => {
    // Parse locale from cookie or query param
    const cookies = req.headers.cookie || ''
    const queryLang = req.query.lang
    let locale = 'en'

    if (typeof queryLang === 'string' && queryLang) {
      locale = queryLang
    } else {
      const match = cookies.match(/(?:^|;\s*)locale=([^;]*)/)
      if (match) {
        locale = decodeURIComponent(match[1])
      }
    }

    // Validate locale
    const supported = ['en', 'ja', 'ar']
    if (!supported.includes(locale)) {
      locale = 'en'
    }

    const appHtml = render(req.originalUrl, locale)

    // Inject SSR content and set lang/dir attributes
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    const html = template
      .replace('<html lang="en">', `<html lang="${locale}" dir="${dir}">`)
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  })

  app.listen(PORT, () => {
    console.log(`SSR server running at http://localhost:${PORT}`)
  })
}

createServer()
