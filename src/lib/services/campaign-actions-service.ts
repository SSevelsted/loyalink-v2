import { adminSupabase } from '@/lib/studio-access'
import { applyPermanentDeal, loadMemberDeal, loadRewardsConfig } from '@/lib/services/member-deal-service'

/**
 * Content actions a push campaign or automation carries out on its audience
 * before the push: credit a balance or raise the cashback rate. Shared by the
 * manual campaign send route and the notifications cron (scheduled campaigns
 * and automations).
 */

export type ContentAction = {
  announcement?: string
  action?: 'none' | 'add_balance' | 'cashback_boost'
  amount?: number
  cashback_rate?: number
  cashback_duration_days?: number
}

type ApplyContentActionsOptions = {
  /** Who sends: a campaign or an automation. Sets the default transaction description. */
  source: 'campaign' | 'automation'
}

/**
 * Apply the action to each member of the studio. A member whose write fails
 * is logged and skipped, so one bad row does not stop the rest of the
 * audience. Returns the number of members that failed.
 */
export async function applyContentActions(
  customerIds: string[],
  studioId: string,
  content: ContentAction,
  options: ApplyContentActionsOptions,
): Promise<{ failed: number }> {
  let failed = 0
  if (!content || content.action === 'none') return { failed }

  const fail = (customerId: string, message: string) => {
    failed += 1
    console.error(`[${options.source}] ${content.action} failed for ${customerId}: ${message}`)
  }

  if (content.action === 'add_balance' && content.amount && content.amount > 0) {
    // Credit each customer's balance and create a transaction
    for (const customerId of customerIds) {
      const { data: customer, error: readError } = await adminSupabase
        .from('customers')
        .select('balance')
        .eq('id', customerId)
        .eq('studio_id', studioId)
        .maybeSingle()
      if (readError) {
        fail(customerId, readError.message)
        continue
      }
      if (!customer) continue

      const { error: balanceError } = await adminSupabase
        .from('customers')
        .update({ balance: Number(customer.balance) + content.amount })
        .eq('id', customerId)
        .eq('studio_id', studioId)
      if (balanceError) {
        fail(customerId, balanceError.message)
        continue
      }

      const { error: txError } = await adminSupabase.from('transactions').insert({
        customer_id: customerId,
        studio_id: studioId,
        type: 'adjustment',
        amount: content.amount,
        description: content.announcement || (options.source === 'campaign' ? 'Campaign bonus' : 'Automation bonus'),
      })
      if (txError) fail(customerId, `balance credited, transaction not recorded: ${txError.message}`)
    }
  }

  if (content.action === 'cashback_boost' && content.cashback_rate && content.cashback_rate > 0) {
    // Adds the bonus to the member's own rate. metadata.cashback_boost records
    // an expiry, but nothing reads it back to revert the rate, so the bonus is
    // permanent. During an active promotion it therefore goes into the
    // promotion's fallback, and the row shows the best deal.
    const bonus = content.cashback_rate
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (content.cashback_duration_days || 30))

    const config = await loadRewardsConfig(studioId)
    for (const customerId of customerIds) {
      try {
        const deal = await loadMemberDeal(studioId, customerId, config.tiers)
        if (!deal) continue

        const baseRate = deal.permanentRate
        await applyPermanentDeal({
          studioId,
          customerId,
          cashbackRate: baseRate + bonus,
          source: options.source,
          config,
          current: deal,
          customerFields: {
            metadata: {
              ...(deal.customer.metadata ?? {}),
              cashback_boost: {
                original_rate: baseRate,
                bonus_rate: bonus,
                expires_at: expiresAt.toISOString(),
              },
            },
          },
          tierChangeEvent: 'never',
        })
      } catch (err) {
        fail(customerId, err instanceof Error ? err.message : String(err))
      }
    }
  }

  return { failed }
}
