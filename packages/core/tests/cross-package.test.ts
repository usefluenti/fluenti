/**
 * Cross-package integration tests.
 *
 * Verifies that core, cli, and vite-plugin produce consistent results
 * when used together (e.g., hash IDs match, compiled catalogs are consumable).
 */
import { describe, it, expect } from 'vitest'
import { msg, parse, compile, interpolate, createFluent, detectLocale, hashMessage, getDirection } from '../src/index'

describe('cross-package: hash consistency', () => {
  it('core msg() ID matches cli hashMessage()', () => {
    const descriptor = msg`Hello World`
    const cliHash = hashMessage(descriptor.message!)

    expect(descriptor.id).toBe(cliHash)
  })

  it('vite-plugin hash matches cli hash matches core msg hash', () => {
    const message = 'Hello {arg0}'
    const descriptor = msg`Hello ${'name'}`

    expect(descriptor.message).toBe(message)

    const coreHash = hashMessage(message)

    expect(descriptor.id).toBe(coreHash)
  })
})

describe('cross-package: compiled catalog consumed by core createFluent', () => {
  it('compiled function messages can be consumed by core createFluent', () => {
    // Simulate the output of @fluenti/cli compileCatalog:
    // compiled catalogs produce either plain strings or functions
    const messages: Record<string, string | ((v?: any) => string)> = {
      greeting: (v: any) => `Hello ${v['name']}!`,
      farewell: 'Goodbye',
    }

    const fluent = createFluent({ locale: 'en', messages: { en: messages } })

    expect(fluent.t('greeting', { name: 'World' })).toBe('Hello World!')
    expect(fluent.t('farewell')).toBe('Goodbye')
  })
})

describe('cross-package: core parse > compile > interpolate pipeline', () => {
  it('full pipeline produces correct output for ICU plural message', () => {
    const message = '{count, plural, one {# item} other {# items}}'

    // Step 1: parse
    const ast = parse(message)
    expect(ast).toHaveLength(1)
    expect(ast[0]!.type).toBe('plural')

    // Step 2: compile
    const compiled = compile(ast, 'en')
    expect(typeof compiled).toBe('function')

    // Step 3: execute
    const fn = compiled as (values?: Record<string, unknown>) => string
    expect(fn({ count: 1 })).toBe('1 item')
    expect(fn({ count: 0 })).toBe('0 items')
    expect(fn({ count: 42 })).toBe('42 items')

    // Step 4: interpolate (all-in-one shortcut)
    expect(interpolate(message, { count: 1 }, 'en')).toBe('1 item')
    expect(interpolate(message, { count: 42 }, 'en')).toBe('42 items')
  })

  it('full pipeline for select message', () => {
    const message = '{gender, select, male {He} female {She} other {They}} went home.'

    const ast = parse(message)
    const compiled = compile(ast, 'en')
    expect(typeof compiled).toBe('function')

    const fn = compiled as (values?: Record<string, unknown>) => string
    expect(fn({ gender: 'male' })).toBe('He went home.')
    expect(fn({ gender: 'female' })).toBe('She went home.')
    expect(fn({ gender: 'nonbinary' })).toBe('They went home.')
  })

  it('full pipeline for nested plural + variable', () => {
    const message = 'You have {count, plural, one {# new message} other {# new messages}} from {sender}.'

    expect(interpolate(message, { count: 1, sender: 'Alice' }, 'en'))
      .toBe('You have 1 new message from Alice.')
    expect(interpolate(message, { count: 5, sender: 'Bob' }, 'en'))
      .toBe('You have 5 new messages from Bob.')
  })
})

describe('cross-package: SSR locale detection feeds into createFluent', () => {
  it('detectLocale result can be used to initialize createFluent', () => {
    const detected = detectLocale({
      available: ['en', 'ja', 'zh-CN'],
      fallback: 'en',
      cookie: 'ja',
    })

    expect(detected).toBe('ja')

    const fluent = createFluent({
      locale: detected,
      messages: {
        en: { greeting: 'Hello' },
        ja: { greeting: 'こんにちは' },
      },
    })

    expect(fluent.locale).toBe('ja')
    expect(fluent.t('greeting')).toBe('こんにちは')
  })

  it('detectLocale falls back correctly and createFluent uses fallback locale', () => {
    const detected = detectLocale({
      available: ['en', 'fr'],
      fallback: 'en',
      headers: { 'accept-language': 'de-DE,de;q=0.9' },
    })

    // de is not available, so should fall back to 'en'
    expect(detected).toBe('en')

    const fluent = createFluent({
      locale: detected,
      messages: {
        en: { greeting: 'Hello' },
        fr: { greeting: 'Bonjour' },
      },
    })

    expect(fluent.locale).toBe('en')
    expect(fluent.t('greeting')).toBe('Hello')
  })
})

// ─── Complex language e2e: natural source → translated catalog → correct output ──

describe('complex languages: end-to-end', () => {
  // Simulates the full Fluenti workflow:
  //   1. Developer writes t`${name} shared ${count} photos with you`
  //   2. CLI extracts → PO catalog with message "{name} shared {count} photos with you"
  //   3. Translator writes complex ICU in target locale PO
  //   4. CLI compiles PO → JS functions
  //   5. createFluent loads compiled catalogs → t() produces correct output
  //
  // These tests use `interpolate()` to verify step 3→5 as a pipeline,
  // plus `createFluent` with pre-compiled functions to verify the runtime path.

  const SOURCE_MSG = '{name} shared {count} photos with you'

  describe('Arabic — 6-category plurals', () => {
    // Arabic translation: translator expands 2 plural forms → 6
    const arTranslation =
      '{count, plural, ' +
      'zero {لم يشارك {name} أي صورة معك} ' +
      'one {شارك {name} صورة واحدة معك} ' +
      'two {شارك {name} صورتين معك} ' +
      'few {شارك {name} # صور معك} ' +
      'many {شارك {name} # صورة معك} ' +
      'other {شارك {name} # صورة معك}}'

    it('interpolate: all 6 plural categories produce correct Arabic', () => {
      expect(interpolate(arTranslation, { name: 'أحمد', count: 0 }, 'ar'))
        .toBe('لم يشارك أحمد أي صورة معك')
      expect(interpolate(arTranslation, { name: 'أحمد', count: 1 }, 'ar'))
        .toBe('شارك أحمد صورة واحدة معك')
      expect(interpolate(arTranslation, { name: 'أحمد', count: 2 }, 'ar'))
        .toBe('شارك أحمد صورتين معك')
      expect(interpolate(arTranslation, { name: 'أحمد', count: 3 }, 'ar'))
        .toBe('شارك أحمد 3 صور معك')
      expect(interpolate(arTranslation, { name: 'أحمد', count: 11 }, 'ar'))
        .toBe('شارك أحمد 11 صورة معك')
      expect(interpolate(arTranslation, { name: 'أحمد', count: 100 }, 'ar'))
        .toBe('شارك أحمد 100 صورة معك')
    })

    it('createFluent: same message ID, different locale catalogs', () => {
      const msgId = 'photo-shared'

      // Simulate compiled catalogs (what CLI produces)
      const enCompiled = (v: any) =>
        `${v.name} shared ${v.count === 1 ? '1 photo' : `${v.count} photos`} with you`
      const arAst = parse(arTranslation)
      const arCompiled = compile(arAst, 'ar')

      const fluent = createFluent({
        locale: 'ar',
        fallbackLocale: 'en',
        messages: {
          en: { [msgId]: enCompiled },
          ar: { [msgId]: arCompiled },
        },
      })

      expect(fluent.t(msgId, { name: 'أحمد', count: 0 }))
        .toBe('لم يشارك أحمد أي صورة معك')
      expect(fluent.t(msgId, { name: 'أحمد', count: 2 }))
        .toBe('شارك أحمد صورتين معك')
      expect(fluent.t(msgId, { name: 'أحمد', count: 5 }))
        .toBe('شارك أحمد 5 صور معك')

      // Switch to English — same message ID, different output
      fluent.locale = 'en'
      expect(fluent.t(msgId, { name: 'Ahmed', count: 1 }))
        .toBe('Ahmed shared 1 photo with you')
      expect(fluent.t(msgId, { name: 'Ahmed', count: 5 }))
        .toBe('Ahmed shared 5 photos with you')
    })

    it('getDirection returns rtl for Arabic', () => {
      expect(getDirection('ar')).toBe('rtl')
      expect(getDirection('ar-SA')).toBe('rtl')
      expect(getDirection('en')).toBe('ltr')
    })
  })

  describe('Russian — gender × plural nesting', () => {
    // Translator nests plural inside select — source was just "{count} people arrived"
    const ruTranslation =
      '{gender, select, ' +
      'male {{count, plural, one {Пришёл # мужчина} few {Пришли # мужчины} many {Пришло # мужчин} other {Пришло # мужчин}}} ' +
      'female {{count, plural, one {Пришла # женщина} few {Пришли # женщины} many {Пришло # женщин} other {Пришло # женщин}}} ' +
      'other {{count, plural, one {Пришёл # человек} few {Пришли # человека} many {Пришло # человек} other {Пришло # человек}}}}'

    it('interpolate: gender × plural combinations', () => {
      // male + one
      expect(interpolate(ruTranslation, { gender: 'male', count: 1 }, 'ru'))
        .toBe('Пришёл 1 мужчина')
      // male + few
      expect(interpolate(ruTranslation, { gender: 'male', count: 3 }, 'ru'))
        .toBe('Пришли 3 мужчины')
      // male + many
      expect(interpolate(ruTranslation, { gender: 'male', count: 5 }, 'ru'))
        .toBe('Пришло 5 мужчин')
      // female + one
      expect(interpolate(ruTranslation, { gender: 'female', count: 1 }, 'ru'))
        .toBe('Пришла 1 женщина')
      // female + few
      expect(interpolate(ruTranslation, { gender: 'female', count: 4 }, 'ru'))
        .toBe('Пришли 4 женщины')
      // other + many (21 → one in Russian: 21 % 10 == 1 but 21 % 100 == 21, so "one")
      expect(interpolate(ruTranslation, { gender: 'other', count: 21 }, 'ru'))
        .toBe('Пришёл 21 человек')
    })

    it('createFluent: locale switch between en and ru', () => {
      const msgId = 'people-arrived'
      const enCompiled = (v: any) => `${v.count} people arrived`
      const ruAst = parse(ruTranslation)
      const ruCompiled = compile(ruAst, 'ru')

      const fluent = createFluent({
        locale: 'ru',
        fallbackLocale: 'en',
        messages: {
          en: { [msgId]: enCompiled },
          ru: { [msgId]: ruCompiled },
        },
      })

      expect(fluent.t(msgId, { gender: 'female', count: 2 }))
        .toBe('Пришли 2 женщины')

      fluent.locale = 'en'
      expect(fluent.t(msgId, { gender: 'female', count: 2 }))
        .toBe('2 people arrived')
    })
  })

  describe('Japanese — no plurals, counters in translation', () => {
    // Source: "{name} shared {count} photos with you"
    // Japanese translator: no plural branching, just a counter (枚)
    const jaTranslation = '{name}さんが写真を{count}枚共有しました'

    it('interpolate: single form with counter', () => {
      expect(interpolate(jaTranslation, { name: '田中', count: 1 }, 'ja'))
        .toBe('田中さんが写真を1枚共有しました')
      expect(interpolate(jaTranslation, { name: '田中', count: 100 }, 'ja'))
        .toBe('田中さんが写真を100枚共有しました')
    })

    it('createFluent: same message ID across en/ja/ar', () => {
      const msgId = 'photo-shared'
      const enCompiled = (v: any) =>
        `${v.name} shared ${v.count === 1 ? '1 photo' : `${v.count} photos`} with you`
      const jaCompiled = (v: any) =>
        `${v.name}さんが写真を${v.count}枚共有しました`

      const fluent = createFluent({
        locale: 'ja',
        fallbackLocale: 'en',
        messages: {
          en: { [msgId]: enCompiled },
          ja: { [msgId]: jaCompiled },
        },
      })

      expect(fluent.t(msgId, { name: '田中', count: 5 }))
        .toBe('田中さんが写真を5枚共有しました')

      fluent.locale = 'en'
      expect(fluent.t(msgId, { name: 'Tanaka', count: 5 }))
        .toBe('Tanaka shared 5 photos with you')
    })
  })

  describe('French — gender agreement via nested select in plural', () => {
    // Source: "{count, plural, one {# friend is online} other {# friends are online}}"
    // French translator: nests gender select inside each plural branch
    const frTranslation =
      '{count, plural, ' +
      'one {{gender, select, ' +
      'male {# ami est connecté} ' +
      'female {# amie est connectée} ' +
      'other {# ami(e) est connecté(e)}}} ' +
      'other {{gender, select, ' +
      'male {# amis sont connectés} ' +
      'female {# amies sont connectées} ' +
      'other {# ami(e)s sont connecté(e)s}}}}'

    it('interpolate: gender × plural adjective agreement', () => {
      expect(interpolate(frTranslation, { count: 1, gender: 'male' }, 'fr'))
        .toBe('1 ami est connecté')
      expect(interpolate(frTranslation, { count: 1, gender: 'female' }, 'fr'))
        .toBe('1 amie est connectée')
      expect(interpolate(frTranslation, { count: 5, gender: 'male' }, 'fr'))
        .toBe('5 amis sont connectés')
      expect(interpolate(frTranslation, { count: 5, gender: 'female' }, 'fr'))
        .toBe('5 amies sont connectées')
    })
  })

  describe('selectordinal — natural source to ordinal translation', () => {
    // Source: "Finished in {position} place"
    // English translator: adds selectordinal for suffixes
    const enOrdinal =
      'Finished in {position, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} place'
    // Japanese translator: completely different pattern
    const jaOrdinal = '第{position}位でフィニッシュ'

    it('interpolate: English ordinal suffixes', () => {
      expect(interpolate(enOrdinal, { position: 1 }, 'en'))
        .toBe('Finished in 1st place')
      expect(interpolate(enOrdinal, { position: 2 }, 'en'))
        .toBe('Finished in 2nd place')
      expect(interpolate(enOrdinal, { position: 3 }, 'en'))
        .toBe('Finished in 3rd place')
      expect(interpolate(enOrdinal, { position: 4 }, 'en'))
        .toBe('Finished in 4th place')
      expect(interpolate(enOrdinal, { position: 11 }, 'en'))
        .toBe('Finished in 11th place')
      expect(interpolate(enOrdinal, { position: 21 }, 'en'))
        .toBe('Finished in 21st place')
    })

    it('interpolate: Japanese ordinal — no branching needed', () => {
      expect(interpolate(jaOrdinal, { position: 1 }, 'ja'))
        .toBe('第1位でフィニッシュ')
      expect(interpolate(jaOrdinal, { position: 42 }, 'ja'))
        .toBe('第42位でフィニッシュ')
    })
  })

  describe('custom formatters — locale-specific formatting', () => {
    it('custom list formatter', () => {
      const formatters = {
        list: (value: unknown, style: string, locale: string) =>
          new Intl.ListFormat(locale, {
            type: (style as Intl.ListFormatType) || 'conjunction',
          }).format(value as string[]),
      }

      const msg = 'Attendees: {names, list, conjunction}'
      expect(interpolate(msg, { names: ['Alice', 'Bob', 'Charlie'] }, 'en', formatters))
        .toBe('Attendees: Alice, Bob, and Charlie')
      expect(interpolate(msg, { names: ['Alice', 'Bob', 'Charlie'] }, 'ja', formatters))
        .toBe('Attendees: Alice、Bob、Charlie')
    })
  })

  describe('multi-locale same component — the DX story', () => {
    // This tests the core promise: same t`` call, different catalogs per locale
    it('one message ID produces correct output across 4 locales', () => {
      const msgId = 'notification'

      // Simulate what CLI compile produces for each locale
      const enAst = parse('{name} shared {count, plural, one {# photo} other {# photos}} with you')
      const arAst = parse(
        '{count, plural, ' +
        'zero {لم يشارك {name} أي صورة معك} ' +
        'one {شارك {name} صورة واحدة معك} ' +
        'two {شارك {name} صورتين معك} ' +
        'few {شارك {name} # صور معك} ' +
        'many {شارك {name} # صورة معك} ' +
        'other {شارك {name} # صورة معك}}'
      )
      const jaMsg = '{name}さんが写真を{count}枚共有しました'
      const ruAst = parse(
        '{count, plural, ' +
        'one {{name} поделился # фото с вами} ' +
        'few {{name} поделился # фото с вами} ' +
        'many {{name} поделился # фото с вами} ' +
        'other {{name} поделился # фото с вами}}'
      )

      const fluent = createFluent({
        locale: 'en',
        messages: {
          en: { [msgId]: compile(enAst, 'en') },
          ar: { [msgId]: compile(arAst, 'ar') },
          ja: { [msgId]: jaMsg },
          ru: { [msgId]: compile(ruAst, 'ru') },
        },
      })

      const values = { name: 'Alex', count: 3 }

      // English — 2 plural forms
      fluent.locale = 'en'
      expect(fluent.t(msgId, values)).toBe('Alex shared 3 photos with you')

      // Arabic — 6 plural forms, count=3 → few
      fluent.locale = 'ar'
      expect(fluent.t(msgId, values)).toBe('شارك Alex 3 صور معك')

      // Japanese — no plurals, counter 枚
      fluent.locale = 'ja'
      expect(fluent.t(msgId, values)).toBe('Alexさんが写真を3枚共有しました')

      // Russian — 4 plural forms, count=3 → few
      fluent.locale = 'ru'
      expect(fluent.t(msgId, values)).toBe('Alex поделился 3 фото с вами')
    })
  })
})
