import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { contrastRatio, readableTextOn } from './readable-color'

test('text on a brand color is black or white, whichever reads', () => {
  assert.equal(readableTextOn('#ffffff'), '#111111') // Nick Schestag
  assert.equal(readableTextOn('#fff'), '#111111')
  assert.equal(readableTextOn('#dabe67'), '#111111') // Ink Nation gold
  assert.equal(readableTextOn('#b4a07d'), '#111111') // Skincut
  assert.equal(readableTextOn('#E4A066'), '#111111') // Woods
  assert.equal(readableTextOn('#7C3AED'), '#ffffff') // default violet
  assert.equal(readableTextOn('#e41b30'), '#ffffff') // All Ink red
  assert.equal(readableTextOn('#35274e'), '#ffffff')
  assert.equal(readableTextOn('not a color'), '#ffffff')
  assert.equal(readableTextOn(undefined), '#ffffff')
})

test('every studio brand color of 7 Oct 2026 gets text with contrast >= 4.5', () => {
  const brands = ['#e41b30', '#7C3AED', '#0c93c0', '#ce1c22', '#dabe67', '#904d30', '#ffffff', '#6C5C4B', '#F59E0B', '#b4a07d', '#35274e', '#3B82F6', '#E4A066']
  for (const b of brands) {
    assert.ok(contrastRatio(b, readableTextOn(b)) >= 4.5, `${b}: ${contrastRatio(b, readableTextOn(b)).toFixed(2)}`)
  }
})

// Guard: a brand-colored surface must never hard-code white text again.
// Flags an element whose style paints a brand color (accent / brandColor /
// settings.brandColor ...) as its background and, within the same 4 lines,
// sets white text ("text-white", color '#fff' / '#ffffff' / 'white').
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : walk(p)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : []
  })
}

test('no fixed white text on a brand-colored background', () => {
  const brandBg = /backgroundColor:\s*(accent|brandColor|brand|[\w.]*\.brandColor)\b(?!\s*\})?/
  const white = /text-white|color:\s*['"](#fff|#ffffff|white)['"]/i
  const hits: string[] = []
  for (const file of walk(join(process.cwd(), 'src'))) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (!brandBg.test(line)) return
      const near = lines.slice(Math.max(0, i - 3), i + 2).join('\n')
      if (white.test(near)) hits.push(`${file.replace(process.cwd() + '/', '')}:${i + 1}`)
    })
  }
  assert.deepEqual(hits, [], `Use brandSurface()/readableTextOn() from src/lib/readable-color.ts:\n${hits.join('\n')}`)
})
