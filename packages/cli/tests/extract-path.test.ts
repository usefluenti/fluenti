import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeMessageOrigins, resolveExtractFilePaths } from '../src/extract-path'
import type { ExtractedMessage } from '@fluenti/core/compiler'

describe('resolveExtractFilePaths', () => {
  it('normalizes POSIX paths inside cwd to relative forward-slash paths', () => {
    const result = resolveExtractFilePaths('/repo', '/repo/src/App.tsx', path.posix)

    expect(result.absoluteFile).toBe('/repo/src/App.tsx')
    expect(result.displayFile).toBe('src/App.tsx')
  })

  it('normalizes POSIX paths outside cwd to dot-dot relative paths', () => {
    const result = resolveExtractFilePaths('/repo', '/other/src/App.tsx', path.posix)

    expect(result.displayFile).toBe('../other/src/App.tsx')
  })

  it('normalizes Win32 same-drive paths to forward-slash paths', () => {
    const result = resolveExtractFilePaths('C:\\repo', 'C:\\repo\\src\\App.tsx', path.win32)

    expect(result.absoluteFile).toBe('C:\\repo\\src\\App.tsx')
    expect(result.displayFile).toBe('src/App.tsx')
  })

  it('normalizes Win32 same-drive outside paths to dot-dot paths', () => {
    const result = resolveExtractFilePaths('C:\\repo', 'C:\\other\\src\\App.tsx', path.win32)

    expect(result.displayFile).toBe('../other/src/App.tsx')
  })

  it('throws when a Win32 file is on a different drive', () => {
    expect(() => resolveExtractFilePaths('C:\\repo', 'D:\\other\\src\\App.tsx', path.win32))
      .toThrow(/different drive/i)
  })
})

describe('normalizeMessageOrigins', () => {
  it('rewrites cached absolute origins to the normalized display path', () => {
    const messages: ExtractedMessage[] = [
      {
        id: 'hello',
        message: 'Hello',
        origin: { file: 'C:\\repo\\src\\App.tsx', line: 2 },
      },
    ]

    const result = normalizeMessageOrigins(messages, 'src/App.tsx')

    expect(result.changed).toBe(true)
    expect(result.messages[0]!.origin.file).toBe('src/App.tsx')
  })
})
