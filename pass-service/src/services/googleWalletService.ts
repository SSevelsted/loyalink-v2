import crypto from 'crypto';
import { GoogleAuth } from 'google-auth-library';
import { googleConfig, appUrl, publicUrl } from '../config.js';

// Save/delete callback URL registered on every loyalty class. Google POSTs here
// when a user adds or removes the pass; the optional token authenticates it.
function googleCallbackUrl(): string {
  const base = `${publicUrl}/api/google/callback`;
  return googleConfig.callbackToken ? `${base}?token=${googleConfig.callbackToken}` : base;
}

/**
 * Customer-facing labels rendered on the Google Wallet pass surface. Mirrors
 * the language coverage in applePassService.ts so a studio's Apple and Google
 * customers see the same words. Unknown codes fall back to English.
 */
interface GoogleWalletLabels {
  balance: string;
  tier: string;
  cashbackRate: string;
}

const GOOGLE_WALLET_LABELS: Record<string, GoogleWalletLabels> = {
  en: { balance: 'Balance', tier: 'Tier', cashbackRate: 'Cashback Rate' },
  da: { balance: 'Saldo', tier: 'Niveau', cashbackRate: 'Cashback-sats' },
  sv: { balance: 'Saldo', tier: 'Nivå', cashbackRate: 'Cashback-sats' },
  no: { balance: 'Saldo', tier: 'Nivå', cashbackRate: 'Cashback-sats' },
  nb: { balance: 'Saldo', tier: 'Nivå', cashbackRate: 'Cashback-sats' },
  de: { balance: 'Guthaben', tier: 'Stufe', cashbackRate: 'Cashback-Rate' },
  fr: { balance: 'Solde', tier: 'Niveau', cashbackRate: 'Taux de cashback' },
  es: { balance: 'Saldo', tier: 'Nivel', cashbackRate: 'Tasa de cashback' },
  nl: { balance: 'Saldo', tier: 'Niveau', cashbackRate: 'Cashback-percentage' },
  pl: { balance: 'Saldo', tier: 'Poziom', cashbackRate: 'Stawka cashbacku' },
};

function getGoogleWalletLabels(language?: string): GoogleWalletLabels {
  if (!language) return GOOGLE_WALLET_LABELS.en;
  return GOOGLE_WALLET_LABELS[language.toLowerCase()] ?? GOOGLE_WALLET_LABELS.en;
}

interface LoyaltyClassData {
  classId: string;
  studioName: string;
  logoUrl?: string;
  heroImageUrl?: string;
}

interface LoyaltyObjectData {
  objectId: string;
  classId: string;
  customerId: string;
  customerName: string;
  memberId: string;
  balance: number;
  cashbackRate: number;
  loyaltyTier: string;
  currency: string;
  language?: string;
  // Studio branding for the inline class definition carried in the save JWT.
  studioName?: string;
  logoUrl?: string;
  heroImageUrl?: string;
}

export class GoogleWalletService {
  private auth: GoogleAuth | null = null;
  private baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    try {
      if (!googleConfig.serviceAccountBase64) {
        console.warn('Google service account not configured');
        return;
      }

      const serviceAccountJson = Buffer.from(
        googleConfig.serviceAccountBase64,
        'base64'
      ).toString('utf-8');
      const credentials = JSON.parse(serviceAccountJson);

      this.auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });

      console.log('Google Wallet authentication initialized');
    } catch (error) {
      console.error('Error initializing Google auth:', error);
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.auth) return null;

    try {
      const client = await this.auth.getClient();
      const tokenResponse = await client.getAccessToken();
      return tokenResponse.token || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async createOrUpdateClass(data: LoyaltyClassData): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    const classPayload = {
      id: `${googleConfig.issuerId}.${data.classId}`,
      issuerName: data.studioName,
      reviewStatus: 'UNDER_REVIEW',
      programName: `${data.studioName} Loyalty`,
      // Notifies our pass-service when a user saves or removes this pass.
      callbackOptions: { url: googleCallbackUrl() },
      programLogo: data.logoUrl
        ? {
            sourceUri: { uri: data.logoUrl },
            contentDescription: {
              defaultValue: { language: 'en-US', value: 'Logo' },
            },
          }
        : undefined,
      heroImage: data.heroImageUrl
        ? {
            sourceUri: { uri: data.heroImageUrl },
            contentDescription: {
              defaultValue: { language: 'en-US', value: 'Hero' },
            },
          }
        : undefined,
    };

    try {
      // Try to update first
      const updateResponse = await fetch(
        `${this.baseUrl}/loyaltyClass/${googleConfig.issuerId}.${data.classId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(classPayload),
        }
      );

      if (updateResponse.ok) return true;

      // If not found, create new
      if (updateResponse.status === 404) {
        const createResponse = await fetch(`${this.baseUrl}/loyaltyClass`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(classPayload),
        });

        return createResponse.ok;
      }

      return false;
    } catch (error) {
      console.error('Error creating/updating loyalty class:', error);
      return false;
    }
  }

  async createOrUpdateObject(data: LoyaltyObjectData): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    const labels = getGoogleWalletLabels(data.language);

    const objectPayload = {
      id: `${googleConfig.issuerId}.${data.objectId}`,
      classId: `${googleConfig.issuerId}.${data.classId}`,
      state: 'ACTIVE',
      accountId: data.memberId,
      accountName: data.customerName,
      loyaltyPoints: {
        label: labels.balance,
        balance: {
          money: {
            micros: data.balance * 1000000,
            // Google requires a valid ISO 4217 code in UPPERCASE; some studios
            // store it lowercase (e.g. "eur"), which Google rejects with a
            // generic "a problem occurred" error during the save flow.
            currencyCode: data.currency.toUpperCase(),
          },
        },
      },
      textModulesData: [
        {
          header: labels.tier,
          body: data.loyaltyTier,
        },
        {
          header: labels.cashbackRate,
          body: `${data.cashbackRate}%`,
        },
      ],
      // Multi-purpose QR: encodes the referral URL (phone camera → referral page);
      // the in-app studio scanner extracts the member id from the trailing segment.
      barcode: {
        type: 'QR_CODE',
        value: `${appUrl}/refer/${data.memberId}`,
      },
    };

    try {
      // Try to update first
      const updateResponse = await fetch(
        `${this.baseUrl}/loyaltyObject/${googleConfig.issuerId}.${data.objectId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(objectPayload),
        }
      );

      if (updateResponse.ok) return true;

      // If not found, create new
      if (updateResponse.status === 404) {
        const createResponse = await fetch(`${this.baseUrl}/loyaltyObject`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(objectPayload),
        });

        return createResponse.ok;
      }

      return false;
    } catch (error) {
      console.error('Error creating/updating loyalty object:', error);
      return false;
    }
  }

  async createSaveJwt(objectData: LoyaltyObjectData): Promise<string | null> {
    if (!googleConfig.serviceAccountBase64) return null;

    try {
      const serviceAccountJson = Buffer.from(
        googleConfig.serviceAccountBase64,
        'base64'
      ).toString('utf-8');
      const credentials = JSON.parse(serviceAccountJson);

      const studioName = objectData.studioName || 'Loyalty Program';

      // Inline class definition. Google creates the class from this on save if
      // it doesn't already exist, so we don't depend on a prior REST class
      // write succeeding (some studios were missing a class entirely).
      const inlineClass: Record<string, unknown> = {
        id: `${googleConfig.issuerId}.${objectData.classId}`,
        issuerName: studioName,
        reviewStatus: 'UNDER_REVIEW',
        programName: `${studioName} Loyalty`,
        // Notifies our pass-service when a user saves or removes this pass.
        callbackOptions: { url: googleCallbackUrl() },
      };
      if (objectData.logoUrl) {
        inlineClass.programLogo = {
          sourceUri: { uri: objectData.logoUrl },
          contentDescription: { defaultValue: { language: 'en-US', value: 'Logo' } },
        };
      }
      if (objectData.heroImageUrl) {
        inlineClass.heroImage = {
          sourceUri: { uri: objectData.heroImageUrl },
          contentDescription: { defaultValue: { language: 'en-US', value: 'Hero' } },
        };
      }

      // Save-to-wallet JWT. NOTE: no `origins` claim — this pass is added via a
      // full-page redirect to pay.google.com, during which the browser commonly
      // strips the Referer header (default Referrer-Policy). Google then fails
      // its origins check and silently bounces the user to the wallet home
      // without adding the card. `origins` is only needed for the JS button
      // flow, so it is intentionally omitted here.
      const claims = {
        iss: credentials.client_email,
        aud: 'google',
        typ: 'savetowallet',
        iat: Math.floor(Date.now() / 1000),
        payload: {
          loyaltyClasses: [inlineClass],
          loyaltyObjects: [
            {
              id: `${googleConfig.issuerId}.${objectData.objectId}`,
              classId: `${googleConfig.issuerId}.${objectData.classId}`,
              state: 'ACTIVE',
              accountId: objectData.memberId,
              accountName: objectData.customerName,
              loyaltyPoints: {
                label: getGoogleWalletLabels(objectData.language).balance,
                balance: {
                  money: {
                    micros: objectData.balance * 1000000,
                    // Uppercase: Google rejects lowercase currency codes (see
                    // createOrUpdateObject) — this is the save-flow path.
                    currencyCode: objectData.currency.toUpperCase(),
                  },
                },
              },
              textModulesData: [
                { header: getGoogleWalletLabels(objectData.language).tier, body: objectData.loyaltyTier },
                { header: getGoogleWalletLabels(objectData.language).cashbackRate, body: `${objectData.cashbackRate}%` },
              ],
              barcode: {
                type: 'QR_CODE',
                value: `${appUrl}/refer/${objectData.memberId}`,
              },
            },
          ],
        },
      };

      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');

      const sign = crypto.createSign('RSA-SHA256');
      sign.update(`${header}.${payload}`);
      sign.end();
      const signature = sign.sign(credentials.private_key, 'base64url');

      return `${header}.${payload}.${signature}`;
    } catch (error) {
      console.error('Error creating save JWT:', error);
      return null;
    }
  }
}

export const googleWalletService = new GoogleWalletService();
