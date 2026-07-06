export type MemberPass = {
  platform: string
  status: string
  installed_at: string | null
  created_at: string
  updated_at: string
}

const isLive = (status: string) => status === 'installed' || status === 'active'

/**
 * Collapse raw wallet_passes rows into the current pass per platform.
 *
 * The DB keeps at most one active/installed pass per (customer, platform) but
 * retains historical voided/uninstalled rows, so a customer can have several
 * rows for the same platform. We surface the single most relevant one: a live
 * (active/installed) pass wins; otherwise the most recently updated row —
 * which reflects the true current state, e.g. `uninstalled`.
 *
 * Returns one entry per platform plus a convenience `pass_installed` flag.
 */
export function summarizeMemberPasses(rows: unknown): {
  passes: MemberPass[]
  pass_installed: boolean
} {
  const list = Array.isArray(rows) ? (rows as MemberPass[]) : []
  const byPlatform = new Map<string, MemberPass>()

  for (const p of list) {
    if (!p || typeof p.platform !== 'string') continue
    const existing = byPlatform.get(p.platform)
    const wins =
      !existing ||
      (isLive(p.status) && !isLive(existing.status)) ||
      (isLive(p.status) === isLive(existing.status) &&
        (p.updated_at ?? '') > (existing.updated_at ?? ''))
    if (wins) byPlatform.set(p.platform, p)
  }

  const passes = [...byPlatform.values()].sort((a, b) => a.platform.localeCompare(b.platform))

  return {
    passes,
    pass_installed: passes.some((p) => p.status === 'installed'),
  }
}
