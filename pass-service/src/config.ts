import { createClient } from '@supabase/supabase-js';

// Supabase client with service role key
export const supabase = createClient(
  process.env.SUPABASE_URL!.replace(/\s+/g, ''),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/\s+/g, '')
);

// Apple configuration
export const appleConfig = {
  passTypeId: process.env.APPLE_PASS_TYPE_ID || 'YDBX8M7WAF.pass.com.loyaltycard.studio',
  teamId: process.env.APPLE_TEAM_ID || '',
  certificateBase64: process.env.APPLE_PASS_CERTIFICATE_BASE64 || '',
  certificatePassword: process.env.APPLE_PASS_CERTIFICATE_PASSWORD || '',
};

// APNs configuration
export const apnsConfig = {
  keyBase64: process.env.APNS_KEY_BASE64 || '',
  keyId: process.env.APNS_KEY_ID || '',
  teamId: process.env.APPLE_TEAM_ID || '',
  host: process.env.APNS_HOST || 'api.sandbox.push.apple.com',
};

// Google configuration
export const googleConfig = {
  issuerId: process.env.GOOGLE_ISSUER_ID || '',
  serviceAccountBase64: process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '',
};

// Public URL for web service callbacks
export const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
