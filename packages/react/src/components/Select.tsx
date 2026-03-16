import { type ReactNode } from 'react'

export interface SelectProps {
  /** The selector value */
  value: string
  /** Default case */
  other: ReactNode
  /** Named cases — any string key maps to a ReactNode */
  [key: string]: ReactNode | string
}

/**
 * `<Select>` — ICU select for gender, role, or other categorical values.
 *
 * @example
 * ```tsx
 * <Select
 *   value={gender}
 *   male="He liked your post"
 *   female="She liked your post"
 *   other="They liked your post"
 * />
 * ```
 */
export function Select(props: SelectProps) {
  const { value, other, ...cases } = props
  const selected = cases[value] ?? other
  return <>{selected}</>
}
