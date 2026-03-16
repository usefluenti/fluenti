import type { NextConfig } from 'next'
import { withFluenti } from '@fluenti/next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default withFluenti()(nextConfig)
