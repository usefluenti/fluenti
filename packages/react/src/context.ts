import { createContext } from 'react'
import type { FluentiContext } from './types'

export const I18nContext = /* @__PURE__ */ createContext<FluentiContext | null>(null)
