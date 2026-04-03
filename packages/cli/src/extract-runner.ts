import { loadConfig } from './config-loader'
import { runExtractWorkflow } from './extract-workflow'

export interface RunExtractOptions {
  clean?: boolean
  stripFuzzy?: boolean
  useCache?: boolean
}

/**
 * Programmatic extract entry point.
 * Loads config from `cwd`, extracts messages, and writes catalogs.
 * This is the in-process equivalent of `fluenti extract`.
 */
export async function runExtract(cwd: string, options?: RunExtractOptions): Promise<void> {
  const config = await loadConfig(undefined, cwd)
  await runExtractWorkflow(cwd, config, options)
}
