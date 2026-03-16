import { bench, describe } from 'vitest'
import { parse } from '../src/parser'
import { compile } from '../src/compile'
import { MESSAGES } from './_helpers'

// Pre-parse all ASTs so we only measure compilation
const AST = {
  plain: parse(MESSAGES.plain),
  singleVar: parse(MESSAGES.singleVar),
  multiVar: parse(MESSAGES.multiVar),
  pluralSimple: parse(MESSAGES.pluralSimple),
  pluralArabic: parse(MESSAGES.pluralArabic),
  select: parse(MESSAGES.select),
  nestedPluralSelect: parse(MESSAGES.nestedPluralSelect),
  functionNumber: parse(MESSAGES.functionNumber),
  longMessage: parse(MESSAGES.longMessage),
} as const

describe('compile', () => {
  bench('static text (string optimization)', () => {
    compile(AST.plain)
  })

  bench('single variable', () => {
    compile(AST.singleVar)
  })

  bench('multi variable', () => {
    compile(AST.multiVar)
  })

  bench('plural (simple)', () => {
    compile(AST.pluralSimple, 'en')
  })

  bench('plural (6 forms / Arabic)', () => {
    compile(AST.pluralArabic, 'ar')
  })

  bench('select', () => {
    compile(AST.select)
  })

  bench('nested plural + select', () => {
    compile(AST.nestedPluralSelect, 'en')
  })

  bench('function (number)', () => {
    compile(AST.functionNumber, 'en')
  })

  bench('long message', () => {
    compile(AST.longMessage, 'en')
  })
})
