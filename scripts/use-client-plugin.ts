/**
 * Vite plugin that prepends `"use client"` to specified output chunks.
 * Used by @fluenti/react and @fluenti/next to mark client-only entry points.
 */
export function useClientPlugin(options: { files: string[] }) {
  return {
    name: 'fluenti:use-client',
    generateBundle(_: unknown, bundle: Record<string, { type: string; code?: string }>) {
      for (const fileName of Object.keys(bundle)) {
        const chunk = bundle[fileName]!
        if (chunk.type !== 'chunk') continue
        const baseName = fileName.replace(/\.(js|cjs|mjs)$/, '')
        if (options.files.includes(baseName)) {
          chunk.code = `"use client";\n${chunk.code}`
        }
      }
    },
  }
}
