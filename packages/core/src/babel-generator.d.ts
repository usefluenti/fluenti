declare module '@babel/generator' {
  interface GeneratorResult {
    code: string
  }

  interface GeneratorOptions {
    retainLines?: boolean
    jsescOption?: {
      quotes?: 'single' | 'double'
      minimal?: boolean
    }
  }

  export default function generate(ast: unknown, options?: GeneratorOptions): GeneratorResult
}
