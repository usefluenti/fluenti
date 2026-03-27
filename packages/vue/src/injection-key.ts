import type { InjectionKey } from 'vue'
import type { FluentiContext } from './plugin'

/** Injection key for the Fluenti i18n context. @internal */
export const FLUENTI_KEY: InjectionKey<FluentiContext> = Symbol('fluenti')
