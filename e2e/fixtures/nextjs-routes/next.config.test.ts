
import { withFluenti } from '@fluenti/next'
const config = withFluenti({ resolveLocale: './src/lib/resolve-locale' })({ reactStrictMode: true })
config.turbopack.rules = {}
export default config
