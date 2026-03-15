import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import SelectTest from './fixtures/SelectTest.svelte'

describe('Select component', () => {
  it('selects matching option from options prop', () => {
    const { container } = render(SelectTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 'male',
        options: { male: 'He liked it', female: 'She liked it' },
        other: 'They liked it',
      },
    })

    expect(container.textContent).toContain('He liked it')
  })

  it('falls back to other when no match', () => {
    const { container } = render(SelectTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 'unknown',
        options: { male: 'He', female: 'She' },
        other: 'They',
      },
    })

    expect(container.textContent).toContain('They')
  })

  it('selects female option', () => {
    const { container } = render(SelectTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 'female',
        options: { male: 'He liked it', female: 'She liked it' },
        other: 'They liked it',
      },
    })

    expect(container.textContent).toContain('She liked it')
  })
})
