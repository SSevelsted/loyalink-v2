import http2 from 'http2';
import crypto from 'crypto';
import { apnsConfig, appleConfig } from '../config.js';

// Convert DER-encoded ECDSA signature to compact JWT r||s format
function derToJwt(der: Buffer): Buffer {
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f; // long-form length
  offset++; // skip 0x02 (r tag)
  const rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  offset++; // skip 0x02 (s tag)
  const sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);
  // Pad/trim each component to exactly 32 bytes
  while (r.length < 32) r = Buffer.concat([Buffer.alloc(1), r]);
  if (r.length > 32) r = r.slice(r.length - 32);
  while (s.length < 32) s = Buffer.concat([Buffer.alloc(1), s]);
  if (s.length > 32) s = s.slice(s.length - 32);
  return Buffer.concat([r, s]);
}

export class APNsService {
  private getAuthToken(): string | null {
    if (!apnsConfig.keyBase64 || !apnsConfig.keyId || !apnsConfig.teamId) {
      console.warn('APNs credentials not configured');
      return null;
    }

    try {
      const header = { alg: 'ES256', kid: apnsConfig.keyId };
      const claims = { iss: apnsConfig.teamId, iat: Math.floor(Date.now() / 1000) };

      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
      const signingInput = `${headerB64}.${claimsB64}`;

      const keyPem = Buffer.from(apnsConfig.keyBase64, 'base64').toString('utf8');
      const sign = crypto.createSign('SHA256');
      sign.update(signingInput);
      sign.end();
      const derSig = sign.sign(keyPem);
      const sig = derToJwt(derSig).toString('base64url');

      return `${signingInput}.${sig}`;
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
          'apns-topic': appleConfig.passTypeId,
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
