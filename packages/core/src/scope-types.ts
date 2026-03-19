import type { SourceNode } from './source-analysis'
import type { ImportDeclarationNode } from './scope-ast-helpers'

export interface Scope {
  bindings: Set<string>
  parent: Scope | null
}

export function createScope(parent: Scope | null): Scope {
  return { bindings: new Set(), parent }
}

export interface Replacement {
  start: number
  end: number
  replacement: string
}

export const FLUENTI_PACKAGES = {
  react: '@fluenti/react',
  vue: '@fluenti/vue',
  solid: '@fluenti/solid',
} as const

export const NEXT_I18N_MODULES = new Set(['@fluenti/next', '@fluenti/next/server'])
export const SERVER_AUTHORING_EXPORTS = new Set(['Trans', 'Plural', 'Select', 'DateTime', 'NumberFormat'])

export interface ScopeTransformOptions {
  framework: 'vue' | 'solid' | 'react'
  allowTopLevelImportedT?: boolean
  serverModuleImport?: string
  treatFrameworkDirectImportsAsServer?: boolean
  rerouteServerAuthoringImports?: boolean
  errorOnServerUseI18n?: boolean
}

export interface ScopeTransformResult {
  code: string
  transformed: boolean
}

export interface ProgramNode extends SourceNode {
  type: 'Program'
  body: SourceNode[]
}

export interface TaggedTemplateExpressionNode extends SourceNode {
  type: 'TaggedTemplateExpression'
  tag: SourceNode
  quasi: TemplateLiteralNode
}

export interface TemplateLiteralNode extends SourceNode {
  type: 'TemplateLiteral'
  quasis: TemplateElementNode[]
  expressions: SourceNode[]
}

export interface TemplateElementNode extends SourceNode {
  type: 'TemplateElement'
  value: { raw: string; cooked: string | null }
}

export interface AssignmentPatternNode extends SourceNode {
  type: 'AssignmentPattern'
  left: SourceNode
}

export interface ArrayPatternNode extends SourceNode {
  type: 'ArrayPattern'
  elements: Array<SourceNode | null>
}

export interface RestElementNode extends SourceNode {
  type: 'RestElement'
  argument: SourceNode
}

export interface FunctionLikeNode extends SourceNode {
  body: SourceNode
  async?: boolean
  params?: SourceNode[]
  id?: SourceNode | null
  expression?: boolean
}

export interface ImportBindings {
  useI18n: Set<string>
  getI18n: Set<string>
  directClientT: Map<string, DirectImportBinding>
  directServerT: Map<string, DirectImportBinding>
  frameworkImports: ImportDeclarationNode[]
  serverImports: ImportDeclarationNode[]
}

export interface DirectImportBinding {
  local: string
  source: string
  declaration: ImportDeclarationNode
  kind: 'client' | 'server'
}

export interface TargetContext {
  node: ProgramNode | FunctionLikeNode
  scope: Scope
  clientEligible: boolean
  serverEligible: boolean
  helperNames: Partial<Record<'client' | 'server', string>>
  needsHelper: Set<'client' | 'server'>
  needsEagerResolve: boolean
  eagerResolveName?: string
}

export interface TemplateTranslationParts {
  message: string
  values: SourceNode[]
}

export interface StaticDescriptor {
  id?: string
  message: string
  context?: string
}
