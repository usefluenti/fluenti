import { createContext } from 'react'
import type { FluentiContext } from './types'

export const I18nContext = createContext<FluentiContext | null>(null)
