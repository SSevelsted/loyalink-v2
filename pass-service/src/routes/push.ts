import { Router, Request, Response } from 'express';
import { supabase } from '../config.js';
import { apnsConfig, appleConfig } from '../config.js';
import { apnsService } from '../services/apnsService.js';
import { googleWalletService } from '../services/googleWalletService.js';
import { requireInternalAuth } from '../middleware/internalAuth.js';

export const pushRoutes = Router();

pushRoutes.use(requireInternalAuth);

// Helper: get active device registrations for a list of customer IDs
// wallet_device_registrations has no customer_id column — join through wallet_passes
async function getRegistrationsForCustomers(customerIds: string[]) {
  if (customerIds.length === 0) return { registrations: [], serialToCustomer: {} as Record<string, string> };

  const { data: passes } = await supabase
    .from('wallet_passes')
    .select('serial_number, customer_id')
    .in('customer_id', customerIds);

  if (!passes || passes.length === 0) {
    console.log(`[getRegistrations] No wallet_passes found for customers: ${customerIds.join(', ')}`);
    return { registrations: [], serialToCustomer: {} as Record<string, string> };
  }
  console.log(`[getRegistrations] Found ${passes.length} pass(es) for customers ${customerIds.join(', ')}: ${passes.map(p => p.serial_number).join(', ')}`);

  const serialNumbers = passes.map((p) => p.serial_number);
  const serialToCustomer = Object.fromEntries(passes.map((p) => [p.serial_number, p.customer_id]));

  const { data: registrations, error } = await supabase
    .from('wallet_device_registrations')
    .select('push_token, platform, serial_number')
    .in('serial_number', serialNumbers)
    .eq('is_active', true);

  console.log(`[getRegistrations] Found ${(registrations || []).length} active registration(s) for serials [${serialNumbers.join(', ')}]`);
  return { registrations: registrations || [], serialToCustomer, error };
}

// Debug: check registration state for a studio
pushRoutes.get('/debug/:studioId', async (req: Request, res: Response) => {
  try {
    const { studioId } = req.params;

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId);

    const customerIds = customers?.map((c) => c.id) || [];
    const { registrations, error } = await getRegistrationsForCustomers(customerIds);

    const active = registrations;

    res.json({
      config: {
        apnsHost: apnsConfig.host,
        apnsKeyId: apnsConfig.keyId || '(not set)',
        apnsTeamId: apnsConfig.teamId || '(not set)',
        apnsKeyConfigured: !!apnsConfig.keyBase64,
        passTypeId: appleConfig.passTypeId,
      },
      customers: customerIds.length,
      registrations: {
        total: registrations.length,
        active: active.length,
        dbError: error ? String(error) : null,
        byPlatform: {
          apple: active.filter((r) => r.platform === 'apple').length,
          google: active.filter((r) => r.platform === 'google').length,
        },
        sample: active.slice(0, 3).map((r) => ({
          platform: r.platform,
          serialNumber: r.serial_number,
          tokenPrefix: r.push_token?.slice(0, 8) + '...',
        })),
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Send push notification to update a single customer's pass
pushRoutes.post('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const { registrations, error } = await getRegistrationsForCustomers([customerId]);

    console.log(`[push/customer] ${customerId}: found ${registrations.length} registration(s)${error ? ` (dbError: ${error})` : ''}`);

    if (error || registrations.length === 0) {
      return res.json({
        success: true,
        message: 'No active devices found',
        sent: 0,
      });
    }

    // Send push to Apple devices
    const appleTokens = registrations
      .filter((r) => r.platform === 'apple')
      .map((r) => r.push_token);

    console.log(`[push/customer] ${customerId}: ${appleTokens.length} Apple token(s) found: ${appleTokens.map(t => t.slice(0, 8) + '...').join(', ')}`);

    let appleResults = { sent: 0, failed: 0 };
    if (appleTokens.length > 0) {
      appleResults = await apnsService.sendBulkPushNotifications(appleTokens);
      console.log(`[push/customer] APNs result: sent=${appleResults.sent}, failed=${appleResults.failed}`);
    }

    const googleUpdated = registrations.filter((r) => r.platform === 'google').length;

    // Update pass updated_at so Apple Wallet sees it as modified
    await supabase
      .from('wallet_passes')
      .update({ updated_at: new Date().toISOString() })
      .eq('customer_id', customerId);

    res.json({
      success: true,
      apple: appleResults,
      google: { updated: googleUpdated },
    });
  } catch (error) {
    console.error('Error sending push to customer:', error);
    res.status(500).json({ error: 'Failed to send push' });
  }
});

// Send push notifications to all customers of a studio
pushRoutes.post('/studio/:studioId', async (req: Request, res: Response) => {
  try {
    const { studioId } = req.params;
    const { segmentFilter, campaignId, automationId, pushMessage } = req.body;

    // Build customer query
    let customerQuery = supabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId);

    // Apply segment filters (supports full AudienceFilter)
    if (segmentFilter) {
      if (segmentFilter.customer_ids && segmentFilter.customer_ids.length > 0) {
        customerQuery = customerQuery.in('id', segmentFilter.customer_ids);
      }
      if (segmentFilter.loyalty_stages && segmentFilter.loyalty_stages.length > 0) {
        customerQuery = customerQuery.in('loyalty_stage', segmentFilter.loyalty_stages);
      }
      if (segmentFilter.tags && segmentFilter.tags.length > 0) {
        customerQuery = customerQuery.overlaps('tags', segmentFilter.tags);
      }
      if (segmentFilter.min_balance) {
        customerQuery = customerQuery.gte('balance', segmentFilter.min_balance);
      }
      if (segmentFilter.min_spend) {
        customerQuery = customerQuery.gte('total_real_spend', segmentFilter.min_spend);
      }
      if (segmentFilter.has_purchased != null) {
        customerQuery = customerQuery.eq('has_purchased', segmentFilter.has_purchased);
      }
      if (segmentFilter.joined_after) {
        customerQuery = customerQuery.gte('created_at', segmentFilter.joined_after);
      }
      if (segmentFilter.joined_before) {
        customerQuery = customerQuery.lte('created_at', segmentFilter.joined_before);
      }
    }

    const { data: customers, error: customerError } = await customerQuery;

    if (customerError || !customers || customers.length === 0) {
      return res.json({
        success: true,
        message: 'No matching customers found',
        sent: 0,
      });
    }

    const customerIds = customers.map((c) => c.id);

    // Get all device registrations via wallet_passes join
    const { registrations, serialToCustomer, error: regError } = await getRegistrationsForCustomers(customerIds);

    if (regError || registrations.length === 0) {
      console.log(`[push/studio] No active devices for studio ${studioId} (${customers.length} customers). regError:`, regError);
      return res.json({
        success: true,
        message: 'No active devices found',
        totalCustomers: customers.length,
        sent: 0,
      });
    }

    // Send Apple push notifications
    const appleTokens = registrations
      .filter((r) => r.platform === 'apple')
      .map((r) => r.push_token);

    console.log(`[push/studio] Sending to ${appleTokens.length} Apple devices, ${registrations.filter(r => r.platform === 'google').length} Google devices`);

    let appleResults = { sent: 0, failed: 0 };
    if (appleTokens.length > 0) {
      appleResults = await apnsService.sendBulkPushNotifications(appleTokens);
      console.log(`[push/studio] APNs results: sent=${appleResults.sent}, failed=${appleResults.failed}`);
    }

    // Update Google passes
    const googleRegistrations = registrations.filter((r) => r.platform === 'google');
    let googleUpdated = 0;

    for (const reg of googleRegistrations) {
      const regCustomerId = serialToCustomer[reg.serial_number];
      if (!regCustomerId) continue;

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', regCustomerId)
        .single();

      if (customer) {
        const classId = `loyalty_${studioId}`.replace(/-/g, '_');
        const objectId = reg.serial_number.replace(/-/g, '_');

        // Studio language drives the localised Google Wallet labels
        const { data: studioRow } = await supabase
          .from('studios')
          .select('settings')
          .eq('id', studioId)
          .single();
        const studioLanguage = (studioRow?.settings as { language?: string } | null)?.language ?? 'en';

        await googleWalletService.createOrUpdateObject({
          objectId,
          classId,
          customerId: customer.id,
          customerName: customer.name,
          memberId: customer.member_id || customer.id,
          balance: customer.balance,
          cashbackRate: customer.cashback_rate,
          loyaltyTier: customer.loyalty_stage || 'base',
          currency: customer.currency || 'DKK',
          language: customer.language || studioLanguage,
        });

        googleUpdated++;
      }
    }

    // Touch updated_at on all targeted passes so Apple's passesUpdatedSince filter
    // picks them up. This must always succeed regardless of other column state.
    const targetedSerials = registrations.map((r) => r.serial_number);
    await supabase
      .from('wallet_passes')
      .update({ updated_at: new Date().toISOString() })
      .in('serial_number', targetedSerials);

    // Set push_message separately — this column requires migration 010 to exist.
    // If the column is missing this fails silently rather than breaking updated_at.
    if (pushMessage) {
      await supabase
        .from('wallet_passes')
        .update({ push_message: pushMessage })
        .in('serial_number', targetedSerials);
    }

    // Log the push with optional campaign/automation reference
    await supabase.from('wallet_push_logs').insert({
      studio_id: studioId,
      target_type: 'all',
      total_devices: registrations.length,
      sent_count: appleResults.sent + googleUpdated,
      failed_count: appleResults.failed,
      status: 'completed',
      campaign_id: campaignId || null,
      automation_id: automationId || null,
    });

    res.json({
      success: true,
      totalCustomers: customers.length,
      totalDevices: registrations.length,
      apple: appleResults,
      google: { updated: googleUpdated },
    });
  } catch (error) {
    console.error('Error sending studio push:', error);
    res.status(500).json({ error: 'Failed to send push' });
  }
});

// Process pending push logs from Supabase
pushRoutes.post('/process-queue', async (req: Request, res: Response) => {
  try {
    // Get pending push logs
    const { data: pendingLogs, error } = await supabase
      .from('wallet_push_logs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error || !pendingLogs || pendingLogs.length === 0) {
      return res.json({ message: 'No pending push logs', processed: 0 });
    }

    const results = [];

    for (const log of pendingLogs) {
      // Mark as processing
      await supabase
        .from('wallet_push_logs')
        .update({ status: 'processing' })
        .eq('id', log.id);

      try {
        // Determine target customer IDs
        let customerIds: string[] = [];

        if (log.target_type === 'individual' && log.customer_id) {
          customerIds = [log.customer_id];
        } else {
          let query = supabase
            .from('customers')
            .select('id')
            .eq('studio_id', log.studio_id);

          type SegmentFilter = { customer_ids?: string[]; loyalty_stages?: string[]; tags?: string[]; min_balance?: number; min_spend?: number; has_purchased?: boolean; joined_after?: string; joined_before?: string }
          const filter = log.segment_filter as SegmentFilter | null;
          if (filter) {
            if (filter.customer_ids && filter.customer_ids.length > 0) {
              query = query.in('id', filter.customer_ids);
            }
            if (filter.loyalty_stages && filter.loyalty_stages.length > 0) {
              query = query.in('loyalty_stage', filter.loyalty_stages);
            }
            if (filter.tags && filter.tags.length > 0) {
              query = query.overlaps('tags', filter.tags);
            }
            if (filter.min_balance) {
              query = query.gte('balance', filter.min_balance);
            }
            if (filter.min_spend) {
              query = query.gte('total_real_spend', filter.min_spend);
            }
            if (filter.has_purchased != null) {
              query = query.eq('has_purchased', filter.has_purchased);
            }
            if (filter.joined_after) {
              query = query.gte('created_at', filter.joined_after);
            }
            if (filter.joined_before) {
              query = query.lte('created_at', filter.joined_before);
            }
          }

          const { data: customers } = await query;
          customerIds = customers?.map((c) => c.id) || [];
        }

        // Get device registrations via wallet_passes join
        const { registrations } = await getRegistrationsForCustomers(customerIds);
        const totalDevices = registrations.length;

        // Send Apple pushes
        const appleTokens = registrations
          .filter((r) => r.platform === 'apple')
          .map((r) => r.push_token);

        const appleResults = appleTokens.length > 0
          ? await apnsService.sendBulkPushNotifications(appleTokens)
          : { sent: 0, failed: 0 };

        // Update log
        await supabase
          .from('wallet_push_logs')
          .update({
            status: 'completed',
            total_devices: totalDevices,
            sent_count: appleResults.sent,
            failed_count: appleResults.failed,
            completed_at: new Date().toISOString(),
          })
          .eq('id', log.id);

        results.push({
          logId: log.id,
          status: 'completed',
          sent: appleResults.sent,
        });
      } catch (err) {
        console.error('Error processing push log:', err);

        await supabase
          .from('wallet_push_logs')
          .update({
            status: 'failed',
            error_message: (err as Error).message,
          })
          .eq('id', log.id);

        results.push({ logId: log.id, status: 'failed' });
      }
    }

    res.json({ processed: results.length, results });
  } catch (error) {
    console.error('Error processing push queue:', error);
    res.status(500).json({ error: 'Failed to process queue' });
  }
});
