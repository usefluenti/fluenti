import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import DateTimeTest from './fixtures/DateTimeTest.svelte'
import NumberTest from './fixtures/NumberTest.svelte'

describe('DateTime component', () => {
  it('formats a date', () => {
    const { container } = render(DateTimeTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: new Date(2024, 0, 15),
      },
    })

    expect(container.textContent).toBeTruthy()
    expect(container.textContent!.length).toBeGreaterThan(0)
  })
})

describe('Number component', () => {
  it('formats a number', () => {
    const { container } = render(NumberTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 1234.56,
      },
    })

    expect(container.textContent).toContain('1,234')
  })
})
