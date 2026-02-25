import { Router, Request, Response } from 'express';
import { supabase } from '../config.js';

export const appleWebServiceRoutes = Router();

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
        .select('id, customer_id, authentication_token')
        .eq('serial_number', serialNumber)
        .single();

      if (passError || !walletPass) {
        return res.status(404).send('Pass not found');
      }

      if (walletPass.authentication_token !== req.authToken) {
        return res.status(401).send('Unauthorized');
      }

      // Upsert device registration
      const { error: regError } = await supabase
        .from('wallet_device_registrations')
        .upsert(
          {
            customer_id: walletPass.customer_id,
            wallet_pass_id: walletPass.id,
            device_library_identifier: deviceId,
            push_token: pushToken,
            platform: 'apple',
            serial_number: serialNumber,
            is_active: true,
          },
          {
            onConflict: 'device_library_identifier,serial_number,platform',
          }
        );

      if (regError) {
        console.error('Error registering device:', regError);
        return res.status(500).send('Registration failed');
      }

      // Update pass status to installed
      await supabase
        .from('wallet_passes')
        .update({
          status: 'installed',
          installed_at: new Date().toISOString(),
        })
        .eq('id', walletPass.id);

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
        .select('id, authentication_token')
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

      // Update pass status
      await supabase
        .from('wallet_passes')
        .update({ status: 'uninstalled' })
        .eq('id', walletPass.id);

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
      const query = supabase
        .from('wallet_device_registrations')
        .select('serial_number, wallet_passes(updated_at)')
        .eq('device_library_identifier', deviceId)
        .eq('platform', 'apple')
        .eq('is_active', true);

      const { data: registrations, error } = await query;

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
        serialNumbers = registrations
          .filter((r) => {
            const pass = r.wallet_passes as { updated_at: string } | null;
            return pass && new Date(pass.updated_at) > since;
          })
          .map((r) => r.serial_number);

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

      console.log(`Getting pass: ${serialNumber}`);

      // Verify the pass exists and auth token matches
      const { data: walletPass } = await supabase
        .from('wallet_passes')
        .select('*, customers(*)')
        .eq('serial_number', serialNumber)
        .single();

      if (!walletPass || walletPass.authentication_token !== req.authToken) {
        return res.status(401).send('Unauthorized');
      }

      // Redirect to download endpoint
      // This could also generate the pass inline
      res.redirect(`/api/passes/${serialNumber}/download`);
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
