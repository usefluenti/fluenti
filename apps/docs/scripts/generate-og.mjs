/**
 * Generates the OG image (1200×630) for the Fluenti docs site.
 *
 * Usage: node apps/docs/scripts/generate-og.mjs
 *
 * Requires: sharp (installed as dev dependency)
 */
import { Buffer } from 'node:buffer'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(__dirname, '..', 'public', 'og-image.png')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Logo mark (white, centered at x=600, y=220) -->
  <g transform="translate(510, 130) scale(0.35)">
    <path d="M108 68L296 68C314 68 338 82 338 110" stroke="#ffffff" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M108 68L108 444" stroke="#ffffff" stroke-width="32" stroke-linecap="round"/>
    <path d="M84 256L272 256" stroke="#ffffff" stroke-width="32" stroke-linecap="round"/>
    <circle cx="348" cy="256" r="24" fill="#ffffff" opacity="0.5"/>
    <circle cx="348" cy="360" r="24" fill="#ffffff" opacity="0.35"/>
    <circle cx="348" cy="152" r="24" fill="#ffffff" opacity="0.65"/>
  </g>

  <!-- Title -->
  <text x="600" y="410" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="72" font-weight="700" fill="#ffffff">Fluenti</text>

  <!-- Tagline -->
  <text x="600" y="470" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.7)">Compile-time i18n for modern frameworks</text>
</svg>`

const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()
writeFileSync(outPath, pngBuffer)

console.log(`OG image written to ${outPath} (${pngBuffer.length} bytes)`)
