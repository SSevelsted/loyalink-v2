// Text on a studio's brand color. A studio can pick any brand color in the
// landing page editor, including white (Nick Schestag, 7 Oct 2026: the join
// button and the Apple/Google switch showed white text on white). So text on a
// brand-colored surface is never fixed: it is black or white, whichever has the
// higher WCAG contrast against that color. tests/readable-color.test.ts also
// scans the code so a fixed white on a brand color cannot come back.

const DARK = '#111111'
const LIGHT = '#ffffff'

/** "#abc" / "#aabbcc" / "aabbcc" -> [r, g, b], or null when unparseable. Pure. */
export function parseHexColor(color: string | null | undefined): [number, number, number] | null {
  if (!color) return null
  let hex = color.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** WCAG relative luminance, 0 (black) to 1 (white). Pure. */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio between 2 colors, 1 to 21. Unparseable: 1. Pure. */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHexColor(a)
  const cb = parseHexColor(b)
  if (!ca || !cb) return 1
  const la = relativeLuminance(ca)
  const lb = relativeLuminance(cb)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** The text color for a surface painted in `background`: black or white. Pure. */
export function readableTextOn(background: string | null | undefined): string {
  const rgb = parseHexColor(background)
  if (!rgb) return LIGHT
  const l = relativeLuminance(rgb)
  const onLight = (l + 0.05) / (relativeLuminance(parseHexColor(DARK)!) + 0.05)
  const onDark = (1 + 0.05) / (l + 0.05)
  return onLight >= onDark ? DARK : LIGHT
}

/** Style for a surface in the brand color with readable text on it. */
export function brandSurface(brand: string): { backgroundColor: string; color: string } {
  return { backgroundColor: brand, color: readableTextOn(brand) }
}
