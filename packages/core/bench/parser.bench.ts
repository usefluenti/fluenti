import { bench, describe } from 'vitest'
import { parse } from '../src/parser'
import { MESSAGES } from './_helpers'

describe('parser', () => {
  bench('plain text', () => {
    parse(MESSAGES.plain)
  })

  bench('single variable', () => {
    parse(MESSAGES.singleVar)
  })

  bench('multi variable', () => {
    parse(MESSAGES.multiVar)
  })

  bench('plural (simple)', () => {
    parse(MESSAGES.pluralSimple)
  })

  bench('plural (6 forms / Arabic)', () => {
    parse(MESSAGES.pluralArabic)
  })

  bench('plural + offset', () => {
    parse(MESSAGES.pluralOffset)
  })

  bench('select', () => {
    parse(MESSAGES.select)
  })

  bench('nested plural + select', () => {
    parse(MESSAGES.nestedPluralSelect)
  })

  bench('function (number)', () => {
    parse(MESSAGES.functionNumber)
  })

  bench('function (date)', () => {
    parse(MESSAGES.functionDate)
  })

  bench('escaped quotes', () => {
    parse(MESSAGES.escapedQuotes)
  })

  bench('long message (~500 chars)', () => {
    parse(MESSAGES.longMessage)
  })
})
