// Strict transform mode intentionally leaves Solid JSX components untouched.
// Runtime <Trans> / <Plural> provide the supported behavior without relying on
// injected module-level i18n accessors.

export interface SolidJsxTransformResult {
  code: string
  changed: boolean
}

export function transformSolidJsx(code: string): SolidJsxTransformResult {
  return { code, changed: false }
}
