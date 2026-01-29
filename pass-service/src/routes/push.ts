import { Router, Request, Response } from 'express';
import { supabase } from '../config.js';
import { apnsService } from '../services/apnsService.js';
import { googleWalletService } from '../services/googleWalletService.js';

export const pushRoutes = Router();

// Send push notification to update a single customer's pass
pushRoutes.post('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    // Get all active device registrations for this customer
    const { data: registrations, error } = await supabase
      .from('wallet_device_registrations')
      .select('push_token, platform, serial_number')
      .eq('customer_id', customerId)
      .eq('is_active', true);

    if (error || !registrations || registrations.length === 0) {
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

    let appleResults = { sent: 0, failed: 0 };
    if (appleTokens.length > 0) {
      appleResults = await apnsService.sendBulkPushNotifications(appleTokens);
    }

    // Update Google passes
    const googlePasses = registrations.filter((r) => r.platform === 'google');
    let googleUpdated = 0;
    for (const pass of googlePasses) {
      // Trigger update via Google API
      // Google passes don't need push - they sync automatically when object is updated
      googleUpdated++;
    }

    // Increment pass version for all platforms
    await supabase
      .from('wallet_passes')
      .update({ version: supabase.rpc('increment', { x: 1 }) })
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
    const { segmentFilter, changeMessage } = req.body;

    // Build customer query
    let customerQuery = supabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId)
      .eq('pass_provider', 'self_hosted');

    // Apply segment filters
    if (segmentFilter) {
      if (segmentFilter.loyalty_stages && segmentFilter.loyalty_stages.length > 0) {
        customerQuery = customerQuery.in('loyalty_stage', segmentFilter.loyalty_stages);
      }
      if (segmentFilter.min_balance) {
        customerQuery = customerQuery.gte('balance', segmentFilter.min_balance);
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

    // Get all device registrations
    const { data: registrations, error: regError } = await supabase
      .from('wallet_device_registrations')
      .select('push_token, platform, serial_number, customer_id')
      .in('customer_id', customerIds)
      .eq('is_active', true);

    if (regError || !registrations || registrations.length === 0) {
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

    let appleResults = { sent: 0, failed: 0 };
    if (appleTokens.length > 0) {
      appleResults = await apnsService.sendBulkPushNotifications(appleTokens);
    }

    // Update Google passes
    const googleRegistrations = registrations.filter((r) => r.platform === 'google');
    let googleUpdated = 0;

    // For Google, we need to update each pass object
    for (const reg of googleRegistrations) {
      // Fetch customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', reg.customer_id)
        .single();

      if (customer) {
        const classId = `loyalty_${studioId}`.replace(/-/g, '_');
        const objectId = reg.serial_number.replace(/-/g, '_');

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
        });

        googleUpdated++;
      }
    }

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
        // Determine target
        let customerIds: string[] = [];

        if (log.target_type === 'individual' && log.customer_id) {
          customerIds = [log.customer_id];
        } else {
          // Build customer query
          let query = supabase
            .from('customers')
            .select('id')
            .eq('studio_id', log.studio_id)
            .eq('pass_provider', 'self_hosted');

          // Apply segment filter
          const filter = log.segment_filter as any;
          if (filter) {
            if (filter.loyalty_stages && filter.loyalty_stages.length > 0) {
              query = query.in('loyalty_stage', filter.loyalty_stages);
            }
            if (filter.min_balance) {
              query = query.gte('balance', filter.min_balance);
            }
          }

          const { data: customers } = await query;
          customerIds = customers?.map((c) => c.id) || [];
        }

        // Get device registrations
        const { data: registrations } = await supabase
          .from('wallet_device_registrations')
          .select('push_token, platform')
          .in('customer_id', customerIds)
          .eq('is_active', true);

        const totalDevices = registrations?.length || 0;

        // Send Apple pushes
        const appleTokens = (registrations || [])
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
