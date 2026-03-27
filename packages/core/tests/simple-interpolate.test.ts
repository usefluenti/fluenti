import { describe, it, expect } from 'vitest'
import { createFluentiCore } from '../src/index'

/**
 * Tests for the private `simpleInterpolate` function inside `src/index.ts`.
 *
 * Since `simpleInterpolate` is not exported, we test it indirectly through
 * `createFluentiCore` with NO `config.interpolate` (uses simpleInterpolate
 * by default). We use `format()` and catalog string messages with `{key}`
 * placeholders to exercise the interpolator.
 */
describe('simpleInterpolate (via format/catalog)', () => {
  function createInstance() {
    return createFluentiCore({
      locale: 'en',
      messages: { en: {} },
    })
  }

  it('basic {name} replacement', () => {
    const i18n = createInstance()
    expect(i18n.format('Hello {name}', { name: 'World' })).toBe('Hello World')
  })

  it('multiple placeholders {first} {last}', () => {
    const i18n = createInstance()
    expect(i18n.format('{first} {last}', { first: 'Jane', last: 'Doe' })).toBe('Jane Doe')
  })

  it('missing value keeps {key} literal', () => {
    const i18n = createInstance()
    expect(i18n.format('Hello {name}', { other: 'x' })).toBe('Hello {name}')
  })

  it('null value keeps {key} literal', () => {
    const i18n = createInstance()
    expect(i18n.format('Hello {name}', { name: null })).toBe('Hello {name}')
  })

  it('undefined value keeps {key} literal', () => {
    const i18n = createInstance()
    expect(i18n.format('Hello {name}', { name: undefined })).toBe('Hello {name}')
  })

  it('0 and false values are stringified correctly', () => {
    const i18n = createInstance()
    expect(i18n.format('{a} and {b}', { a: 0, b: false })).toBe('0 and false')
  })

  it('no values parameter returns message unchanged', () => {
    const i18n = createInstance()
    expect(i18n.format('Hello {name}')).toBe('Hello {name}')
  })

  it('empty values {} keeps all placeholders', () => {
    const i18n = createInstance()
    expect(i18n.format('{a} {b} {c}', {})).toBe('{a} {b} {c}')
  })

  it('no placeholders returns unchanged', () => {
    const i18n = createInstance()
    expect(i18n.format('Hello World', { name: 'X' })).toBe('Hello World')
  })

  it('numeric keys like {arg0}', () => {
    const i18n = createInstance()
    expect(i18n.format('{arg0} items', { arg0: 42 })).toBe('42 items')
  })

  it('non-word-char keys {my-key} are NOT matched by \\w+ regex', () => {
    const i18n = createInstance()
    // {my-key} does not match \w+ because '-' is not a word char
    // The regex matches {my only, leaving -key} as literal
    expect(i18n.format('{my-key}', { 'my-key': 'val' })).not.toBe('val')
  })

  it('nested braces {outer{inner}} only matches \\w+ group', () => {
    const i18n = createInstance()
    // The regex \{(\w+)\} will match {inner} inside the outer braces
    const result = i18n.format('{outer{inner}}', { inner: 'REPLACED' })
    expect(result).toContain('REPLACED')
    expect(result).toContain('{outer')
  })

  it('special chars in values: <script>, {, }', () => {
    const i18n = createInstance()
    expect(i18n.format('{a}', { a: '<script>alert(1)</script>' }))
      .toBe('<script>alert(1)</script>')
    expect(i18n.format('{a}', { a: '{curly}' })).toBe('{curly}')
    expect(i18n.format('{a}', { a: '}' })).toBe('}')
  })

  it('empty string value replaces with empty', () => {
    const i18n = createInstance()
    expect(i18n.format('Hello {name}!', { name: '' })).toBe('Hello !')
  })

  it('Object/Array values are stringified via String()', () => {
    const i18n = createInstance()
    expect(i18n.format('{a}', { a: [1, 2, 3] })).toBe('1,2,3')
    expect(i18n.format('{a}', { a: { toString: () => 'obj' } })).toBe('obj')
  })

  it('ICU syntax {count, plural, ...} is not parsed by simpleInterpolate', () => {
    const i18n = createInstance()
    // "{count," does not match \w+ because of the comma
    // So the entire ICU syntax remains as-is
    const result = i18n.format('{count, plural, =0 {none} one {# item} other {# items}}', { count: 5 })
    // The regex only matches {count} if it were alone, but `{count,` has a comma
    // so the whole thing passes through unchanged (except possibly nested {none}, {item}, etc.)
    expect(result).not.toBe('5 items') // simpleInterpolate cannot handle ICU
  })
})
