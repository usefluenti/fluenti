/**
 * Detect whether Vite is running in build or dev mode.
 * Supports Vite 7 (configResolved) and Vite 8 (environment API).
 */

let resolvedMode: 'build' | 'dev' = 'dev'

/** Called from configResolved hook to capture the mode early */
export function setResolvedMode(command: string): void {
  resolvedMode = command === 'build' ? 'build' : 'dev'
}

/** Get the current resolved mode */
export function getResolvedMode(): 'build' | 'dev' {
  return resolvedMode
}

/**
 * Check if we're in build mode.
 * Tries environment API (Vite 8), then falls back to configResolved capture,
 * then falls back to NODE_ENV.
 */
export function isBuildMode(environment?: { mode?: string }): boolean {
  // Vite 8: environment.mode === 'build'
  if (environment?.mode === 'build') return true

  // Vite 7: captured from configResolved
  if (resolvedMode === 'build') return true

  // Last resort: NODE_ENV
  if (process.env['NODE_ENV'] === 'production') return true

  return false
}
