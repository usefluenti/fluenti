import type { ScopeTransformOptions } from '../../src/scope-transform'

export interface DocsSnippetFixture {
  name: string
  code: string
  options: ScopeTransformOptions
  expected: {
    transformed: boolean
    contains?: string[]
    excludes?: string[]
  }
}

export const docsSnippetFixtures: readonly DocsSnippetFixture[] = [
  {
    name: 'react quick start',
    code: [
      "import { t } from '@fluenti/react'",
      'export function Hero({ name }) {',
      '  return <h1>{t`Hello ${name}`}</h1>',
      '}',
    ].join('\n'),
    options: { framework: 'react' },
    expected: {
      transformed: true,
      contains: [
        "import { useI18n } from '@fluenti/react'",
        'const { t: __fluenti_t } = useI18n()',
        "__fluenti_t({ id:",
      ],
      excludes: ["import { t } from '@fluenti/react'", 't`Hello ${name}`'],
    },
  },
  {
    name: 'vue quick start',
    code: [
      "import { t } from '@fluenti/vue'",
      "import { ref } from 'vue'",
      "const name = ref('World')",
      'const title = t`Hello ${name}`',
    ].join('\n'),
    options: { framework: 'vue', allowTopLevelImportedT: true },
    expected: {
      transformed: true,
      contains: [
        "import { useI18n } from '@fluenti/vue'",
        'const { t: __fluenti_t } = useI18n()',
        "__fluenti_t({ id:",
      ],
      excludes: ["import { t } from '@fluenti/vue'", 't`Hello ${name}`'],
    },
  },
  {
    name: 'solid quick start',
    code: [
      "import { t } from '@fluenti/solid'",
      'export function Greeting(props) {',
      '  return <p>{t`Hello ${props.name}`}</p>',
      '}',
    ].join('\n'),
    options: { framework: 'solid' },
    expected: {
      transformed: true,
      contains: [
        "import { useI18n } from '@fluenti/solid'",
        'const { t: __fluenti_t } = useI18n()',
        "__fluenti_t({ id:",
      ],
      excludes: ["import { t } from '@fluenti/solid'", 't`Hello ${props.name}`'],
    },
  },
  {
    name: 'next client authoring',
    code: [
      "'use client'",
      "import { t } from '@fluenti/react'",
      'export function Nav({ label }) {',
      '  return <span>{t`Go to ${label}`}</span>',
      '}',
    ].join('\n'),
    options: { framework: 'react' },
    expected: {
      transformed: true,
      contains: [
        "import { useI18n } from '@fluenti/react'",
        'const { t: __fluenti_t } = useI18n()',
      ],
      excludes: ["import { t } from '@fluenti/react'"],
    },
  },
  {
    name: 'next server authoring',
    code: [
      "import { t, Trans, Plural, Select } from '@fluenti/react'",
      'export default async function Page({ name }) {',
      '  return (',
      '    <>',
      '      <h1>{t`Hello ${name}`}</h1>',
      '      <Trans>Hello</Trans>',
      '      <Plural value={1} one=\"# item\" other=\"# items\" />',
      '      <Select value=\"admin\" options={{ admin: \"Admin\" }} other=\"Guest\" />',
      '    </>',
      '  )',
      '}',
    ].join('\n'),
    options: {
      framework: 'react',
      serverModuleImport: '@fluenti/next/__generated',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
      errorOnServerUseI18n: true,
    },
    expected: {
      transformed: true,
      contains: [
        'getI18n',
        "from '@fluenti/next/__generated'",
        'Trans',
        'Plural',
        'Select',
        'const __fluenti_get_i18n = async () => {',
        '(await __fluenti_get_i18n()).t({ id:',
      ],
      excludes: ["import { t, Trans, Plural, Select } from '@fluenti/react'"],
    },
  },
  {
    name: 'without build plugin components',
    code: [
      "import { Trans, Plural, Select } from '@fluenti/react'",
      'export function Banner({ count, role }) {',
      '  return (',
      '    <>',
      '      <Trans>Hello <strong>world</strong></Trans>',
      '      <Plural value={count} one=\"# item\" other=\"# items\" />',
      '      <Select value={role} options={{ admin: \"Admin\" }} other=\"Guest\" />',
      '    </>',
      '  )',
      '}',
    ].join('\n'),
    options: { framework: 'react' },
    expected: {
      transformed: false,
    },
  },
] as const
