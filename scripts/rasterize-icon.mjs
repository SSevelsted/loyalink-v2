#!/usr/bin/env node
/**
 * Rasterize the brand SVG into the PNG source files @capacitor/assets
 * expects under resources/.
 *
 * Produces:
 *   resources/icon.png             — 1024×1024 flat composition (iOS home icon)
 *   resources/icon-foreground.png  — 1024×1024, mark only on transparent bg,
 *                                    inset to 60% so Android's adaptive-icon
 *                                    mask (crops ~72% center) keeps the mark
 *                                    comfortably inside the safe zone.
 *   resources/icon-background.png  — 1024×1024 solid #09090b (Android bg layer)
 *
 * Run: node scripts/rasterize-icon.mjs
 */

import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const SIZE = 1024
const BG_COLOR = '#09090b'

const SVG_PATH = new URL('../public/icons/icon.svg', import.meta.url)
const OUT_ICON = new URL('../resources/icon.png', import.meta.url)
const OUT_FG = new URL('../resources/icon-foreground.png', import.meta.url)
const OUT_BG = new URL('../resources/icon-background.png', import.meta.url)

const svgSource = await readFile(SVG_PATH, 'utf8')

// Strip the opaque background rect from the SVG for the foreground layer.
// Matches: <rect width="1024" height="1024" fill="#09090b"/> with optional
// whitespace and attribute ordering.
const svgMarkOnly = svgSource.replace(
  /<rect[^>]*width="1024"[^>]*height="1024"[^>]*fill="#09090b"[^>]*\/>/i,
  ''
)

// 1. Full icon for iOS — flat dark bg + mark, no transparency.
await sharp(Buffer.from(svgSource), { density: 384 })
  .resize(SIZE, SIZE)
  .flatten({ background: BG_COLOR })
  .png({ compressionLevel: 9 })
  .toFile(OUT_ICON.pathname)

// 2. Foreground layer for Android adaptive icon — mark only, 60% inset.
const insetPx = Math.round(SIZE * 0.6)
const markPng = await sharp(Buffer.from(svgMarkOnly), { density: 384 })
  .resize(insetPx, insetPx, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()

await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    {
      input: markPng,
      top: Math.round((SIZE - insetPx) / 2),
      left: Math.round((SIZE - insetPx) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(OUT_FG.pathname)

// 3. Background layer for Android adaptive icon — solid brand color.
await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 3,
    background: BG_COLOR,
  },
})
  .png({ compressionLevel: 9 })
  .toFile(OUT_BG.pathname)

console.log(`icon:             ${OUT_ICON.pathname}`)
console.log(`icon-foreground:  ${OUT_FG.pathname}`)
console.log(`icon-background:  ${OUT_BG.pathname}`)

// 4. Public web assets — regenerate from the new SVG so the PWA + favicon +
// apple-touch-icon all match the native app icon.
const PUBLIC_PNGS = [
  { path: '../public/favicon.png', size: 32 },
  { path: '../public/apple-touch-icon.png', size: 180 },
  { path: '../public/icons/icon-72x72.png', size: 72 },
  { path: '../public/icons/icon-96x96.png', size: 96 },
  { path: '../public/icons/icon-128x128.png', size: 128 },
  { path: '../public/icons/icon-144x144.png', size: 144 },
  { path: '../public/icons/icon-152x152.png', size: 152 },
  { path: '../public/icons/icon-192x192.png', size: 192 },
  { path: '../public/icons/icon-384x384.png', size: 384 },
  { path: '../public/icons/icon-512x512.png', size: 512 },
]

for (const { path, size } of PUBLIC_PNGS) {
  const outUrl = new URL(path, import.meta.url)
  await sharp(Buffer.from(svgSource), { density: 384 })
    .resize(size, size)
    .flatten({ background: BG_COLOR })
    .png({ compressionLevel: 9 })
    .toFile(outUrl.pathname)
  console.log(`public:           ${outUrl.pathname}`)
}
