import type { NextConfig } from 'next'
import { withFluenti } from '@fluenti/next'
import path from 'node:path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // User's existing webpack config with a custom loader
    config.module.rules.push({
      test: /\.tsx$/,
      use: [{ loader: path.resolve(__dirname, './custom-loader.js') }],
    })
    return config
  },
}

export default withFluenti({
  loaderEnforce: undefined, // No enforce — coexist with user loaders
})(nextConfig)
