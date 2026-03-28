import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { setTimeout as sleep } from 'node:timers/promises'

const execFileAsync = promisify(execFile)

export type AIProvider = 'claude' | 'codex'

export interface AIInvokeOptions {
  readonly provider: AIProvider
  readonly prompt: string
  readonly maxRetries?: number | undefined
  readonly initialDelayMs?: number | undefined
  readonly maxBuffer?: number | undefined
  readonly timeoutMs?: number | undefined  // default: 120_000 (2 minutes)
}

export interface AIInvokeResult {
  readonly stdout: string
  readonly attempts: number
}

const INSTALL_COMMANDS: Record<AIProvider, string> = {
  claude: 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex',
}

function buildArgs(provider: AIProvider, prompt: string): readonly string[] {
  return provider === 'claude'
    ? ['-p', prompt]
    : ['-p', prompt, '--full-auto']
}

function isEnoent(error: unknown): boolean {
  return (error as Error & { code?: string }).code === 'ENOENT'
}

export async function invokeAI(options: AIInvokeOptions): Promise<AIInvokeResult> {
  const {
    provider,
    prompt,
    maxRetries = 3,
    initialDelayMs = 1000,
    maxBuffer = 10 * 1024 * 1024,
    timeoutMs = 120_000,
  } = options

  const args = buildArgs(provider, prompt)
  const command = provider === 'claude' ? 'claude' : 'codex'
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const execPromise = execFileAsync(command, [...args], { maxBuffer })
      const { stdout } = await Promise.race([
        execPromise,
        sleep(timeoutMs).then<never>(() => {
          throw new Error(`AI provider timed out after ${timeoutMs}ms`)
        }),
      ])
      return { stdout, attempts: attempt + 1 }
    } catch (error: unknown) {
      if (isEnoent(error)) {
        throw new Error(
          `"${provider}" CLI not found. Please install it first:\n  ${INSTALL_COMMANDS[provider]}`,
        )
      }
      if (error instanceof Error && error.message.includes('timed out')) {
        throw error
      }
      lastError = error
      if (attempt < maxRetries) {
        const delay = initialDelayMs * 2 ** attempt
        await sleep(delay)
      }
    }
  }

  throw lastError
}
