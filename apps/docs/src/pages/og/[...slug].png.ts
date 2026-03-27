import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import sharp from 'sharp'

/* ------------------------------------------------------------------ */
/*  Section label lookup (matches sidebar groups in astro.config.mjs) */
/* ------------------------------------------------------------------ */

const sectionLabels: Record<string, string> = {
  start: 'Start Here',
  essentials: 'Essentials',
  frameworks: 'Frameworks',
  advanced: 'Advanced',
  api: 'API Reference',
  blog: 'Blog',
}

const frameworkLabels: Record<string, string> = {
  vue: 'Vue',
  react: 'React',
  solid: 'SolidJS',
  nuxt: 'Nuxt',
}

function getSectionLabel(slug: string): string {
  const parts = slug.split('/')
  const section = parts[0]

  if (section === 'frameworks' && parts.length >= 2) {
    const framework = frameworkLabels[parts[1]] ?? parts[1]
    return `Frameworks / ${framework}`
  }

  return sectionLabels[section] ?? ''
}

/* ------------------------------------------------------------------ */
/*  SVG text helper — escapes HTML entities                           */
/* ------------------------------------------------------------------ */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/* ------------------------------------------------------------------ */
/*  Wrap long titles into multiple lines                              */
/* ------------------------------------------------------------------ */

function wrapTitle(title: string, maxCharsPerLine: number): string[] {
  const words = title.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) {
    lines.push(current)
  }

  // Limit to 3 lines max
  if (lines.length > 3) {
    const truncated = lines.slice(0, 3)
    truncated[2] = `${truncated[2].slice(0, -3)}...`
    return truncated
  }

  return lines
}

/* ------------------------------------------------------------------ */
/*  Build the SVG overlay                                             */
/* ------------------------------------------------------------------ */

function buildOverlaySvg(title: string, section: string): Buffer {
  const width = 1200
  const height = 630

  const titleLines = wrapTitle(title, 30)
  const titleFontSize = titleLines.some((l) => l.length > 24) ? 52 : 60
  const lineHeight = titleFontSize * 1.3

  // Section label sits at a fixed Y; title block starts below it.
  // The section label baseline is at sectionY, and the first title
  // baseline is sectionY + gap + titleFontSize (since SVG text y is
  // the baseline).
  const sectionY = 220
  const gap = 16
  const titleStartY = section
    ? sectionY + gap + titleFontSize
    : 260

  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('')

  // Logo SVG (scaled down, positioned top-left)
  const logo = `
    <g transform="translate(70, 60) scale(0.16)">
      <path d="M108 68L296 68C314 68 338 82 338 110" stroke="#fafafa" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M108 68L108 444" stroke="#fafafa" stroke-width="32" stroke-linecap="round"/>
      <path d="M84 256L272 256" stroke="#fafafa" stroke-width="32" stroke-linecap="round"/>
      <circle cx="348" cy="256" r="24" fill="#fafafa" opacity="0.5"/>
      <circle cx="348" cy="360" r="24" fill="#fafafa" opacity="0.35"/>
      <circle cx="348" cy="152" r="24" fill="#fafafa" opacity="0.65"/>
    </g>
  `

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(239, 50%, 28%)"/>
      <stop offset="100%" stop-color="hsl(239, 45%, 22%)"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="hsl(239, 70%, 55%)" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="hsl(239, 70%, 55%)" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- Subtle accent glow -->
  <ellipse cx="900" cy="200" rx="500" ry="300" fill="url(#accent)"/>

  <!-- Logo mark -->
  ${logo}

  <!-- Section label -->
  ${
    section
      ? `<text x="80" y="${sectionY}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="22" font-weight="500" fill="#a5b4fc" letter-spacing="0.5">${escapeXml(section)}</text>`
      : ''
  }

  <!-- Title -->
  <text y="${titleStartY}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#fafafa" letter-spacing="-0.5">
    ${titleTspans}
  </text>

  <!-- Bottom bar -->
  <line x1="80" y1="${height - 90}" x2="${width - 80}" y2="${height - 90}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

  <!-- Site name -->
  <text x="80" y="${height - 50}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="rgba(250,250,250,0.7)">fluenti.dev</text>

  <!-- Tagline -->
  <text x="${width - 80}" y="${height - 50}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="18" font-weight="400" fill="rgba(250,250,250,0.4)" text-anchor="end">Compile-time i18n for modern frameworks</text>
</svg>`

  return Buffer.from(svg)
}

/* ------------------------------------------------------------------ */
/*  Static paths — one OG image per docs page                        */
/* ------------------------------------------------------------------ */

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection('docs')

  return docs.map((entry) => ({
    params: { slug: entry.id },
    props: { title: entry.data.title, slug: entry.id },
  }))
}

/* ------------------------------------------------------------------ */
/*  GET handler — render PNG via sharp                                */
/* ------------------------------------------------------------------ */

export const GET: APIRoute = async ({ props }) => {
  const { title, slug } = props as { title: string; slug: string }
  const section = getSectionLabel(slug)
  const overlaySvg = buildOverlaySvg(title, section)

  const png = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: overlaySvg, top: 0, left: 0 }])
    .png()
    .toBuffer()

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
