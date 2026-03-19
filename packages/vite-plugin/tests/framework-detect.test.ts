import { describe, it, expect } from 'vitest'
import { detectFramework } from '../src/framework-detect'

describe('detectFramework', () => {
  it('detects .vue suffix as vue', () => {
    expect(detectFramework('App.vue', '')).toBe('vue')
  })

  it('detects createSignal as solid', () => {
    expect(detectFramework('App.tsx', 'import { createSignal } from "solid-js"')).toBe('solid')
  })

  it('detects createMemo as solid', () => {
    expect(detectFramework('App.tsx', 'import { createMemo } from "solid-js"')).toBe('solid')
  })

  it('detects solid-js import as solid', () => {
    expect(detectFramework('App.tsx', 'import { render } from "solid-js/web"')).toBe('solid')
  })

  it('detects @fluenti/solid import as solid', () => {
    expect(detectFramework('App.tsx', 'import { useI18n } from "@fluenti/solid"')).toBe('solid')
  })

  it('detects @fluenti/react import as react', () => {
    expect(detectFramework('App.tsx', 'import { useI18n } from "@fluenti/react"')).toBe('react')
  })

  it('detects useState as react', () => {
    expect(detectFramework('App.tsx', 'import { useState } from "react"')).toBe('react')
  })

  it('detects useEffect as react', () => {
    expect(detectFramework('App.tsx', 'import { useEffect } from "react"')).toBe('react')
  })

  it('detects jsx keyword as react', () => {
    expect(detectFramework('App.tsx', 'import { jsx } from "react/jsx-runtime"')).toBe('react')
  })

  it('detects react import as react', () => {
    expect(detectFramework('App.tsx', 'import React from "react"')).toBe('react')
  })

  it('defaults to vue when no keywords match', () => {
    expect(detectFramework('App.tsx', 'const x = 1')).toBe('vue')
  })

  it('vue suffix takes priority over react keywords in code', () => {
    expect(detectFramework('Component.vue', 'import { useState } from "react"')).toBe('vue')
  })

  it('solid takes priority over react when both present', () => {
    expect(detectFramework('App.tsx', 'import { createSignal } from "solid-js"; import { useState } from "react"')).toBe('solid')
  })
})
