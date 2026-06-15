import { Router, Request, Response } from 'express';
import { supabase, appUrl } from '../config.js';

export const appleWebServiceRoutes = Router();

// Fire-and-forget notify the Next.js app to dispatch a card lifecycle webhook
// (card.installed / card.uninstalled). Authenticated with the shared internal
// secret, mirroring the /api/emails/pass-lifecycle call below.
function firePassLifecycle(
  type: 'card_installed' | 'card_uninstalled',
  payload: { customerId: string; studioId: string; serialNumber: string },
) {
  const secret = process.env.PASS_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  fetch(`${appUrl}/api/internal/pass-lifecycle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-loyalink-internal-secret': secret || '',
    },
    body: JSON.stringify({ type, platform: 'apple', ...payload }),
  }).catch((err: unknown) => console.error(`[${type}] Failed to dispatch lifecycle webhook:`, err));
}

// Middleware to verify authorization token
const verifyAuthToken = async (
  req: Request,
  res: Response,
  next: () => void
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('ApplePass ')) {
    return res.status(401).send('Unauthorized');
  }

  const token = authHeader.replace('ApplePass ', '');
  req.authToken = token;
  next();
};

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authToken?: string;
    }
  }
}

// Register device for push notifications
// POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
appleWebServiceRoutes.post(
  '/devices/:deviceId/registrations/:passTypeId/:serialNumber',
  verifyAuthToken,
  async (req: Request, res: Response) => {
    try {
      const { deviceId, serialNumber } = req.params;
      const { pushToken } = req.body;

      console.log(`Device registration: ${deviceId} for pass ${serialNumber}`);

      // Verify the pass exists and auth token matches
      const { data: walletPass, error: passError } = await supabase
        .from('wallet_passes')
        .select('id, customer_id, studio_id, status, authentication_token')
        .eq('serial_number', serialNumber)
        .single();

      if (passError || !walletPass) {
        console.error(`Device registration 404: pass ${serialNumber} not found in DB. passError=${passError?.message}`);
        return res.status(404).send('Pass not found');
      }

      if (walletPass.authentication_token !== req.authToken) {
        console.error(`Device registration 401: auth mismatch for pass ${serialNumber}. expected=${walletPass.authentication_token?.slice(0, 8)}... got=${req.authToken?.slice(0, 8)}...`);
        return res.status(401).send('Unauthorized');
      }

      console.log(`Device registration OK: pass=${serialNumber} customer=${walletPass.customer_id} device=${deviceId} pushToken=${pushToken?.slice(0, 8)}...`);

      // Upsert device registration
      const { error: regError } = await supabase
        .from('wallet_device_registrations')
        .upsert(
          {
            device_library_identifier: deviceId,
            push_token: pushToken,
            platform: 'apple',
            serial_number: serialNumber,
            is_active: true,
          },
          {
            onConflict: 'device_library_identifier,serial_number',
          }
        );

      if (regError) {
        console.error('Error registering device:', regError);
        return res.status(500).send('Registration failed');
      }

      // Fire card.installed only on the real transition into "installed" so a
      // customer registering a second device (e.g. iPhone + Apple Watch) or
      // re-registering the same device doesn't emit duplicate install events.
      const wasInstalled = walletPass.status === 'installed';

      // Update pass status to installed
      await supabase
        .from('wallet_passes')
        .update({
          status: 'installed',
          installed_at: new Date().toISOString(),
        })
        .eq('id', walletPass.id);

      if (!wasInstalled) {
        firePassLifecycle('card_installed', {
          customerId: walletPass.customer_id,
          studioId: walletPass.studio_id,
          serialNumber,
        });
      }

      // Return 201 for new registration, 200 for update
      res.status(201).send();
    } catch (error) {
      console.error('Error in device registration:', error);
      res.status(500).send('Internal error');
    }
  }
);

// Unregister device
// DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
appleWebServiceRoutes.delete(
  '/devices/:deviceId/registrations/:passTypeId/:serialNumber',
  verifyAuthToken,
  async (req: Request, res: Response) => {
    try {
      const { deviceId, serialNumber } = req.params;

      console.log(`Device unregistration: ${deviceId} for pass ${serialNumber}`);

      // Verify the pass exists and auth token matches
      const { data: walletPass } = await supabase
        .from('wallet_passes')
        .select('id, customer_id, studio_id, authentication_token')
        .eq('serial_number', serialNumber)
        .single();

      if (!walletPass || walletPass.authentication_token !== req.authToken) {
        return res.status(401).send('Unauthorized');
      }

      // Mark registration as inactive
      await supabase
        .from('wallet_device_registrations')
        .update({ is_active: false })
        .eq('device_library_identifier', deviceId)
        .eq('serial_number', serialNumber)
        .eq('platform', 'apple');

      // A pass can be installed on multiple devices (iPhone + Apple Watch + iPad).
      // Only treat the card as truly uninstalled — and emit the email + webhook —
      // once the last active device registration is gone.
      const { count: remainingDevices } = await supabase
        .from('wallet_device_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('serial_number', serialNumber)
        .eq('platform', 'apple')
        .eq('is_active', true);

      if ((remainingDevices ?? 0) === 0) {
        // Update pass status
        await supabase
          .from('wallet_passes')
          .update({ status: 'uninstalled' })
          .eq('id', walletPass.id);

        // Fire-and-forget: trigger uninstall email via the Next.js app
        const emailSecret = process.env.PASS_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
        fetch(`${appUrl}/api/emails/pass-lifecycle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-loyalink-internal-secret': emailSecret || '',
          },
          body: JSON.stringify({
            type: 'pass_uninstalled',
            customerId: walletPass.customer_id,
            studioId: walletPass.studio_id,
          }),
        }).catch((err: unknown) => console.error('[unregister] Failed to trigger uninstall email:', err));

        // Dispatch card.uninstalled webhook
        firePassLifecycle('card_uninstalled', {
          customerId: walletPass.customer_id,
          studioId: walletPass.studio_id,
          serialNumber,
        });
      }

      res.status(200).send();
    } catch (error) {
      console.error('Error in device unregistration:', error);
      res.status(500).send('Internal error');
    }
  }
);

// Get serial numbers of passes for device
// GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}
appleWebServiceRoutes.get(
  '/devices/:deviceId/registrations/:passTypeId',
  async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const { passesUpdatedSince } = req.query;

      console.log(`Getting passes for device: ${deviceId}`);

      // Get all active registrations for this device
      const { data: registrations, error } = await supabase
        .from('wallet_device_registrations')
        .select('serial_number')
        .eq('device_library_identifier', deviceId)
        .eq('platform', 'apple')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching registrations:', error);
        return res.status(500).send('Internal error');
      }

      if (!registrations || registrations.length === 0) {
        return res.status(204).send();
      }

      // Filter by update time if provided
      let serialNumbers = registrations.map((r) => r.serial_number);
      const lastUpdated = new Date().toISOString();

      if (passesUpdatedSince) {
        const since = new Date(passesUpdatedSince as string);

        // Fetch updated_at separately (no FK relationship in schema)
        const { data: passes } = await supabase
          .from('wallet_passes')
          .select('serial_number, updated_at')
          .in('serial_number', serialNumbers);

        serialNumbers = (passes || [])
          .filter((p) => new Date(p.updated_at) > since)
          .map((p) => p.serial_number);

        if (serialNumbers.length === 0) {
          return res.status(204).send();
        }
      }

      res.json({
        serialNumbers,
        lastUpdated,
      });
    } catch (error) {
      console.error('Error getting device passes:', error);
      res.status(500).send('Internal error');
    }
  }
);

// Get latest version of a pass
// GET /v1/passes/{passTypeIdentifier}/{serialNumber}
appleWebServiceRoutes.get(
  '/passes/:passTypeId/:serialNumber',
  verifyAuthToken,
  async (req: Request, res: Response) => {
    try {
      const { serialNumber } = req.params;

      console.log(`Getting updated pass: ${serialNumber}`);

      // Verify the pass exists and auth token matches
      const { data: walletPass } = await supabase
        .from('wallet_passes')
        .select('*, customers(*)')
        .eq('serial_number', serialNumber)
        .single();

      if (!walletPass || walletPass.authentication_token !== req.authToken) {
        return res.status(401).send('Unauthorized');
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

      const loyaltyTier = customer.loyalty_stage || 'base';
      const tierThemes = template?.tier_themes as Record<string, { backgroundColor: string; foregroundColor: string; labelColor: string; stripImage?: string | null; logoOverride?: string | null }> || {};
      const tierTheme = tierThemes[loyaltyTier] || tierThemes['base'] || { backgroundColor: '#ffffff', foregroundColor: '#000000', labelColor: '#666666' };
      const staticTexts = template?.static_texts as Record<string, string> || {};

      // Fetch studio name and language
      const { data: studioData } = await supabase
        .from('studios')
        .select('name, settings')
        .eq('id', walletPass.studio_id)
        .single();
      const studioName = studioData?.name ?? 'Loyalink';
      const studioLanguage = (studioData?.settings as { language?: string } | null)?.language ?? 'en';

      const { applePassService } = await import('../services/applePassService.js');
      const passBuffer = await applePassService.generatePass({
        serialNumber: walletPass.serial_number,
        authenticationToken: walletPass.authentication_token,
        studioName,
        customerName: customer.name,
        balance: customer.balance,
        cashbackRate: customer.cashback_rate,
        loyaltyTier: customer.loyalty_stage || 'base',
        memberId: customer.member_id || customer.id,
        currency: customer.currency || 'DKK',
        language: customer.language || studioLanguage,
        pushMessage: walletPass.push_message || undefined,
        logoUrl: tierTheme.logoOverride || template?.logo_url || undefined,
        iconUrl: template?.icon_url || undefined,
        heroImageUrl: tierTheme.stripImage || undefined,
        backgroundColor: tierTheme.backgroundColor,
        foregroundColor: tierTheme.foregroundColor,
        labelColor: tierTheme.labelColor,
        staticTexts: {
          referral_program: staticTexts.referralText || '',
          how_it_works: staticTexts.howItWorks || '',
          announcement: staticTexts.announcement || '',
        },
      });

      console.log(`Serving updated pass: ${serialNumber}, balance=${customer.balance}`);
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
      res.setHeader('Last-Modified', new Date(walletPass.updated_at || Date.now()).toUTCString());
      res.setHeader('Cache-Control', 'no-store');
      res.send(passBuffer);
    } catch (error) {
      console.error('Error getting pass:', error);
      res.status(500).send('Internal error');
    }
  }
);

// Log messages from Apple Wallet
// POST /v1/log
appleWebServiceRoutes.post('/log', async (req: Request, res: Response) => {
  try {
    const { logs } = req.body;

    if (logs && Array.isArray(logs)) {
      logs.forEach((log: string) => {
        console.error('[Apple Wallet ERROR LOG]', log);
      });
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error logging:', error);
    res.status(500).send('Internal error');
  }
});
