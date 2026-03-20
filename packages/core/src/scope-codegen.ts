import { createRequire } from 'node:module'

export type GenerateCodeFn = (ast: unknown, options?: unknown) => { code: string }

const require = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url,
)
let generateCode: GenerateCodeFn | null = null

export function getGenerateCode(): GenerateCodeFn {
  if (generateCode) return generateCode

  const generatorModule = require('@babel/generator') as {
    default?: GenerateCodeFn
  }

  generateCode = typeof generatorModule.default === 'function'
    ? generatorModule.default
    : (generatorModule as unknown as GenerateCodeFn)

  return generateCode
}
