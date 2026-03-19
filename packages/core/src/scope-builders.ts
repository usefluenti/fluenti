import { createMessageId } from './identity'
import {
  identifier,
  stringLiteral,
  objectProperty,
  objectExpression,
  callExpression,
  memberExpression,
  awaitExpression,
  type CallExpressionNode,
  type ObjectExpressionNode,
  type ObjectPropertyNode,
} from './scope-ast-helpers'
import type { SourceNode } from './source-analysis'
import { classifyExpression } from './scope-utils'
import { readPropertyKey, readStaticStringValue } from './scope-read'
import type {
  TaggedTemplateExpressionNode,
  TemplateTranslationParts,
  StaticDescriptor,
} from './scope-types'

export function buildRuntimeTaggedTemplateCall(
  code: string,
  expression: TaggedTemplateExpressionNode,
  calleeName: string,
): SourceNode {
  const parts = extractTemplateTranslationParts(code, expression)
  const descriptorProperties: SourceNode[] = [
    objectProperty(identifier('id'), stringLiteral(createMessageId(parts.message))),
    objectProperty(identifier('message'), stringLiteral(parts.message)),
  ]

  const args: SourceNode[] = [objectExpression(descriptorProperties)]
  if (parts.values.length > 0) {
    args.push(objectExpression(parts.values))
  }

  return callExpression(identifier(calleeName), args, expression)
}

export function buildImportedTaggedTemplateCall(
  code: string,
  expression: TaggedTemplateExpressionNode,
  helperName: string,
): SourceNode {
  const parts = extractTemplateTranslationParts(code, expression)
  const descriptorProperties: SourceNode[] = [
    objectProperty(identifier('id'), stringLiteral(createMessageId(parts.message))),
    objectProperty(identifier('message'), stringLiteral(parts.message)),
  ]

  const args: SourceNode[] = [objectExpression(descriptorProperties)]
  if (parts.values.length > 0) {
    args.push(objectExpression(parts.values))
  }

  return callExpression(identifier(helperName), args, expression)
}

export function buildImportedDescriptorCall(
  call: CallExpressionNode,
  helperName: string,
): SourceNode {
  if (call.arguments.length === 0) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const descriptor = extractStaticDescriptor(call.arguments[0]!)
  if (!descriptor) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const runtimeDescriptor = [
    objectProperty(identifier('id'), stringLiteral(descriptor.id ?? createMessageId(descriptor.message, descriptor.context))),
    objectProperty(identifier('message'), stringLiteral(descriptor.message)),
  ]
  if (descriptor.context !== undefined) {
    runtimeDescriptor.push(objectProperty(identifier('context'), stringLiteral(descriptor.context)))
  }

  const args: SourceNode[] = [objectExpression(runtimeDescriptor)]
  if (call.arguments[1]) {
    args.push(call.arguments[1]!)
  }

  return callExpression(identifier(helperName), args, call)
}

export function buildImportedServerTaggedTemplateCall(
  code: string,
  expression: TaggedTemplateExpressionNode,
  helperName: string,
): SourceNode {
  const parts = extractTemplateTranslationParts(code, expression)
  const descriptorProperties: SourceNode[] = [
    objectProperty(identifier('id'), stringLiteral(createMessageId(parts.message))),
    objectProperty(identifier('message'), stringLiteral(parts.message)),
  ]

  const args: SourceNode[] = [objectExpression(descriptorProperties)]
  if (parts.values.length > 0) {
    args.push(objectExpression(parts.values))
  }

  return callExpression(
    memberExpression(awaitExpression(callExpression(identifier(helperName), [])), identifier('t')),
    args,
    expression,
  )
}

export function buildImportedServerDescriptorCall(
  call: CallExpressionNode,
  helperName: string,
): SourceNode {
  if (call.arguments.length === 0) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const descriptor = extractStaticDescriptor(call.arguments[0]!)
  if (!descriptor) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const runtimeDescriptor = [
    objectProperty(identifier('id'), stringLiteral(descriptor.id ?? createMessageId(descriptor.message, descriptor.context))),
    objectProperty(identifier('message'), stringLiteral(descriptor.message)),
  ]
  if (descriptor.context !== undefined) {
    runtimeDescriptor.push(objectProperty(identifier('context'), stringLiteral(descriptor.context)))
  }

  const args: SourceNode[] = [objectExpression(runtimeDescriptor)]
  if (call.arguments[1]) {
    args.push(call.arguments[1]!)
  }

  return callExpression(
    memberExpression(awaitExpression(callExpression(identifier(helperName), [])), identifier('t')),
    args,
    call,
  )
}

export function buildSyncServerTaggedTemplateCall(
  code: string,
  expression: TaggedTemplateExpressionNode,
  resolvedName: string,
): SourceNode {
  const parts = extractTemplateTranslationParts(code, expression)
  const descriptorProperties: SourceNode[] = [
    objectProperty(identifier('id'), stringLiteral(createMessageId(parts.message))),
    objectProperty(identifier('message'), stringLiteral(parts.message)),
  ]

  const args: SourceNode[] = [objectExpression(descriptorProperties)]
  if (parts.values.length > 0) {
    args.push(objectExpression(parts.values))
  }

  return callExpression(
    memberExpression(identifier(resolvedName), identifier('t')),
    args,
    expression,
  )
}

export function buildSyncServerDescriptorCall(
  call: CallExpressionNode,
  resolvedName: string,
): SourceNode {
  if (call.arguments.length === 0) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const descriptor = extractStaticDescriptor(call.arguments[0]!)
  if (!descriptor) {
    throw new Error(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  }

  const runtimeDescriptor = [
    objectProperty(identifier('id'), stringLiteral(descriptor.id ?? createMessageId(descriptor.message, descriptor.context))),
    objectProperty(identifier('message'), stringLiteral(descriptor.message)),
  ]
  if (descriptor.context !== undefined) {
    runtimeDescriptor.push(objectProperty(identifier('context'), stringLiteral(descriptor.context)))
  }

  const args: SourceNode[] = [objectExpression(runtimeDescriptor)]
  if (call.arguments[1]) {
    args.push(call.arguments[1]!)
  }

  return callExpression(
    memberExpression(identifier(resolvedName), identifier('t')),
    args,
    call,
  )
}

export function extractTemplateTranslationParts(
  code: string,
  expression: TaggedTemplateExpressionNode,
): TemplateTranslationParts {
  let message = ''
  const values: SourceNode[] = []
  let positionalIndex = 0

  for (let index = 0; index < expression.quasi.quasis.length; index++) {
    const element = expression.quasi.quasis[index]!
    message += element.value.cooked ?? element.value.raw

    if (index >= expression.quasi.expressions.length) continue

    const exprNode = expression.quasi.expressions[index]!
    const exprSource = exprNode.start != null && exprNode.end != null
      ? code.slice(exprNode.start, exprNode.end)
      : ''
    const varName = classifyExpression(exprSource)

    if (varName === '') {
      const argName = `arg${positionalIndex}`
      message += `{${argName}}`
      values.push(objectProperty(identifier(argName), exprNode))
      positionalIndex++
      continue
    }

    message += `{${varName}}`
    values.push(objectProperty(identifier(varName), exprNode))
  }

  return { message, values }
}

export function extractStaticDescriptor(argument: SourceNode): StaticDescriptor | null {
  if (argument.type !== 'ObjectExpression') {
    return null
  }

  const staticParts: Partial<StaticDescriptor> = {}
  for (const property of (argument as ObjectExpressionNode).properties) {
    if (property.type !== 'ObjectProperty') continue

    const prop = property as ObjectPropertyNode
    if (prop.computed) return null

    const key = readPropertyKey(prop.key)
    if (!key || !['id', 'message', 'context', 'comment'].includes(key)) continue

    const value = readStaticStringValue(prop.value)
    if (value === undefined) return null

    if (key === 'comment') continue
    staticParts[key as keyof StaticDescriptor] = value
  }

  if (!staticParts.message) {
    return null
  }

  return staticParts as StaticDescriptor
}
