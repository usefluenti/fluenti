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
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-dom', '@fluenti/core'],
    onSuccess: async () => {
      prependDirective('index.js', 'use client')
      prependDirective('index.cjs', 'use client')
    },
  },
  {
    entry: ['src/server.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: ['react', 'react-dom', '@fluenti/core'],
  },
])
