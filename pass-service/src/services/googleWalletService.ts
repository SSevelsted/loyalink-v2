import crypto from 'crypto';
import { GoogleAuth } from 'google-auth-library';
import { googleConfig } from '../config.js';

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

    const objectPayload = {
      id: `${googleConfig.issuerId}.${data.objectId}`,
      classId: `${googleConfig.issuerId}.${data.classId}`,
      state: 'ACTIVE',
      accountId: data.memberId,
      accountName: data.customerName,
      loyaltyPoints: {
        label: 'Balance',
        balance: {
          money: {
            micros: data.balance * 1000000,
            currencyCode: data.currency,
          },
        },
      },
      textModulesData: [
        {
          header: 'Tier',
          body: data.loyaltyTier,
        },
        {
          header: 'Cashback Rate',
          body: `${data.cashbackRate}%`,
        },
      ],
      barcode: {
        type: 'QR_CODE',
        value: data.memberId,
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

  generateSaveUrl(objectId: string): string {
    // Create JWT for save URL
    // In production, this would be a properly signed JWT
    // For now, return a placeholder
    const fullObjectId = `${googleConfig.issuerId}.${objectId}`;

    // The actual implementation would sign a JWT with the service account
    // and create a URL like: https://pay.google.com/gp/v/save/{JWT}

    return `https://pay.google.com/gp/v/save/${fullObjectId}`;
  }

  async createSaveJwt(objectData: LoyaltyObjectData): Promise<string | null> {
    if (!googleConfig.serviceAccountBase64) return null;

    try {
      const serviceAccountJson = Buffer.from(
        googleConfig.serviceAccountBase64,
        'base64'
      ).toString('utf-8');
      const credentials = JSON.parse(serviceAccountJson);

      // Create the class first (ignore errors - may already exist)
      await this.createOrUpdateClass({
        classId: objectData.classId,
        studioName: 'Loyalty Program',
      });

      // Include full object inline in JWT so Google creates it on save
      const claims = {
        iss: credentials.client_email,
        aud: 'google',
        origins: ['https://loyalink.ai'],
        typ: 'savetowallet',
        payload: {
          loyaltyClasses: [
            {
              id: `${googleConfig.issuerId}.${objectData.classId}`,
              issuerName: 'Loyalty Program',
              reviewStatus: 'UNDER_REVIEW',
              programName: 'Loyalty',
            },
          ],
          loyaltyObjects: [
            {
              id: `${googleConfig.issuerId}.${objectData.objectId}`,
              classId: `${googleConfig.issuerId}.${objectData.classId}`,
              state: 'ACTIVE',
              accountId: objectData.memberId,
              accountName: objectData.customerName,
              loyaltyPoints: {
                label: 'Balance',
                balance: {
                  money: {
                    micros: objectData.balance * 1000000,
                    currencyCode: objectData.currency,
                  },
                },
              },
              textModulesData: [
                { header: 'Tier', body: objectData.loyaltyTier },
                { header: 'Cashback Rate', body: `${objectData.cashbackRate}%` },
              ],
              barcode: {
                type: 'QR_CODE',
                value: objectData.memberId,
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
