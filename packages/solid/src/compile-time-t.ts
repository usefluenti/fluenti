import type { CompileTimeT } from '@fluenti/core'

export const t: CompileTimeT = ((..._args: unknown[]) => {
  throw new Error(
    "[fluenti] `t` imported from '@fluenti/solid' is a compile-time API. " +
      'Use it only with the Fluenti build transform inside a component or custom hook. ' +
      'For runtime lookups, use useI18n().t(...).',
  )
}) as CompileTimeT
