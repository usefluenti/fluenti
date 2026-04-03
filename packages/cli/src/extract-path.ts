import * as path from 'node:path'
import type { ExtractedMessage } from '@fluenti/core/compiler'

interface PathApi {
  isAbsolute(filePath: string): boolean
  normalize(filePath: string): string
  relative(from: string, to: string): string
  resolve(...paths: string[]): string
}

export interface ExtractFilePaths {
  absoluteFile: string
  displayFile: string
}

export function toForwardSlash(filePath: string): string {
  return filePath.split('\\').join('/')
}

export function resolveExtractFilePaths(
  cwd: string,
  filePath: string,
  pathApi: PathApi = path,
): ExtractFilePaths {
  const absoluteFile = pathApi.isAbsolute(filePath)
    ? pathApi.normalize(filePath)
    : pathApi.resolve(cwd, filePath)
  const relativeFile = pathApi.relative(cwd, absoluteFile)

  if (pathApi.isAbsolute(relativeFile)) {
    throw new Error(
      `Cannot extract "${absoluteFile}" relative to "${cwd}". `
      + 'The include glob resolved to a file on a different drive, '
      + 'so Fluenti cannot keep PO references relative on this platform.',
    )
  }

  return {
    absoluteFile,
    displayFile: toForwardSlash(relativeFile),
  }
}

export function normalizeMessageOrigins(
  messages: readonly ExtractedMessage[],
  displayFile: string,
): { messages: ExtractedMessage[]; changed: boolean } {
  const normalizedDisplayFile = toForwardSlash(displayFile)
  let changed = false

  const normalizedMessages = messages.map((message) => {
    if (toForwardSlash(message.origin.file) === normalizedDisplayFile) {
      return message
    }

    changed = true
    return {
      ...message,
      origin: {
        ...message.origin,
        file: normalizedDisplayFile,
      },
    }
  })

  return {
    messages: changed ? normalizedMessages : [...messages],
    changed,
  }
}
