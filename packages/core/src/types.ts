// ============================================================
// @fluenti/core — Type Contract
// ALL AGENTS CODE AGAINST THESE TYPES
// ============================================================

export type Locale = string

export interface MessageDescriptor {
  id?: string
  message?: string
  comment?: string
  context?: string
}

export interface CompileTimeMessageDescriptor {
  id?: string
  message: string
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
  /**
   * Translate by id or descriptor.
   *
   * This is the **runtime API** — works everywhere (Node, Vitest, browser).
   * Use this form when you need runtime interpolation or explicit message IDs.
   *
   * @example
   * t({ message: "Hello {name}" }, { name: "World" })
   * t("greeting", { name: "World" })
   */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): string
  /**
   * Tagged template form — **compile-time sugar**.
   *
   * Plain tagged templates (no interpolation) work at runtime via hash-based
   * catalog lookup: `t\`Select token\`` → looks up the hash of "Select token".
   *
   * Tagged templates **with interpolation** (`t\`Hello \${name}\``) rely on
   * the Vite plugin scope transform to rewrite them into descriptor calls at
   * build time. They still work at runtime for fallback interpolation, but
   * won't match compiled catalog entries without the Vite transform.
   */
  t(strings: TemplateStringsArray, ...exprs: unknown[]): string
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

export interface CompileTimeT {
  (descriptor: CompileTimeMessageDescriptor, values?: Record<string, unknown>): string
  (strings: TemplateStringsArray, ...exprs: unknown[]): string
}

export interface TypedCompileTimeT<
  IDs extends string = string,
  Values extends Record<string, Record<string, unknown>> = Record<string, Record<string, unknown>>,
> {
  <K extends IDs>(
    descriptor: { id?: K; message: K } & Omit<CompileTimeMessageDescriptor, 'id' | 'message'>,
    values?: Values[K],
  ): string
  (strings: TemplateStringsArray, ...exprs: unknown[]): string
}

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

// ---- Custom Formatter ----

/**
 * Custom ICU function formatter.
 * Called when a `{variable, functionName, style}` node is encountered
 * and `functionName` matches a registered custom formatter.
 */
export type CustomFormatter = (value: unknown, style: string, locale: Locale) => string

// ---- Extended FluentConfig ----

export interface FluentConfigExtended extends FluentConfig {
  namespaceMapping?: NamespaceMapping
  dateFormats?: DateFormatOptions
  numberFormats?: NumberFormatOptions
  fallbackChain?: Record<string, Locale[]>
  externalCatalogs?: Array<{ package: string; catalogDir: string }>
  /**
   * Post-translation transform applied to every resolved message.
   * Runs after interpolation. No-op when not set.
   *
   * @example
   * ```ts
   * transform: (result, id, locale) => result.toUpperCase()
   * ```
   */
  transform?: (result: string, id: string, locale: Locale) => string
  /**
   * Callback fired whenever the locale changes via `setLocale()` or the
   * `locale` property setter.
   */
  onLocaleChange?: (newLocale: Locale, prevLocale: Locale) => void
  /**
   * Custom ICU function formatters.
   * Keys are function names used in ICU messages (e.g. `{items, list}`).
   * When a `FunctionNode` is encountered during runtime interpolation,
   * the custom formatter is checked first, then the built-in Intl formatters.
   */
  formatters?: Record<string, CustomFormatter>
  /**
   * Enable development warnings for missing translations.
   *
   * When `true`:
   * - Missing messages return `[!] {id}` prefixed text
   * - `console.warn` is emitted for each missing translation
   *
   * Activated by `devWarnings: true` in `fluenti.config.ts` or
   * `FLUENTI_DEBUG` environment variable.
   */
  devWarnings?: boolean
}

// ---- Extended FluentInstance ----

export interface FluentInstanceExtended extends FluentInstance {
  d: FormatDateFn
  n: FormatNumberFn
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): string
}
