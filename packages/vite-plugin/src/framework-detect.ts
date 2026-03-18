export function detectFramework(id: string, code: string): 'vue' | 'solid' | 'react' {
  if (id.endsWith('.vue')) return 'vue'
  if (code.includes('@fluenti/solid') || code.includes('solid-js') || code.includes('createSignal') || code.includes('createMemo')) {
    return 'solid'
  }
  if (code.includes('@fluenti/react') || code.includes('react') || code.includes('useState') || code.includes('useEffect') || code.includes('jsx')) {
    return 'react'
  }
  return 'vue'
}
