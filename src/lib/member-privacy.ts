// Names as other members may see them. A member's page lists the friends
// they referred; the page is reachable from a link, so it never shows a
// friend's full name.

/** "Ana Karlsen Holm" -> "Ana H." ; "Ana" -> "Ana" ; "" -> "" */
export function friendDisplayName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  const lastInitial = Array.from(parts[parts.length - 1])[0]?.toUpperCase() ?? ''
  return `${parts[0]} ${lastInitial}.`
}

/** "Ana Karlsen" -> "Ana" */
export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}
