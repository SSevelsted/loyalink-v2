import { Router, Request, Response } from 'express';
import { supabase } from '../config.js';
import { apnsConfig, appleConfig } from '../config.js';
import { apnsService } from '../services/apnsService.js';
import { googleWalletService } from '../services/googleWalletService.js';
import { requireInternalAuth } from '../middleware/internalAuth.js';
import { loadGiftsReady } from '../utils/giftCounter.js';
import { loadFriendGiftOn } from '../utils/qrHint.js';
import { createMemberLinkToken } from '../utils/customerAccess.js';
import {
  buildGoogleMessageId,
  chunk,
  hasAnyMessage,
  mapPool,
  resolveCustomerMessage,
  type ResolvedMessage,
  type WalletMessageInput,
} from '../utils/walletMessages.js';

export const pushRoutes = Router();

pushRoutes.use(requireInternalAuth);

// PostgREST returns max 1000 rows per request. Every list query below pages
// with .range() and every `.in()` filter is chunked (IN_CHUNK_SIZE ids), so a
// studio with thousands of customers neither hits the row cap nor the URL limit.
const PAGE_SIZE = 1000;

// Parallel Google calls per send. Low enough to stay polite with the API.
const GOOGLE_CONCURRENCY = 5;

type PassRow = { serial_number: string; customer_id: string; studio_id: string; platform: string; status: string | null };
type RegistrationRow = { push_token: string; platform: string; serial_number: string };
type CustomerRow = Record<string, unknown> & { id: string; name: string | null };

// Minimal shape of a PostgREST filter builder that we can page with .range().
type RangeQuery<T> = { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> };

/** Read every row of a query, 1000 at a time. The query must have a stable order. */
async function fetchAllPages<T>(build: () => RangeQuery<T>): Promise<{ rows: T[]; error: unknown }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return { rows, error: null };
  }
}

/** All wallet_passes of these customers (every platform). */
async function loadPassesForCustomers(customerIds: string[]): Promise<PassRow[]> {
  const out: PassRow[] = [];
  for (const ids of chunk(customerIds)) {
    const { rows, error } = await fetchAllPages<PassRow>(() =>
      supabase
        .from('wallet_passes')
        .select('serial_number, customer_id, studio_id, platform, status')
        .in('customer_id', ids)
        .order('id')
    );
    if (error) console.error('[push] wallet_passes lookup failed:', error);
    out.push(...rows);
  }
  return out;
}

async function loadCustomers(customerIds: string[]): Promise<Map<string, CustomerRow>> {
  const byId = new Map<string, CustomerRow>();
  for (const ids of chunk(customerIds)) {
    const { data, error } = await supabase.from('customers').select('*').in('id', ids);
    if (error) console.error('[push] customers lookup failed:', error);
    for (const c of (data || []) as CustomerRow[]) byId.set(c.id, c);
  }
  return byId;
}

/** Active Apple device registrations for these pass serials. */
async function loadRegistrations(serialNumbers: string[]): Promise<{ registrations: RegistrationRow[]; error: unknown }> {
  const registrations: RegistrationRow[] = [];
  let firstError: unknown = null;
  for (const serials of chunk(serialNumbers)) {
    const { rows, error } = await fetchAllPages<RegistrationRow>(() =>
      supabase
        .from('wallet_device_registrations')
        .select('push_token, platform, serial_number')
        .in('serial_number', serials)
        .eq('is_active', true)
        .order('id')
    );
    if (error && !firstError) firstError = error;
    registrations.push(...rows);
  }
  return { registrations, error: firstError };
}

// wallet_device_registrations has no customer_id column: join through wallet_passes.
async function getRegistrationsForCustomers(customerIds: string[]) {
  if (customerIds.length === 0) return { registrations: [] as RegistrationRow[], error: null };
  const passes = await loadPassesForCustomers(customerIds);
  if (passes.length === 0) return { registrations: [] as RegistrationRow[], error: null };
  return loadRegistrations(passes.map((p) => p.serial_number));
}

type SegmentFilter = {
  customer_ids?: string[];
  loyalty_stages?: string[];
  tags?: string[];
  min_balance?: number;
  min_spend?: number;
  has_purchased?: boolean;
  joined_after?: string;
  joined_before?: string;
};

/** Every customer id of a studio that matches the filter. Paged and chunked. */
async function resolveStudioCustomerIds(studioId: string, filter: SegmentFilter | null | undefined): Promise<{ ids: string[]; error: unknown }> {
  const build = (idChunk?: string[]) => () => {
    let q = supabase.from('customers').select('id').eq('studio_id', studioId);
    if (idChunk) q = q.in('id', idChunk);
    if (filter) {
      if (filter.loyalty_stages && filter.loyalty_stages.length > 0) q = q.in('loyalty_stage', filter.loyalty_stages);
      if (filter.tags && filter.tags.length > 0) q = q.overlaps('tags', filter.tags);
      if (filter.min_balance) q = q.gte('balance', filter.min_balance);
      if (filter.min_spend) q = q.gte('total_real_spend', filter.min_spend);
      if (filter.has_purchased != null) q = q.eq('has_purchased', filter.has_purchased);
      if (filter.joined_after) q = q.gte('created_at', filter.joined_after);
      if (filter.joined_before) q = q.lte('created_at', filter.joined_before);
    }
    return q.order('id');
  };

  if (filter?.customer_ids && filter.customer_ids.length > 0) {
    const ids: string[] = [];
    for (const idChunk of chunk(filter.customer_ids)) {
      const { rows, error } = await fetchAllPages<{ id: string }>(build(idChunk));
      if (error) return { ids, error };
      ids.push(...rows.map((r) => r.id));
    }
    return { ids, error: null };
  }

  const { rows, error } = await fetchAllPages<{ id: string }>(build());
  return { ids: rows.map((r) => r.id), error };
}

/** Member link token, or undefined when CUSTOMER_ACCESS_SECRET is missing (the link then opens the public view). */
function safeMemberLinkToken(customer: CustomerRow): string | undefined {
  try {
    return createMemberLinkToken(customer.id, customer.link_token_version);
  } catch (error) {
    console.error('[google] member link token unavailable:', (error as Error).message);
    return undefined;
  }
}

type StudioCtx = { classId: string; language: string; studioName: string };

/**
 * Write updated_at (and push_message when there is text) on the passes of the
 * targeted customers. This runs BEFORE the APNs ping: Apple devices re-fetch
 * the pass right after the ping, and a pass fetched before this write carries
 * the old text and the old Last-Modified, so the notification is lost.
 * Apple shows a notification only when push_message differs from the last one.
 */
async function writePassMessages(customerIds: string[], messages: Map<string, ResolvedMessage>): Promise<void> {
  const now = new Date().toISOString();
  const byBody = new Map<string, string[]>();
  const noText: string[] = [];
  for (const id of customerIds) {
    const m = messages.get(id);
    if (!m) noText.push(id);
    else byBody.set(m.body, [...(byBody.get(m.body) || []), id]);
  }

  for (const [body, ids] of byBody) {
    for (const idChunk of chunk(ids)) {
      const { error } = await supabase
        .from('wallet_passes')
        .update({ updated_at: now, push_message: body })
        .in('customer_id', idChunk);
      if (error) console.error('[push] push_message write failed:', error);
    }
  }
  for (const idChunk of chunk(noText)) {
    const { error } = await supabase.from('wallet_passes').update({ updated_at: now }).in('customer_id', idChunk);
    if (error) console.error('[push] updated_at write failed:', error);
  }
}

// Google Wallet has no device registration: the card mirrors a loyalty object
// we maintain server-side. So Google is driven straight from wallet_passes
// (platform='google'). The object is PATCHed with fresh data, then, when the
// send carries text, a TEXT_AND_NOTIFY message is added so the phone notifies.
async function deliverGoogle(
  googlePasses: PassRow[],
  customers: Map<string, CustomerRow>,
  messages: Map<string, ResolvedMessage>,
  sendId: string | null,
): Promise<{ updated: number; notified: number; failed: number }> {
  const result = { updated: 0, notified: 0, failed: 0 };
  if (googlePasses.length === 0) return result;

  // Class branding is per studio, so build + refresh it once per studio.
  const studioCtxCache = new Map<string, Promise<StudioCtx>>();
  const studioCtx = (studioId: string): Promise<StudioCtx> => {
    let ctx = studioCtxCache.get(studioId);
    if (!ctx) {
      ctx = (async () => {
        const classId = `loyalty_${studioId}`.replace(/-/g, '_');
        const { data: studioRow } = await supabase.from('studios').select('name, settings').eq('id', studioId).single();
        const language = (studioRow?.settings as { language?: string } | null)?.language ?? 'en';
        const { data: template } = await supabase
          .from('pass_templates')
          .select('*')
          .eq('studio_id', studioId)
          .eq('is_active', true)
          .single();
        const tierThemes = (template?.tier_themes as Record<string, { backgroundColor?: string | null; stripImage?: string | null; logoOverride?: string | null }>) || {};
        const baseTheme = tierThemes['base'] || {};
        // Refresh the class once so brand colour/logo/hero stay in sync with the
        // Apple template (background colour lives on the class, not the object).
        await googleWalletService.createOrUpdateClass({
          classId,
          studioName: studioRow?.name || 'Studio',
          logoUrl: baseTheme.logoOverride || template?.logo_url || undefined,
          heroImageUrl: baseTheme.stripImage || undefined,
          hexBackgroundColor: baseTheme.backgroundColor || undefined,
        });
        return { classId, language, studioName: studioRow?.name || 'Studio' };
      })();
      studioCtxCache.set(studioId, ctx);
    }
    return ctx;
  };

  await mapPool(googlePasses, GOOGLE_CONCURRENCY, async (pass) => {
    const customer = customers.get(pass.customer_id);
    if (!customer) return;
    const ctx = await studioCtx(pass.studio_id);
    const objectId = pass.serial_number.replace(/-/g, '_');
    const language = (customer.language as string | null) || ctx.language;

    const ok = await googleWalletService.createOrUpdateObject({
      objectId,
      classId: ctx.classId,
      customerId: customer.id,
      customerName: customer.name || '',
      memberId: (customer.member_id as string | null) || customer.id,
      memberLinkToken: safeMemberLinkToken(customer),
      balance: Number(customer.balance ?? 0),
      cashbackRate: Number(customer.cashback_rate ?? 0),
      loyaltyTier: (customer.loyalty_stage as string | null) || 'base',
      currency: (customer.currency as string | null) || 'DKK',
      language,
      giftsReady: await loadGiftsReady(pass.studio_id, customer.id),
      qrHintOn: await loadFriendGiftOn(pass.studio_id),
    });
    if (ok) result.updated++;

    const message = messages.get(customer.id);
    // A removed or voided card has no holder to notify.
    if (!message || pass.status === 'uninstalled' || pass.status === 'voided') return;

    const sent = await googleWalletService.addMessage(objectId, {
      id: buildGoogleMessageId(sendId || `msg_${Date.now()}`, customer.id),
      header: message.header || ctx.studioName,
      body: message.body,
    });
    if (sent.ok) result.notified++;
    else result.failed++;
  });

  console.log(`[google] updated=${result.updated} notified=${result.notified} failed=${result.failed} of ${googlePasses.length} google pass(es)`);
  return result;
}

type DeliveryResult = {
  apple: { sent: number; failed: number };
  google: { updated: number; notified: number; failed: number };
  devices: number;
  customersWithPass: number;
};

/**
 * Refresh (and optionally notify) the passes of a set of customers on both
 * Apple and Google. Order matters: DB write first, then the APNs ping.
 */
async function deliverToCustomers(customerIds: string[], input: WalletMessageInput, sendId: string | null): Promise<DeliveryResult> {
  const empty: DeliveryResult = { apple: { sent: 0, failed: 0 }, google: { updated: 0, notified: 0, failed: 0 }, devices: 0, customersWithPass: 0 };
  if (customerIds.length === 0) return empty;

  const passes = await loadPassesForCustomers(customerIds);
  if (passes.length === 0) {
    console.log(`[push] no wallet_passes for ${customerIds.length} customer(s)`);
    return empty;
  }

  const withPass = [...new Set(passes.map((p) => p.customer_id))];
  const customers = await loadCustomers(withPass);

  const messages = new Map<string, ResolvedMessage>();
  if (hasAnyMessage(input)) {
    for (const id of withPass) {
      const m = resolveCustomerMessage(input, id, customers.get(id)?.name);
      if (m) messages.set(id, m);
    }
  }

  // 1. DB first (fixes the race with Apple's re-fetch).
  await writePassMessages(withPass, messages);

  // 2. Apple: an APNs ping tells registered devices to re-fetch the pass.
  const appleSerials = passes.filter((p) => p.platform !== 'google').map((p) => p.serial_number);
  const { registrations, error: regError } = await loadRegistrations(appleSerials);
  if (regError) console.error('[push] registration lookup error:', regError);
  const appleTokens = registrations.filter((r) => r.platform === 'apple').map((r) => r.push_token);
  const apple = appleTokens.length > 0 ? await apnsService.sendBulkPushNotifications(appleTokens) : { sent: 0, failed: 0 };
  console.log(`[push] ${withPass.length} customer(s) with a pass, ${appleTokens.length} Apple device(s): sent=${apple.sent} failed=${apple.failed}`);

  // 3. Google: PATCH the objects, then add the message.
  const googlePasses = passes.filter((p) => p.platform === 'google');
  const google = await deliverGoogle(googlePasses, customers, messages, sendId);

  return { apple, google, devices: registrations.length + googlePasses.length, customersWithPass: withPass.length };
}

/** Message fields from a request body. Unknown or empty fields are dropped. */
function readMessageInput(body: unknown): WalletMessageInput {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const input: WalletMessageInput = {};
  if (typeof b.pushMessage === 'string' && b.pushMessage.trim()) input.pushMessage = b.pushMessage;
  if (typeof b.pushHeader === 'string' && b.pushHeader.trim()) input.pushHeader = b.pushHeader;
  if (b.messagesByCustomer && typeof b.messagesByCustomer === 'object') {
    const map: Record<string, { header?: string; body: string }> = {};
    for (const [id, m] of Object.entries(b.messagesByCustomer as Record<string, unknown>)) {
      const msg = m as { header?: unknown; body?: unknown } | null;
      if (msg && typeof msg.body === 'string' && msg.body.trim()) {
        map[id] = { body: msg.body, header: typeof msg.header === 'string' ? msg.header : undefined };
      }
    }
    if (Object.keys(map).length > 0) input.messagesByCustomer = map;
  }
  return input;
}

/** Send id for Google message ids: unique per send. */
function sendIdFor(body: Record<string, unknown>): string | null {
  if (typeof body.messageId === 'string' && body.messageId.trim()) return body.messageId.trim();
  if (typeof body.campaignId === 'string' && body.campaignId) return `campaign_${body.campaignId}`;
  if (typeof body.automationId === 'string' && body.automationId) return `automation_${body.automationId}_${Date.now()}`;
  return null;
}

// Debug: check registration state for a studio
pushRoutes.get('/debug/:studioId', async (req: Request, res: Response) => {
  try {
    const { studioId } = req.params;

    const { ids: customerIds } = await resolveStudioCustomerIds(studioId, null);
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

// Refresh (and optionally notify) a single customer's passes.
// Body (all optional): { pushMessage, pushHeader, messagesByCustomer, messageId }
pushRoutes.post('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const result = await deliverToCustomers([customerId], readMessageInput(body), sendIdFor(body));

    res.json({
      success: true,
      apple: result.apple,
      google: result.google,
      devices: result.devices,
      hasPass: result.customersWithPass > 0,
    });
  } catch (error) {
    console.error('Error sending push to customer:', error);
    res.status(500).json({ error: 'Failed to send push' });
  }
});

// Refresh (and optionally notify) the passes of a studio's customers.
// Body: { segmentFilter?, campaignId?, automationId?, messageId?, pushMessage?, pushHeader?, messagesByCustomer? }
pushRoutes.post('/studio/:studioId', async (req: Request, res: Response) => {
  try {
    const { studioId } = req.params;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const segmentFilter = body.segmentFilter as SegmentFilter | undefined;
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
    const automationId = typeof body.automationId === 'string' ? body.automationId : null;
    const input = readMessageInput(body);

    const { ids: customerIds, error: customerError } = await resolveStudioCustomerIds(studioId, segmentFilter);
    if (customerError) console.error(`[push/studio] customer lookup error for studio ${studioId}:`, customerError);

    if (customerIds.length === 0) {
      return res.json({
        success: true,
        message: 'No matching customers found',
        totalCustomers: 0,
        devices: 0,
        apple: { sent: 0, failed: 0 },
        google: { updated: 0, notified: 0, failed: 0 },
      });
    }

    const result = await deliverToCustomers(customerIds, input, sendIdFor(body));
    const messaged = hasAnyMessage(input);

    // Log the push with optional campaign/automation reference
    await supabase.from('wallet_push_logs').insert({
      studio_id: studioId,
      target_type: 'all',
      message_type: messaged ? 'message' : 'refresh',
      total_devices: result.devices,
      sent_count: result.apple.sent + (messaged ? result.google.notified : result.google.updated),
      failed_count: result.apple.failed + result.google.failed,
      status: 'completed',
      campaign_id: campaignId,
      automation_id: automationId,
    });

    res.json({
      success: true,
      totalCustomers: customerIds.length,
      totalDevices: result.devices,
      devices: result.devices,
      apple: result.apple,
      google: result.google,
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
          const { ids } = await resolveStudioCustomerIds(log.studio_id, log.segment_filter as SegmentFilter | null);
          customerIds = ids;
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
