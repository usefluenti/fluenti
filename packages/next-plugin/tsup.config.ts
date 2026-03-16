import { defineConfig } from 'tsup'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function prependDirective(file: string, directive: string) {
  const filePath = resolve('dist', file)
  const content = readFileSync(filePath, 'utf-8')
  if (!content.startsWith(`"${directive}"`) && !content.startsWith(`'${directive}'`)) {
    writeFileSync(filePath, `"${directive}";\n${content}`)
  }
}

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/server.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-dom', 'next', 'webpack', '@fluenti/core', '@fluenti/react'],
  },
  {
    entry: ['src/provider.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: ['react', 'react-dom', 'next', 'webpack', '@fluenti/core', '@fluenti/react'],
    onSuccess: async () => {
      prependDirective('provider.js', 'use client')
      prependDirective('provider.cjs', 'use client')
    },
  },
  {
    entry: ['src/loader.ts'],
    format: ['esm', 'cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: ['react', 'react-dom', 'next', 'webpack', '@fluenti/core', '@fluenti/react'],
  },
])
