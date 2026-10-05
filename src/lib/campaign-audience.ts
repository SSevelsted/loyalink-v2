import type { SupabaseClient } from '@supabase/supabase-js'
import type { AudienceFilter } from '@/types/database'
import { chunk } from '@/lib/wallet-messages'

const PAGE_SIZE = 1000

/**
 * Every customer id a campaign targets. Pages past PostgREST's 1000-row cap
 * and chunks a long customer_ids list, so a studio with thousands of members
 * gets its true audience (count and ids), not the first 1000.
 * Same filter rules as the campaign send route had inline.
 */
export async function resolveCampaignAudienceIds(
  supabase: SupabaseClient,
  studioId: string,
  audienceType: string,
  filter: AudienceFilter,
): Promise<string[]> {
  const build = (idChunk?: string[]) => {
    let query = supabase.from('customers').select('id').eq('studio_id', studioId)
    if (idChunk) query = query.in('id', idChunk)
    if (audienceType === 'segment') {
      if (filter.loyalty_stages?.length) query = query.in('loyalty_stage', filter.loyalty_stages)
      if (filter.tags?.length) query = query.overlaps('tags', filter.tags)
      if (filter.min_balance != null) query = query.gte('balance', filter.min_balance)
      if (filter.min_spend != null) query = query.gte('total_real_spend', filter.min_spend)
      if (filter.has_purchased != null) query = query.eq('has_purchased', filter.has_purchased)
      if (filter.joined_after) query = query.gte('created_at', filter.joined_after)
      if (filter.joined_before) query = query.lte('created_at', filter.joined_before)
    }
    return query.order('id')
  }

  const readAll = async (idChunk?: string[]): Promise<string[]> => {
    const ids: string[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await build(idChunk).range(from, from + PAGE_SIZE - 1)
      if (error) throw new Error(`audience lookup failed: ${error.message}`)
      ids.push(...(data || []).map((row: { id: string }) => row.id))
      if (!data || data.length < PAGE_SIZE) return ids
    }
  }

  // "Specific" with nobody picked is an empty audience, never the whole studio.
  if (audienceType === 'customers') {
    const ids: string[] = []
    for (const idChunk of chunk(filter.customer_ids ?? [])) ids.push(...(await readAll(idChunk)))
    return ids
  }
  return readAll()
}

/** Campaign sent_count: Apple devices pinged plus Google passes notified. */
export function campaignSentCount(result: { apple?: { sent?: number }; google?: { notified?: number } } | null | undefined): number {
  return (result?.apple?.sent || 0) + (result?.google?.notified || 0)
}

export function campaignFailedCount(result: { apple?: { failed?: number }; google?: { failed?: number } } | null | undefined): number {
  return (result?.apple?.failed || 0) + (result?.google?.failed || 0)
}

/**
 * The segmentFilter pass-service gets. It resolves the audience again on its
 * side, so send only the fields that apply to this audience type: a filter
 * left over from switching "By Segment" back to "All Customers" must not
 * narrow an "all" send.
 */
export function pushSegmentFilter(audienceType: string, filter: AudienceFilter): AudienceFilter {
  if (audienceType === 'customers') return { customer_ids: filter.customer_ids ?? [] }
  if (audienceType === 'segment') {
    const { customer_ids: _ignored, ...segment } = filter
    void _ignored
    return segment
  }
  return {}
}
