// ============================================================
// @fluenti/core — Type Contract
// ALL AGENTS CODE AGAINST THESE TYPES
// ============================================================

export type Locale = string

export interface MessageDescriptor {
  id: string
  message?: string
  comment?: string
  context?: string
}

export type CompiledMessage = string | ((values?: Record<string, unknown>) => string)
export type Messages = Record<string, CompiledMessage>
export type AllMessages = Record<Locale, Messages>

export interface FluentConfig {
  locale: Locale
  fallbackLocale?: Locale
  messages: AllMessages
  missing?: (locale: Locale, id: string) => string | undefined
}

export interface FluentInstance {
  locale: Locale
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): string
  setLocale(locale: Locale): void
  loadMessages(locale: Locale, messages: Messages): void
  getLocales(): Locale[]
}

export type CreateFluent = (config: FluentConfig) => FluentInstance

// ---- ICU Parser AST ----

export type ASTNode = TextNode | VariableNode | PluralNode | SelectNode | FunctionNode

export interface TextNode {
  type: 'text'
  value: string
}

export interface VariableNode {
  type: 'variable'
  name: string
}

export interface PluralNode {
  type: 'plural'
  variable: string
  offset?: number
  ordinal?: boolean
  options: Record<string, ASTNode[]>
}

export interface SelectNode {
  type: 'select'
  variable: string
  options: Record<string, ASTNode[]>
}

export interface FunctionNode {
  type: 'function'
  variable: string
  fn: string
  style?: string
}

export type ParseMessage = (message: string) => ASTNode[]
export type CompileMessage = (ast: ASTNode[], locale?: Locale) => CompiledMessage

// ---- CLI / Plugin ----

export interface ExtractedMessage {
  id: string
  message?: string
  comment?: string
  context?: string
  origin: { file: string; line: number; column?: number }
}

export interface FluentiConfig {
  sourceLocale: Locale
  locales: Locale[]
  catalogDir: string
  format: 'json' | 'po'
  include: string[]
  exclude?: string[]
  compileOutDir: string
  devWarnings?: boolean
  strictBuild?: boolean
  namespaceMapping?: Record<string, string>
  fallbackChain?: Record<string, Locale[]>
  externalCatalogs?: Array<{ package: string; catalogDir: string }>
  strictThreshold?: number
  /** Code splitting strategy: 'dynamic' | 'static' | false */
  splitting?: 'dynamic' | 'static' | false
  /** Default locale for build-time static strategy */
  defaultBuildLocale?: Locale
}

// ---- SSR Utilities ----

export interface DetectLocaleOptions {
  cookie?: string
  query?: string
  path?: string
  headers?: Headers | Record<string, string>
  available: Locale[]
  fallback: Locale
}

export type DetectLocale = (options: DetectLocaleOptions) => Locale
export type GetSSRLocaleScript = (locale: Locale) => string
export type GetHydratedLocale = (fallback?: Locale) => Locale

// ---- Lazy Messages ----

export type MsgTaggedTemplate = (
  strings: TemplateStringsArray,
  ...exprs: unknown[]
) => MessageDescriptor

export type MsgDescriptor = (descriptor: MessageDescriptor) => MessageDescriptor

// ---- Namespace ----

export interface NamespaceMapping {
  [globPattern: string]: string
}

// ---- Formatting ----

export interface DateFormatOptions {
  [styleName: string]: Intl.DateTimeFormatOptions | 'relative'
}

export interface NumberFormatOptions {
  [styleName: string]:
    | Intl.NumberFormatOptions
    | ((locale: Locale) => Intl.NumberFormatOptions)
}

export type FormatDateFn = (value: Date | number, style?: string) => string
export type FormatNumberFn = (value: number, style?: string) => string

// ---- Extended FluentConfig ----

export interface FluentConfigExtended extends FluentConfig {
  namespaceMapping?: NamespaceMapping
  dateFormats?: DateFormatOptions
  numberFormats?: NumberFormatOptions
  fallbackChain?: Record<string, Locale[]>
  externalCatalogs?: Array<{ package: string; catalogDir: string }>
}

// ---- Extended FluentInstance ----

export interface FluentInstanceExtended extends FluentInstance {
  d: FormatDateFn
  n: FormatNumberFn
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): string
  /**
   * @deprecated Use `format()` instead. `tRaw` will be removed in a future major version.
   */
  tRaw(message: string, values?: Record<string, unknown>): string
}
