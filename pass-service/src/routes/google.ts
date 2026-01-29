import { Router, Request, Response } from 'express';
import { supabase, googleConfig } from '../config.js';
import { googleWalletService } from '../services/googleWalletService.js';

export const googleRoutes = Router();

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

    const customer = walletPass.customers as any;

    // Fetch template
    const { data: template } = await supabase
      .from('pass_templates')
      .select('*')
      .eq('studio_id', walletPass.studio_id)
      .eq('is_active', true)
      .single();

    // Create/update Google Wallet class for this studio
    const classId = `loyalty_${walletPass.studio_id}`.replace(/-/g, '_');

    // Fetch studio name
    const { data: studio } = await supabase
      .from('studios')
      .select('name')
      .eq('studio_id', walletPass.studio_id)
      .single();

    await googleWalletService.createOrUpdateClass({
      classId,
      studioName: studio?.name || 'Studio',
      logoUrl: template?.logo_url || undefined,
      heroImageUrl: template?.hero_image_url || undefined,
    });

    // Create object ID from serial number
    const objectId = serialNumber.replace(/-/g, '_');

    // Create save JWT
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
    });

    if (jwt) {
      res.json({
        success: true,
        saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
      });
    } else {
      // Fallback to basic save URL
      const saveUrl = googleWalletService.generateSaveUrl(objectId);
      res.json({
        success: true,
        saveUrl,
        note: 'Using basic save URL - JWT signing not configured',
      });
    }
  } catch (error) {
    console.error('Error generating Google save URL:', error);
    res.status(500).json({ error: 'Failed to generate save URL' });
  }
});

// Update a Google Wallet pass (called when customer data changes)
googleRoutes.post('/update/:serialNumber', async (req: Request, res: Response) => {
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

    const customer = walletPass.customers as any;
    const classId = `loyalty_${walletPass.studio_id}`.replace(/-/g, '_');
    const objectId = serialNumber.replace(/-/g, '_');

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
    });

    if (success) {
      // Update version and snapshot
      await supabase
        .from('wallet_passes')
        .update({
          version: walletPass.version + 1,
          last_value_snapshot: {
            balance: customer.balance,
            cashback_rate: customer.cashback_rate,
            loyalty_stage: customer.loyalty_stage,
          },
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
