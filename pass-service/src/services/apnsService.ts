import http2 from 'http2';
import { apnsConfig } from '../config.js';

export class APNsService {
  private getAuthToken(): string | null {
    if (!apnsConfig.keyBase64 || !apnsConfig.keyId || !apnsConfig.teamId) {
      console.warn('APNs credentials not configured');
      return null;
    }

    try {
      // Create JWT for APNs authentication
      // Header
      const header = {
        alg: 'ES256',
        kid: apnsConfig.keyId,
      };

      // Claims
      const claims = {
        iss: apnsConfig.teamId,
        iat: Math.floor(Date.now() / 1000),
      };

      // Note: Actual implementation would use the .p8 key to sign with ES256
      // This is a placeholder - implement proper ES256 signing
      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');

      // In production, sign with the actual private key
      return `${headerB64}.${claimsB64}.placeholder_signature`;
    } catch (error) {
      console.error('Error creating APNs auth token:', error);
      return null;
    }
  }

  async sendPushNotification(pushToken: string): Promise<boolean> {
    const authToken = this.getAuthToken();
    if (!authToken) return false;

    return new Promise((resolve) => {
      try {
        const client = http2.connect(`https://${apnsConfig.host}`);

        const headers = {
          ':method': 'POST',
          ':path': `/3/device/${pushToken}`,
          'authorization': `bearer ${authToken}`,
          'apns-topic': apnsConfig.teamId, // Pass type ID
          'apns-push-type': 'background',
          'apns-priority': '5',
        };

        // Empty payload for pass updates
        // Apple Wallet automatically fetches the updated pass
        const payload = JSON.stringify({});

        const req = client.request(headers);

        req.on('response', (responseHeaders) => {
          const status = responseHeaders[':status'];
          if (status === 200) {
            console.log('Push notification sent successfully');
            resolve(true);
          } else {
            console.error('APNs error:', status);
            resolve(false);
          }
        });

        req.on('error', (error) => {
          console.error('APNs request error:', error);
          resolve(false);
        });

        req.write(payload);
        req.end();

        // Close connection after request
        req.on('close', () => {
          client.close();
        });
      } catch (error) {
        console.error('Error sending push notification:', error);
        resolve(false);
      }
    });
  }

  async sendBulkPushNotifications(pushTokens: string[]): Promise<{
    sent: number;
    failed: number;
  }> {
    let sent = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming APNs
    const batchSize = 100;
    for (let i = 0; i < pushTokens.length; i += batchSize) {
      const batch = pushTokens.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map((token) => this.sendPushNotification(token))
      );

      results.forEach((success) => {
        if (success) sent++;
        else failed++;
      });

      // Small delay between batches
      if (i + batchSize < pushTokens.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { sent, failed };
  }
}

export const apnsService = new APNsService();
