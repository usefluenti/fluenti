// ============================================================
// @fluenti/core — Type Contract
// ALL AGENTS CODE AGAINST THESE TYPES
// ============================================================

export type Locale = string

// ---- Branded String Type ----

declare const __localizedBrand: unique symbol

/**
 * Branded string type for compile-time i18n safety.
 *
 * Assignable to `string` (backward-compatible), but plain `string`
 * cannot be assigned to `LocalizedString` without explicit cast.
 *
 * @example
 * ```ts
 * const msg: LocalizedString = t`Hello`   // ✅
 * const str: string = t`Hello`            // ✅ brand → string is safe
 * const div = <div>{t`Hello`}</div>       // ✅ JSX accepts string
 *
 * function setTitle(title: LocalizedString) { ... }
 * setTitle('raw string')  // ❌ compile error — not translated
 * setTitle(t`Hello`)      // ✅ translated
 * ```
 */
export type LocalizedString = string & { readonly [__localizedBrand]: 'LocalizedString' }

// ---- Type-level Configuration ----

/**
 * Module-augmentation interface for type-level customization.
 *
 * Override `localizedString` to `string` to disable the branded type:
 * ```ts
 * declare module '@fluenti/core' {
 *   interface FluentiTypeConfig {
 *     localizedString: string
 *   }
 * }
 * ```
 *
 * After compilation, `messageIds` and `messageValues` are automatically
 * narrowed via module augmentation in the generated `messages.d.ts`.
 */
export interface FluentiTypeConfig {
  /** Override to `string` to disable branded type */
  localizedString: LocalizedString
  /** Narrowed by compiled messages.d.ts */
  messageIds: string
  /** Narrowed by compiled messages.d.ts */
  messageValues: Record<string, Record<string, unknown>>
}

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
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): FluentiTypeConfig['localizedString']
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
  t(strings: TemplateStringsArray, ...exprs: unknown[]): FluentiTypeConfig['localizedString']
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

// ---- Locale Metadata ----

/** Locale metadata for i18n routing and SEO */
export interface LocaleObject {
  /** Locale code (e.g. 'en', 'ja', 'zh-CN') */
  code: string
  /** Human-readable display name (e.g. 'English', '日本語') */
  name?: string
  /** BCP 47 language tag for SEO (e.g. 'en-US', 'ja-JP') */
  iso?: string
  /** Text direction */
  dir?: 'ltr' | 'rtl'
  /** Domain for this locale (used with domain-based routing) */
  domain?: string
}

/** A locale definition — either a plain code string or a metadata object */
export type LocaleDefinition = string | LocaleObject

/** Extract locale codes from a mixed LocaleDefinition[] array */
export function resolveLocaleCodes(locales: LocaleDefinition[]): string[] {
  return locales.map((l) => (typeof l === 'string' ? l : l.code))
}

// ---- CLI / Plugin ----

export interface ExtractedMessage {
  id: string
  message?: string
  comment?: string
  context?: string
  origin: { file: string; line: number; column?: number }
}

export interface FluentiConfig {
  /** Path to parent config to inherit from (relative to this config file's directory) */
  extends?: string
  sourceLocale: Locale
  locales: LocaleDefinition[]
  /** Default locale for routing/detection (defaults to sourceLocale) */
  defaultLocale?: Locale
  catalogDir: string
  format: 'json' | 'po'
  include: string[]
  exclude?: string[]
  compileOutDir: string

  // Build options
  /** Code splitting strategy: 'dynamic' | 'static' | false */
  splitting?: 'dynamic' | 'static' | false
  /** Default locale for build-time static strategy */
  defaultBuildLocale?: Locale
  /** File extension for compiled catalog files (default: '.js') */
  catalogExtension?: string
  /** Custom message ID generator */
  idGenerator?: (message: string, context?: string) => string

  // Dev options
  /** Auto extract+compile in dev mode (default: true) */
  devAutoCompile?: boolean
  /** Auto extract+compile before production build (default: true) */
  buildAutoCompile?: boolean
  /** Debounce delay in ms for dev auto-compile (default: 500) */
  devAutoCompileDelay?: number
  /** Enable parallel compilation across locales using worker threads (default: false) */
  parallelCompile?: boolean

  // Compile lifecycle hooks
  /** Called before auto-compile runs. Return false to skip compilation. */
  onBeforeCompile?: () => boolean | void | Promise<boolean | void>
  /** Called after auto-compile completes successfully */
  onAfterCompile?: () => void | Promise<void>

  // Runtime options
  devWarnings?: boolean
  fallbackChain?: Record<string, Locale[]>
  dateFormats?: DateFormatOptions
  numberFormats?: NumberFormatOptions
  namespaceMapping?: Record<string, string>
  externalCatalogs?: Array<{ package: string; catalogDir: string }>

  // Legacy / strict build
  strictBuild?: boolean
  strictThreshold?: number
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
  <K extends FluentiTypeConfig['messageIds']>(
    descriptor: { id?: K; message: K } & Omit<CompileTimeMessageDescriptor, 'id' | 'message'>,
    values?: FluentiTypeConfig['messageValues'] extends Record<string, Record<string, unknown>>
      ? FluentiTypeConfig['messageValues'][K]
      : Record<string, unknown>,
  ): FluentiTypeConfig['localizedString']
  (strings: TemplateStringsArray, ...exprs: unknown[]): FluentiTypeConfig['localizedString']
}

export interface TypedCompileTimeT<
  IDs extends string = string,
  Values extends Record<string, Record<string, unknown>> = Record<string, Record<string, unknown>>,
> {
  <K extends IDs>(
    descriptor: { id?: K; message: K } & Omit<CompileTimeMessageDescriptor, 'id' | 'message'>,
    values?: Values[K],
  ): FluentiTypeConfig['localizedString']
  (strings: TemplateStringsArray, ...exprs: unknown[]): FluentiTypeConfig['localizedString']
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

export type FormatDateFn = (value: Date | number, style?: string) => FluentiTypeConfig['localizedString']
export type FormatNumberFn = (value: number, style?: string) => FluentiTypeConfig['localizedString']

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
  format(message: string, values?: Record<string, unknown>): FluentiTypeConfig['localizedString']
}
