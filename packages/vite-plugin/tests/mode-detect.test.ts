import { describe, it, expect, beforeEach } from 'vitest'
import { setResolvedMode, getResolvedMode, isBuildMode } from '../src/mode-detect'

describe('mode-detect', () => {
  beforeEach(() => {
    setResolvedMode('serve') // reset to dev
  })

  describe('setResolvedMode / getResolvedMode', () => {
    it('defaults to dev mode', () => {
      expect(getResolvedMode()).toBe('dev')
    })

    it('sets build mode from configResolved command', () => {
      setResolvedMode('build')
      expect(getResolvedMode()).toBe('build')
    })

    it('sets dev mode from serve command', () => {
      setResolvedMode('build')
      setResolvedMode('serve')
      expect(getResolvedMode()).toBe('dev')
    })
  })

  describe('isBuildMode', () => {
    it('detects Vite 8 environment API', () => {
      expect(isBuildMode({ mode: 'build' })).toBe(true)
    })

    it('falls back to configResolved capture', () => {
      setResolvedMode('build')
      expect(isBuildMode()).toBe(true)
    })

    it('returns false in dev mode with no environment', () => {
      setResolvedMode('serve')
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      expect(isBuildMode()).toBe(false)
      process.env.NODE_ENV = originalEnv
    })

    it('falls back to NODE_ENV=production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      expect(isBuildMode()).toBe(true)
      process.env.NODE_ENV = originalEnv
    })
  })
})
