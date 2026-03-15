/**
 * FNV-1a hash producing a short alphanumeric string (6-8 chars).
 * Used as the message ID when no explicit ID is provided.
 */
export function hashMessage(message: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Convert to unsigned 32-bit and encode as base36 (alphanumeric)
  const unsigned = hash >>> 0
  return unsigned.toString(36)
}
