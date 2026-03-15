/**
 * FNV-1a hash — same algorithm as @fluenti/cli.
 * Produces deterministic 6-8 char alphanumeric IDs.
 */
export function hashMessage(message: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}
