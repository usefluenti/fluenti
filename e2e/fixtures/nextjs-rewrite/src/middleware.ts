import { NextResponse } from 'next/server'
import { createI18nMiddleware } from '@fluenti/next/middleware'

export default createI18nMiddleware({ NextResponse, rewriteDefaultLocale: true })

export const config = {
  matcher: ['/((?!_next|api|favicon).*)'],
}
