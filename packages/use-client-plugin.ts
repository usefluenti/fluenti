import type { Plugin } from 'vite'

export function useClientPlugin(options: { files: string[] }): Plugin {
  return {
    name: 'fluenti:use-client',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue
        const baseName = fileName.replace(/\.(js|cjs|mjs)$/, '')
        if (options.files.includes(baseName)) {
          chunk.code = `"use client";\n${chunk.code}`
        }
      }
    },
  }
}
