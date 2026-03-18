import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createElement, useState } from 'react'
import { act } from '@testing-library/react'
import { Select } from '../components/Select'
import { I18nProvider } from '../provider'

function withProvider(ui: React.ReactNode, locale = 'en') {
  return createElement(I18nProvider, { locale, messages: { [locale]: {} }, children: null }, ui)
}

describe('Select edge cases', () => {
  // 1. JSX in case value
  it('renders JSX in case value', () => {
    const { container } = render(
      withProvider(
        createElement(Select, {
          value: 'admin',
          admin: createElement('strong', null, 'Administrator'),
          other: 'User',
        }),
      ),
    )
    const strong = container.querySelector('strong')
    expect(strong).toBeTruthy()
    expect(strong?.textContent).toBe('Administrator')
  })

  // 2. Dynamic value change
  it('updates when value changes dynamically', () => {
    function Wrapper() {
      const [role, setRole] = useState('user')
      return createElement('div', null,
        withProvider(
          createElement(Select, {
            value: role,
            admin: 'Admin panel',
            user: 'User dashboard',
            other: 'Guest',
          }),
        ),
        createElement('button', {
          'data-testid': 'switch',
          onClick: () => setRole('admin'),
        }, 'switch'),
      )
    }

    const { container, getByTestId } = render(createElement(Wrapper))
    expect(container.textContent).toContain('User dashboard')

    act(() => {
      getByTestId('switch').click()
    })

    expect(container.textContent).toContain('Admin panel')
  })

  // 3. No match -> other
  it('falls back to other when value does not match any case', () => {
    const { container } = render(
      withProvider(
        createElement(Select, {
          value: 'unknown',
          male: 'He',
          female: 'She',
          other: 'They',
        }),
      ),
    )
    expect(container.textContent).toBe('They')
  })
})
