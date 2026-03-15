declare module 'gettext-parser' {
  interface POTranslation {
    msgid: string
    msgstr: string[]
    comments?: {
      reference?: string
      extracted?: string
      flag?: string
      translator?: string
      previous?: string
    }
  }

  interface POData {
    headers?: Record<string, string>
    translations: Record<string, Record<string, POTranslation>>
  }

  export const po: {
    parse(buffer: Buffer | string, defaultCharset?: string): POData
    compile(data: POData): Buffer
  }

  export const mo: {
    parse(buffer: Buffer | string): POData
    compile(data: POData): Buffer
  }
}
