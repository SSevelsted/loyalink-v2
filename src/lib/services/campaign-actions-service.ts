import { adminSupabase } from '@/lib/studio-access'

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

export async function applyContentActions(
  customerIds: string[],
  studioId: string,
  content: ContentAction,
  options: ApplyContentActionsOptions,
) {
  if (!content || content.action === 'none') return

  if (content.action === 'add_balance' && content.amount && content.amount > 0) {
    // Credit each customer's balance and create a transaction
    for (const customerId of customerIds) {
      const { data: customer } = await adminSupabase
        .from('customers')
        .select('balance')
        .eq('id', customerId)
        .single()

      if (customer) {
        await adminSupabase
          .from('customers')
          .update({ balance: Number(customer.balance) + content.amount })
          .eq('id', customerId)

        await adminSupabase.from('transactions').insert({
          customer_id: customerId,
          studio_id: studioId,
          type: 'adjustment',
          amount: content.amount,
          description: content.announcement || (options.source === 'campaign' ? 'Campaign bonus' : 'Automation bonus'),
        })
      }
    }
  }

  if (content.action === 'cashback_boost' && content.cashback_rate && content.cashback_rate > 0) {
    // Temporarily boost each customer's cashback rate
    // Store the boost info in customer metadata so it can expire
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (content.cashback_duration_days || 30))

    for (const customerId of customerIds) {
      const { data: customer } = await adminSupabase
        .from('customers')
        .select('cashback_rate, metadata')
        .eq('id', customerId)
        .single()

      if (customer) {
        const currentRate = Number(customer.cashback_rate || 0)
        const metadata = (customer.metadata || {}) as Record<string, unknown>

        await adminSupabase
          .from('customers')
          .update({
            cashback_rate: currentRate + content.cashback_rate,
            metadata: {
              ...metadata,
              cashback_boost: {
                original_rate: currentRate,
                bonus_rate: content.cashback_rate,
                expires_at: expiresAt.toISOString(),
              },
            },
          })
          .eq('id', customerId)
      }
    }
  }
}
