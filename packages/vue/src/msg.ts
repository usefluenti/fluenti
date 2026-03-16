// Re-export msg from @fluenti/core
// msg`` is the only Fluenti API that requires an explicit import,
// because it's used outside the component tree where auto-injection can't work.
export { msg } from '@fluenti/core'
