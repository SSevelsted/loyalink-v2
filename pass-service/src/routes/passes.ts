import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config.js';
import { applePassService } from '../services/applePassService.js';

export const passRoutes = Router();

// Generate a new pass for a customer
passRoutes.post('/generate', async (req: Request, res: Response) => {
  try {
    const { customerId, platform = 'apple' } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*, studios(name)')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Fetch template for the studio
    const { data: template } = await supabase
      .from('pass_templates')
      .select('*')
      .eq('studio_id', customer.studio_id)
      .eq('is_active', true)
      .single();

    // Generate serial number and auth token
    const serialNumber = `PASS-${uuidv4()}`;
    const authenticationToken = uuidv4();

    // Determine tier colors
    const loyaltyTier = customer.loyalty_stage || 'base';
    const tierThemes = template?.tier_themes as Record<string, { backgroundColor: string; foregroundColor: string; labelColor: string }> || {};
    const tierTheme = tierThemes[loyaltyTier] || tierThemes['base'] || {
      backgroundColor: '#ffffff',
      foregroundColor: '#000000',
      labelColor: '#666666',
    };

    // Create wallet pass record
    const { data: walletPass, error: passError } = await supabase
      .from('wallet_passes')
      .insert({
        customer_id: customerId,
        studio_id: customer.studio_id,
        template_id: template?.id || null,
        serial_number: serialNumber,
        authentication_token: authenticationToken,
        platform,
        status: 'active',
      })
      .select()
      .single();

    if (passError) {
      console.error('Error creating wallet pass:', passError);
      return res.status(500).json({ error: 'Failed to create pass record' });
    }

    // Update customer to use self-hosted passes
    await supabase
      .from('customers')
      .update({ pass_provider: 'self_hosted' })
      .eq('id', customerId);

    if (platform === 'apple') {
      // Generate Apple Wallet pass
      const staticTexts = template?.static_texts as Record<string, string> || {
        referral_program: 'Refer Friends. Both Earn Cashback.',
        how_it_works: '1. Scan your card when visiting\n2. Earn cashback on purchases',
        announcement: '',
      };

      await applePassService.generatePass({
        serialNumber,
        authenticationToken,
        customerName: customer.name,
        balance: customer.balance,
        cashbackRate: customer.cashback_rate,
        loyaltyTier: formatTierName(loyaltyTier),
        memberId: customer.member_id || customerId,
        currency: customer.currency || 'DKK',
        logoUrl: template?.logo_url || undefined,
        iconUrl: template?.icon_url || undefined,
        heroImageUrl: template?.hero_image_url || undefined,
        backgroundColor: tierTheme.backgroundColor,
        foregroundColor: tierTheme.foregroundColor,
        labelColor: tierTheme.labelColor,
        staticTexts: {
          referral_program: staticTexts.referral_program || '',
          how_it_works: staticTexts.how_it_works || '',
          announcement: staticTexts.announcement || '',
        },
      });

      res.json({
        success: true,
        passId: walletPass.id,
        serialNumber,
        downloadUrl: `/api/passes/${serialNumber}/download`,
      });
    } else {
      // Google Wallet - return save URL
      res.json({
        success: true,
        passId: walletPass.id,
        serialNumber,
        saveUrl: `/api/google/save-url/${serialNumber}`,
      });
    }
  } catch (error) {
    console.error('Error generating pass:', error);
    res.status(500).json({ error: 'Failed to generate pass' });
  }
});

// Download a .pkpass file
passRoutes.get('/:serialNumber/download', async (req: Request, res: Response) => {
  try {
    const { serialNumber } = req.params;
    console.log(`[download] Request for serial: ${serialNumber}`);

    // Fetch pass and customer data
    const { data: walletPass, error: passError } = await supabase
      .from('wallet_passes')
      .select('*, customers(*)')
      .eq('serial_number', serialNumber)
      .single();

    if (passError || !walletPass) {
      console.log(`[download] Pass not found: ${serialNumber}`, passError);
      return res.status(404).json({ error: 'Pass not found' });
    }
    console.log(`[download] Pass found, generating pkpass...`);

    const customer = walletPass.customers as { id: string; name: string; member_id?: string; balance: number; cashback_rate: number; loyalty_stage?: string; currency?: string };

    // Fetch template
    const { data: template } = await supabase
      .from('pass_templates')
      .select('*')
      .eq('studio_id', walletPass.studio_id)
      .eq('is_active', true)
      .single();

    // Get tier theme
    const loyaltyTier = customer.loyalty_stage || 'base';
    const tierThemes = template?.tier_themes as Record<string, { backgroundColor: string; foregroundColor: string; labelColor: string }> || {};
    const tierTheme = tierThemes[loyaltyTier] || tierThemes['base'] || {
      backgroundColor: '#ffffff',
      foregroundColor: '#000000',
      labelColor: '#666666',
    };

    const staticTexts = template?.static_texts as Record<string, string> || {
      referral_program: '',
      how_it_works: '',
      announcement: '',
    };

    // Generate pass
    const generatedPass = await applePassService.generatePass({
      serialNumber: walletPass.serial_number,
      authenticationToken: walletPass.authentication_token,
      customerName: customer.name,
      balance: customer.balance,
      cashbackRate: customer.cashback_rate,
      loyaltyTier: formatTierName(loyaltyTier),
      memberId: customer.member_id || customer.id,
      currency: customer.currency || 'DKK',
      logoUrl: template?.logo_url || undefined,
      iconUrl: template?.icon_url || undefined,
      heroImageUrl: template?.hero_image_url || undefined,
      backgroundColor: tierTheme.backgroundColor,
      foregroundColor: tierTheme.foregroundColor,
      labelColor: tierTheme.labelColor,
      staticTexts: {
        referral_program: staticTexts.referral_program || '',
        how_it_works: staticTexts.how_it_works || '',
        announcement: staticTexts.announcement || '',
      },
    });

    console.log(`[download] Pass generated, size: ${generatedPass.length} bytes`);
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="${serialNumber}.pkpass"`);
    res.send(generatedPass);
  } catch (error) {
    console.error('Error downloading pass:', error);
    res.status(500).json({ error: 'Failed to download pass' });
  }
});

// Helper function to format tier name
function formatTierName(tierId: string): string {
  return tierId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
