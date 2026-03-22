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

// ---- Shared Runtime Types ----

/** Compiled message chunk loader for lazy locale loading */
export type ChunkLoader = (
  locale: string,
) => Promise<Record<string, CompiledMessage> | { default: Record<string, CompiledMessage> }>

/** Runtime module injected by the Vite plugin for locale switching */
export interface SplitRuntimeModule {
  __switchLocale?: (locale: string) => Promise<void>
  __preloadLocale?: (locale: string) => Promise<void>
}

export interface FluentiRuntimeConfig {
  locale: Locale
  fallbackLocale?: Locale
  messages: AllMessages
  missing?: (locale: Locale, id: string) => string | undefined
}

export interface FluentiInstance {
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

export type CreateFluent = (config: FluentiRuntimeConfig) => FluentiInstance

// ---- ICU Parser AST ----

/** @internal Only needed for custom parser/compiler work. */
export type ASTNode = TextNode | VariableNode | PluralNode | SelectNode | FunctionNode

/** @internal Only needed for custom parser/compiler work. */
export interface TextNode {
  type: 'text'
  value: string
}

/** @internal Only needed for custom parser/compiler work. */
export interface VariableNode {
  type: 'variable'
  name: string
}

/** @internal Only needed for custom parser/compiler work. */
export interface PluralNode {
  type: 'plural'
  variable: string
  offset?: number
  ordinal?: boolean
  options: Record<string, ASTNode[]>
}

/** @internal Only needed for custom parser/compiler work. */
export interface SelectNode {
  type: 'select'
  variable: string
  options: Record<string, ASTNode[]>
}

/** @internal Only needed for custom parser/compiler work. */
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

// ---- Nested Config Structure ----

/** Source-related configuration (locales, catalogs, file patterns) */
export interface FluentiSourceConfig {
  sourceLocale: Locale
  locales: LocaleDefinition[]
  /** Default locale for routing/detection (defaults to sourceLocale) */
  defaultLocale?: Locale
  catalogDir: string
  format: 'json' | 'po'
  include: string[]
  exclude?: string[]
  compileOutDir: string
}

/** Build-time compilation options */
export interface FluentiBuildOptions {
  /** Code splitting strategy: 'dynamic' | 'static' | false */
  splitting?: 'dynamic' | 'static' | false
  /** Default locale for build-time static strategy */
  defaultBuildLocale?: Locale
  /** File extension for compiled catalog files (default: '.js') */
  catalogExtension?: string
  /** Custom message ID generator */
  idGenerator?: (message: string, context?: string) => string
  /** Auto extract+compile before production build (default: true) */
  autoCompile?: boolean
  /** Enable parallel compilation across locales using worker threads (default: false) */
  parallel?: boolean
  /** Enable strict build mode */
  strict?: boolean
  /** Minimum coverage threshold for strict build (0-1) */
  strictThreshold?: number
}

/** Development-mode options */
export interface FluentiDevOptions {
  /** Auto extract+compile in dev mode (default: true) */
  autoCompile?: boolean
  /** Debounce delay in ms for dev auto-compile (default: 500) */
  autoCompileDelay?: number
  /** Enable development warnings for missing translations */
  warnings?: boolean
}

/** Runtime i18n options (fallbacks, formatting) */
export interface FluentiRuntimeOptions {
  /** Fallback locale chain per locale */
  fallbackChain?: Record<string, Locale[]>
  /** Date format style definitions */
  dateFormats?: DateFormatOptions
  /** Number format style definitions */
  numberFormats?: NumberFormatOptions
  /** External catalog packages to merge */
  externalCatalogs?: Array<{ package: string; catalogDir: string }>
}

/** Compile lifecycle hooks */
export interface FluentiHooksConfig {
  /** Called before auto-compile runs. Return false to skip compilation. */
  onBeforeCompile?: () => boolean | void | Promise<boolean | void>
  /** Called after auto-compile completes successfully */
  onAfterCompile?: () => void | Promise<void>
}

/**
 * Fluenti configuration — nested structure.
 *
 * Used in `fluenti.config.ts` via `defineConfig()`.
 * Groups related options into `source`, `build`, `dev`, `runtime`, and `hooks`.
 */
export interface FluentiBuildConfig extends FluentiSourceConfig {
  /** Path to parent config to inherit from (relative to this config file's directory) */
  extends?: string

  /** Build-time compilation options */
  build?: FluentiBuildOptions
  /** Development-mode options */
  dev?: FluentiDevOptions
  /** Runtime i18n options (fallbacks, formatting) */
  runtime?: FluentiRuntimeOptions
  /** Compile lifecycle hooks */
  hooks?: FluentiHooksConfig

  // ---- Legacy flat fields (backward-compatible, mapped by normalizeConfig) ----

  /** @deprecated Use `build.splitting` instead */
  splitting?: 'dynamic' | 'static' | false
  /** @deprecated Use `build.defaultBuildLocale` instead */
  defaultBuildLocale?: Locale
  /** @deprecated Use `build.catalogExtension` instead */
  catalogExtension?: string
  /** @deprecated Use `build.idGenerator` instead */
  idGenerator?: (message: string, context?: string) => string
  /** @deprecated Use `dev.autoCompile` instead */
  devAutoCompile?: boolean
  /** @deprecated Use `build.autoCompile` instead */
  buildAutoCompile?: boolean
  /** @deprecated Use `dev.autoCompileDelay` instead */
  devAutoCompileDelay?: number
  /** @deprecated Use `build.parallel` instead */
  parallelCompile?: boolean
  /** @deprecated Use `hooks.onBeforeCompile` instead */
  onBeforeCompile?: () => boolean | void | Promise<boolean | void>
  /** @deprecated Use `hooks.onAfterCompile` instead */
  onAfterCompile?: () => void | Promise<void>
  /** @deprecated Use `dev.warnings` instead */
  devWarnings?: boolean
  /** @deprecated Use `runtime.fallbackChain` instead */
  fallbackChain?: Record<string, Locale[]>
  /** @deprecated Use `runtime.dateFormats` instead */
  dateFormats?: DateFormatOptions
  /** @deprecated Use `runtime.numberFormats` instead */
  numberFormats?: NumberFormatOptions
  /** @deprecated Use `runtime.externalCatalogs` instead */
  externalCatalogs?: Array<{ package: string; catalogDir: string }>

  // Plugin system
  /** Plugins that hook into the extract and compile pipelines */
  plugins?: readonly FluentiPlugin[]

  /** @deprecated Use `build.strict` instead */
  strictBuild?: boolean
  /** @deprecated Use `build.strictThreshold` instead */
  strictThreshold?: number
}

// ---- Plugin System ----

/**
 * A Fluenti plugin can hook into the extract and compile pipelines.
 *
 * Plugins are called in registration order. Each hook receives an
 * immutable snapshot of the current state.
 *
 * @example
 * ```ts
 * const myPlugin: FluentiPlugin = {
 *   name: 'my-plugin',
 *   onAfterExtract(ctx) {
 *     console.log(`Extracted ${ctx.messages.size} messages`)
 *   },
 * }
 * ```
 */
export interface FluentiPlugin {
  /** Unique plugin name (used for logging) */
  readonly name: string
  /** Called after messages are extracted from source files */
  onAfterExtract?: (context: PluginExtractContext) => void | Promise<void>
  /** Called before messages are compiled to JS modules */
  onBeforeCompile?: (context: PluginCompileContext) => void | Promise<void>
  /** Called after compilation completes */
  onAfterCompile?: (context: PluginCompileContext) => void | Promise<void>
  /** Transform extracted messages for a given locale. Returns a new object. */
  transformMessages?: (
    messages: Readonly<Record<string, string>>,
    locale: string,
  ) => Record<string, string> | Promise<Record<string, string>>
  /** Custom ICU formatters to register at runtime */
  formatters?: Readonly<Record<string, CustomFormatter>>
  /** Config namespace for plugin-specific options */
  configKey?: string
}

/** Context passed to plugin extract hooks */
export interface PluginExtractContext {
  readonly messages: Map<string, ExtractedMessage>
  readonly sourceLocale: string
  readonly targetLocales: readonly string[]
  readonly config: Readonly<FluentiBuildConfig>
}

/** Context passed to plugin compile hooks */
export interface PluginCompileContext {
  readonly locale: string
  readonly messages: Readonly<Record<string, string>>
  readonly outDir: string
  readonly config: Readonly<FluentiBuildConfig>
}

// ---- Config Legacy / Normalization ----

/**
 * @deprecated Use `FluentiBuildConfig` instead. This alias exists for backward compatibility.
 *
 * The flat config structure is still accepted by `defineConfig()` and `loadConfig()`.
 * All flat fields are automatically normalized into the nested structure.
 */
export type FluentiBuildConfigLegacy = FluentiBuildConfig

/**
 * Normalize a config that may use flat (legacy) fields into the nested structure.
 *
 * Flat fields are mapped into their nested equivalents. If both flat and nested
 * fields are present, nested fields take precedence. Flat fields are also
 * populated from nested values for backward compatibility with existing consumers.
 *
 * Returns a new config object — the input is never mutated.
 */
export function normalizeConfig(raw: FluentiBuildConfig): FluentiBuildConfig {
  // ── Build nested groups (nested takes precedence over flat) ───────────
  const build: FluentiBuildOptions = { ...raw.build }
  if (raw.splitting !== undefined && build.splitting === undefined) build.splitting = raw.splitting
  if (raw.defaultBuildLocale !== undefined && build.defaultBuildLocale === undefined) build.defaultBuildLocale = raw.defaultBuildLocale
  if (raw.catalogExtension !== undefined && build.catalogExtension === undefined) build.catalogExtension = raw.catalogExtension
  if (raw.idGenerator !== undefined && build.idGenerator === undefined) build.idGenerator = raw.idGenerator
  if (raw.buildAutoCompile !== undefined && build.autoCompile === undefined) build.autoCompile = raw.buildAutoCompile
  if (raw.parallelCompile !== undefined && build.parallel === undefined) build.parallel = raw.parallelCompile
  if (raw.strictBuild !== undefined && build.strict === undefined) build.strict = raw.strictBuild
  if (raw.strictThreshold !== undefined && build.strictThreshold === undefined) build.strictThreshold = raw.strictThreshold

  const dev: FluentiDevOptions = { ...raw.dev }
  if (raw.devAutoCompile !== undefined && dev.autoCompile === undefined) dev.autoCompile = raw.devAutoCompile
  if (raw.devAutoCompileDelay !== undefined && dev.autoCompileDelay === undefined) dev.autoCompileDelay = raw.devAutoCompileDelay
  if (raw.devWarnings !== undefined && dev.warnings === undefined) dev.warnings = raw.devWarnings

  const runtime: FluentiRuntimeOptions = { ...raw.runtime }
  if (raw.fallbackChain !== undefined && runtime.fallbackChain === undefined) runtime.fallbackChain = raw.fallbackChain
  if (raw.dateFormats !== undefined && runtime.dateFormats === undefined) runtime.dateFormats = raw.dateFormats
  if (raw.numberFormats !== undefined && runtime.numberFormats === undefined) runtime.numberFormats = raw.numberFormats
  if (raw.externalCatalogs !== undefined && runtime.externalCatalogs === undefined) runtime.externalCatalogs = raw.externalCatalogs

  const hooks: FluentiHooksConfig = { ...raw.hooks }
  if (raw.onBeforeCompile !== undefined && hooks.onBeforeCompile === undefined) hooks.onBeforeCompile = raw.onBeforeCompile
  if (raw.onAfterCompile !== undefined && hooks.onAfterCompile === undefined) hooks.onAfterCompile = raw.onAfterCompile

  // ── Build result with both nested + flat fields for backward compat ───
  const result: FluentiBuildConfig = {
    sourceLocale: raw.sourceLocale,
    locales: raw.locales,
    catalogDir: raw.catalogDir,
    format: raw.format,
    include: raw.include,
    compileOutDir: raw.compileOutDir,
    build,
    dev,
    runtime,
    hooks,
  }

  // Preserve optional source fields
  if (raw.extends !== undefined) result.extends = raw.extends
  if (raw.defaultLocale !== undefined) result.defaultLocale = raw.defaultLocale
  if (raw.exclude !== undefined) result.exclude = raw.exclude
  // Preserve plugins
  if (raw.plugins !== undefined) result.plugins = raw.plugins

  // ── Populate flat fields from nested (backward compat for consumers) ──
  if (build.splitting !== undefined) result.splitting = build.splitting
  if (build.defaultBuildLocale !== undefined) result.defaultBuildLocale = build.defaultBuildLocale
  if (build.catalogExtension !== undefined) result.catalogExtension = build.catalogExtension
  if (build.idGenerator !== undefined) result.idGenerator = build.idGenerator
  if (build.autoCompile !== undefined) result.buildAutoCompile = build.autoCompile
  if (build.parallel !== undefined) result.parallelCompile = build.parallel
  if (build.strict !== undefined) result.strictBuild = build.strict
  if (build.strictThreshold !== undefined) result.strictThreshold = build.strictThreshold
  if (dev.autoCompile !== undefined) result.devAutoCompile = dev.autoCompile
  if (dev.autoCompileDelay !== undefined) result.devAutoCompileDelay = dev.autoCompileDelay
  if (dev.warnings !== undefined) result.devWarnings = dev.warnings
  if (runtime.fallbackChain !== undefined) result.fallbackChain = runtime.fallbackChain
  if (runtime.dateFormats !== undefined) result.dateFormats = runtime.dateFormats
  if (runtime.numberFormats !== undefined) result.numberFormats = runtime.numberFormats
  if (runtime.externalCatalogs !== undefined) result.externalCatalogs = runtime.externalCatalogs
  if (hooks.onBeforeCompile !== undefined) result.onBeforeCompile = hooks.onBeforeCompile
  if (hooks.onAfterCompile !== undefined) result.onAfterCompile = hooks.onAfterCompile

  return result
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
export interface SSRLocaleScriptOptions {
  /** Custom window variable name (default: `'__FLUENTI_LOCALE__'`). Useful for micro-frontend / multi-instance scenarios. */
  key?: string
}
export type GetSSRLocaleScript = (locale: Locale, options?: SSRLocaleScriptOptions) => string

export interface HydratedLocaleOptions {
  /** Custom window variable name (default: `'__FLUENTI_LOCALE__'`). Must match the key used in `getSSRLocaleScript`. */
  key?: string
}
export type GetHydratedLocale = (fallback?: Locale, options?: HydratedLocaleOptions) => Locale

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

// ---- Formatting ----

export interface DateFormatOptions {
  [styleName: string]: Intl.DateTimeFormatOptions | 'relative'
}

export interface NumberFormatOptions {
  [styleName: string]:
    | Intl.NumberFormatOptions
    | ((locale: Locale) => Intl.NumberFormatOptions)
}

export type FormatDateFn = (value: Date | number, style?: string, locale?: Locale) => FluentiTypeConfig['localizedString']
export type FormatNumberFn = (value: number, style?: string, locale?: Locale) => FluentiTypeConfig['localizedString']

// ---- Custom Formatter ----

/**
 * Custom ICU function formatter.
 * Called when a `{variable, functionName, style}` node is encountered
 * and `functionName` matches a registered custom formatter.
 */
export type CustomFormatter = (value: unknown, style: string, locale: Locale) => string

// ---- Extended Runtime Config ----

export interface FluentiRuntimeConfigFull extends FluentiRuntimeConfig {
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

export interface FluentiInstanceExtended extends FluentiInstance {
  d: FormatDateFn
  n: FormatNumberFn
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): FluentiTypeConfig['localizedString']
}

// ---- Deprecated Aliases (backward compatibility) ----
// Scheduled for removal in next major version.

/** @deprecated Use {@link FluentiRuntimeConfig} instead */
export type FluentRuntimeConfig = FluentiRuntimeConfig
/** @deprecated Use {@link FluentiRuntimeConfigFull} instead */
export type FluentRuntimeConfigFull = FluentiRuntimeConfigFull
/** @deprecated Use {@link FluentiInstance} instead */
export type FluentInstance = FluentiInstance
/** @deprecated Use {@link FluentiInstanceExtended} instead */
export type FluentInstanceExtended = FluentiInstanceExtended
/** @deprecated Use {@link FluentiRuntimeConfig} instead */
export type FluentConfig = FluentiRuntimeConfig
/** @deprecated Use {@link FluentiRuntimeConfigFull} instead */
export type FluentConfigExtended = FluentiRuntimeConfigFull
/** @deprecated Use {@link FluentiBuildConfig} instead */
export type FluentiConfig = FluentiBuildConfig
