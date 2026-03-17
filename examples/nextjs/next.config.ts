import type { NextConfig } from 'next'
import { withFluenti } from '@fluenti/next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

// To use a custom locale resolver (DB, JWT, etc.), pass a module path:
// export default withFluenti({ resolveLocale: './src/lib/resolve-locale' })(nextConfig)
export default withFluenti()(nextConfig)
