import { Router, Request, Response } from 'express';
import { supabase, googleConfig } from '../config.js';
import { googleWalletService } from '../services/googleWalletService.js';
import { requireInternalAuth } from '../middleware/internalAuth.js';
import { firePassLifecycle } from '../utils/lifecycle.js';

export const googleRoutes = Router();

// Google Wallet save/delete callback. Google POSTs here when a user adds ('save')
// or removes ('del') a pass, which is our only server-side install signal for
// Google (the equivalent of Apple's PassKit register/unregister). Configured via
// callbackOptions on the loyalty class.
//
// Auth: Google calls the exact URL we registered, so an unguessable token in that
// URL authenticates it. Full ECv2 signature verification of req.body.signedMessage
// could be layered on here later for defence-in-depth.
googleRoutes.post('/callback', async (req: Request, res: Response) => {
  try {
    if (googleConfig.callbackToken && req.query.token !== googleConfig.callbackToken) {
      return res.status(401).send('Unauthorized');
    }

    // The event lives in a signed envelope: signedMessage is a JSON string with
    // { objectId, classId, eventType, expTimeMillis, nonce }.
    let message: Record<string, unknown> = (req.body as Record<string, unknown>) ?? {};
    const signed = (req.body as { signedMessage?: unknown })?.signedMessage;
    if (typeof signed === 'string') {
      try { message = JSON.parse(signed); } catch { /* fall back to req.body */ }
    }

    const eventType = typeof message.eventType === 'string' ? message.eventType : undefined;
    const rawObjectId = typeof message.objectId === 'string' ? message.objectId : undefined;
    if (!eventType || !rawObjectId) {
      return res.status(400).send('Missing eventType or objectId');
    }

    // Resource id is `${issuerId}.${serial_with_underscores}`. Reverse it: strip
    // the issuer prefix, then underscores back to hyphens. Serial numbers are
    // `PASS-<uuid>` (hex + hyphens only), so the mapping is lossless.
    const prefix = `${googleConfig.issuerId}.`;
    const objectId = rawObjectId.startsWith(prefix) ? rawObjectId.slice(prefix.length) : rawObjectId;
    const serialNumber = objectId.replace(/_/g, '-');

    const { data: walletPass } = await supabase
      .from('wallet_passes')
      .select('id, customer_id, studio_id, status')
      .eq('serial_number', serialNumber)
      .eq('platform', 'google')
      .single();

    if (!walletPass) {
      // Unknown object — ack so Google stops retrying.
      console.warn(`[google callback] no google pass for serial ${serialNumber}`);
      return res.status(200).send();
    }

    if (eventType === 'save') {
      // Fire card.installed only on the real transition into installed.
      const wasInstalled = walletPass.status === 'installed';
      await supabase
        .from('wallet_passes')
        .update({ status: 'installed', installed_at: new Date().toISOString() })
        .eq('id', walletPass.id);
      if (!wasInstalled) {
        firePassLifecycle('card_installed', {
          customerId: walletPass.customer_id,
          studioId: walletPass.studio_id,
          serialNumber,
          platform: 'google',
        });
      }
    } else if (eventType === 'del') {
      await supabase
        .from('wallet_passes')
        .update({ status: 'uninstalled' })
        .eq('id', walletPass.id);
      firePassLifecycle('card_uninstalled', {
        customerId: walletPass.customer_id,
        studioId: walletPass.studio_id,
        serialNumber,
        platform: 'google',
      });
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error handling Google callback:', error);
    res.status(500).send('Internal error');
  }
});

// Get Google Wallet save URL for a pass
googleRoutes.get('/save-url/:serialNumber', async (req: Request, res: Response) => {
  try {
    const { serialNumber } = req.params;

    // Fetch pass and customer data
    const { data: walletPass, error: passError } = await supabase
      .from('wallet_passes')
      .select('*, customers(*)')
      .eq('serial_number', serialNumber)
      .single();

    if (passError || !walletPass) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    const customer = walletPass.customers as { id: string; name: string; member_id?: string; balance: number; cashback_rate: number; loyalty_stage?: string; currency?: string; language?: string };

    // Fetch template
    const { data: template } = await supabase
      .from('pass_templates')
      .select('*')
      .eq('studio_id', walletPass.studio_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create/update Google Wallet class for this studio
    const classId = `loyalty_${walletPass.studio_id}`.replace(/-/g, '_');

    // Fetch studio name + settings (settings.language drives label localisation)
    const { data: studio } = await supabase
      .from('studios')
      .select('name, settings')
      .eq('id', walletPass.studio_id)
      .single();

    const studioLanguage = (studio?.settings as { language?: string } | null)?.language ?? 'en';

    const loyaltyTier = customer.loyalty_stage || 'base';
    const tierThemes = template?.tier_themes as Record<string, { backgroundColor?: string | null; stripImage?: string | null; logoOverride?: string | null }> || {};
    const tierTheme = tierThemes[loyaltyTier] || tierThemes['base'] || {};

    const studioName = studio?.name || 'Studio';
    const logoUrl = tierTheme.logoOverride || template?.logo_url || undefined;
    const heroImageUrl = tierTheme.stripImage || undefined;
    // Mirror the Apple template's tier background colour onto the Google card so
    // it's on-brand instead of Google's generic logo-derived colour.
    const hexBackgroundColor = tierTheme.backgroundColor || undefined;

    await googleWalletService.createOrUpdateClass({
      classId,
      studioName,
      logoUrl,
      heroImageUrl,
      hexBackgroundColor,
    });

    // Create object ID from serial number
    const objectId = serialNumber.replace(/-/g, '_');

    // Create save JWT (class + object inlined, so Google provisions both on save)
    const jwt = await googleWalletService.createSaveJwt({
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
      studioName,
      logoUrl,
      heroImageUrl,
      hexBackgroundColor,
    });

    if (!jwt) {
      // Without a signed JWT there is no valid save URL. Returning a broken
      // pay.google.com link just opens the wallet home and bounces the user
      // back with no card and no explanation — fail loudly instead so the
      // client can show a real error.
      console.error('Google save URL: JWT signing unavailable (GOOGLE_SERVICE_ACCOUNT_BASE64 missing or invalid)');
      return res.status(500).json({ error: 'Google Wallet is not configured for this studio' });
    }

    res.json({
      success: true,
      saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
    });
  } catch (error) {
    console.error('Error generating Google save URL:', error);
    res.status(500).json({ error: 'Failed to generate save URL' });
  }
});

// Update a Google Wallet pass (called when customer data changes)
googleRoutes.post('/update/:serialNumber', requireInternalAuth, async (req: Request, res: Response) => {
  try {
    const { serialNumber } = req.params;

    // Fetch pass and customer data
    const { data: walletPass, error: passError } = await supabase
      .from('wallet_passes')
      .select('*, customers(*)')
      .eq('serial_number', serialNumber)
      .eq('platform', 'google')
      .single();

    if (passError || !walletPass) {
      return res.status(404).json({ error: 'Google pass not found' });
    }

    const customer = walletPass.customers as { id: string; name: string; member_id?: string; balance: number; cashback_rate: number; loyalty_stage?: string; currency?: string; language?: string };
    const classId = `loyalty_${walletPass.studio_id}`.replace(/-/g, '_');
    const objectId = serialNumber.replace(/-/g, '_');

    // Fetch studio name + language for the localised pass labels and class branding
    const { data: studioData } = await supabase
      .from('studios')
      .select('name, settings')
      .eq('id', walletPass.studio_id)
      .single();
    const studioLanguage = (studioData?.settings as { language?: string } | null)?.language ?? 'en';

    // Refresh the loyalty class so branding (background colour, logo, hero) on
    // existing passes stays in sync with the Apple template. hexBackgroundColor
    // lives on the class, so an object-only update would never recolour the card.
    const { data: template } = await supabase
      .from('pass_templates')
      .select('*')
      .eq('studio_id', walletPass.studio_id)
      .eq('is_active', true)
      .single();
    const loyaltyTier = customer.loyalty_stage || 'base';
    const tierThemes = template?.tier_themes as Record<string, { backgroundColor?: string | null; stripImage?: string | null; logoOverride?: string | null }> || {};
    const tierTheme = tierThemes[loyaltyTier] || tierThemes['base'] || {};
    await googleWalletService.createOrUpdateClass({
      classId,
      studioName: studioData?.name || 'Studio',
      logoUrl: tierTheme.logoOverride || template?.logo_url || undefined,
      heroImageUrl: tierTheme.stripImage || undefined,
      hexBackgroundColor: tierTheme.backgroundColor || undefined,
    });

    // Update the Google Wallet object
    const success = await googleWalletService.createOrUpdateObject({
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

    if (success) {
      // Update version and snapshot
      await supabase
        .from('wallet_passes')
        .update({
          version: walletPass.version + 1,
        })
        .eq('id', walletPass.id);

      res.json({ success: true, message: 'Pass updated' });
    } else {
      res.status(500).json({ error: 'Failed to update Google pass' });
    }
  } catch (error) {
    console.error('Error updating Google pass:', error);
    res.status(500).json({ error: 'Failed to update pass' });
  }
});

// Debug: read the loyalty object Google currently stores for a serial and show
// it next to the balance/tier our DB expects. Answers "did our PUT land on the
// object the device shows?" without guessing — compare `google` vs `expected`.
googleRoutes.get('/object/:serialNumber', requireInternalAuth, async (req: Request, res: Response) => {
  try {
    const { serialNumber } = req.params;

    const { data: walletPass } = await supabase
      .from('wallet_passes')
      .select('*, customers(*)')
      .eq('serial_number', serialNumber)
      .eq('platform', 'google')
      .maybeSingle();

    if (!walletPass) {
      return res.status(404).json({ error: 'Google pass not found for serial', serialNumber });
    }

    const customer = walletPass.customers as { id: string; name: string; balance: number; cashback_rate: number; loyalty_stage?: string; currency?: string };
    const objectId = serialNumber.replace(/-/g, '_');

    const result = await googleWalletService.getObject(objectId);

    // Pull the few fields that actually render on the card out of Google's blob.
    let google: Record<string, unknown> | null = null;
    if (result.ok && result.object) {
      const obj = result.object as {
        id?: string;
        state?: string;
        loyaltyPoints?: { balance?: { money?: { micros?: number | string; currencyCode?: string } } };
        textModulesData?: { header?: string; body?: string }[];
      };
      // Google serializes int64 micros as a STRING ("21000000"), so coerce.
      const micros = obj.loyaltyPoints?.balance?.money?.micros;
      const microsNum = micros == null ? null : Number(micros);
      google = {
        id: obj.id,
        state: obj.state,
        balance: microsNum != null && !Number.isNaN(microsNum) ? microsNum / 1_000_000 : null,
        currency: obj.loyaltyPoints?.balance?.money?.currencyCode ?? null,
        rawLoyaltyPoints: obj.loyaltyPoints ?? null,
        textModules: obj.textModulesData?.map((t) => ({ header: t.header, body: t.body })) ?? [],
      };
    }

    res.json({
      serialNumber,
      objectId: `${googleConfig.issuerId}.${objectId}`,
      fetch: { ok: result.ok, status: result.status, error: result.error ?? null },
      expected: {
        balance: customer.balance,
        currency: (customer.currency || 'DKK').toUpperCase(),
        loyaltyTier: customer.loyalty_stage || 'base',
        cashbackRate: customer.cashback_rate,
      },
      google,
    });
  } catch (error) {
    console.error('Error reading Google object:', error);
    res.status(500).json({ error: 'Failed to read Google object' });
  }
});
