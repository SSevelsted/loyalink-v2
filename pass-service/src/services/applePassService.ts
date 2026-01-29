import archiver from 'archiver';
import crypto from 'crypto';
import forge from 'node-forge';
import { PassThrough } from 'stream';
import { appleConfig, publicUrl } from '../config.js';

interface PassData {
  serialNumber: string;
  authenticationToken: string;
  customerName: string;
  balance: number;
  cashbackRate: number;
  loyaltyTier: string;
  memberId: string;
  currency: string;
  logoUrl?: string;
  iconUrl?: string;
  heroImageUrl?: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  staticTexts: {
    referral_program: string;
    how_it_works: string;
    announcement: string;
  };
}

interface PassJson {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  webServiceURL: string;
  authenticationToken: string;
  organizationName: string;
  description: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  storeCard: {
    headerFields: Array<{ key: string; label: string; value: string }>;
    primaryFields: Array<{ key: string; label: string; value: string }>;
    secondaryFields: Array<{ key: string; label: string; value: string }>;
    backFields: Array<{ key: string; label: string; value: string }>;
  };
  barcode: {
    format: string;
    message: string;
    messageEncoding: string;
  };
}

export class ApplePassService {
  private certificate: any = null;
  private privateKey: any = null;
  private wwdrCert: any = null;

  constructor() {
    this.loadCertificates();
  }

  private loadCertificates(): void {
    try {
      if (!appleConfig.certificateBase64) {
        console.warn('Apple certificate not configured');
        return;
      }

      const p12Der = Buffer.from(appleConfig.certificateBase64, 'base64');
      const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Der.toString('binary')));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, appleConfig.certificatePassword);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

      const certBag = certBags[forge.pki.oids.certBag];
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

      if (certBag && certBag.length > 0 && certBag[0].cert) {
        this.certificate = certBag[0].cert;
      }

      if (keyBag && keyBag.length > 0 && keyBag[0].key) {
        this.privateKey = keyBag[0].key;
      }

      console.log('Apple certificates loaded successfully');
    } catch (error) {
      console.error('Error loading Apple certificates:', error);
    }
  }

  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  private createFallbackIcon(): Buffer {
    // Minimal 1x1 white PNG (valid PNG file)
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
  }

  async generatePass(data: PassData): Promise<Buffer> {
    const passJson = this.createPassJson(data);

    const files: Map<string, Buffer> = new Map();
    const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2));
    files.set('pass.json', passJsonBuffer);

    // Download and add image files
    // icon.png is REQUIRED by Apple
    const iconBuffer = data.iconUrl
      ? await this.downloadImage(data.iconUrl)
      : null;
    files.set('icon.png', iconBuffer || this.createFallbackIcon());

    if (data.logoUrl) {
      const logoBuffer = await this.downloadImage(data.logoUrl);
      if (logoBuffer) files.set('logo.png', logoBuffer);
    }

    if (data.heroImageUrl) {
      const stripBuffer = await this.downloadImage(data.heroImageUrl);
      if (stripBuffer) files.set('strip.png', stripBuffer);
    }

    // Build manifest from all content files (not manifest/signature themselves)
    const manifest: Record<string, string> = {};
    for (const [filename, content] of files) {
      const hash = crypto.createHash('sha1').update(content).digest('hex');
      manifest[filename] = hash;
    }
    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    files.set('manifest.json', manifestBuffer);

    const signature = this.createSignature(manifestBuffer);
    if (signature) {
      files.set('signature', signature);
    }

    return this.createPkPassZip(files);
  }

  private createPassJson(data: PassData): PassJson {
    return {
      formatVersion: 1,
      passTypeIdentifier: appleConfig.passTypeId,
      serialNumber: data.serialNumber,
      teamIdentifier: appleConfig.teamId,
      webServiceURL: `${publicUrl}/v1`,
      authenticationToken: data.authenticationToken,
      organizationName: 'LoyaLink',
      description: 'Loyalty Card',
      backgroundColor: data.backgroundColor,
      foregroundColor: data.foregroundColor,
      labelColor: data.labelColor,
      storeCard: {
        headerFields: [
          {
            key: 'balance',
            label: 'BALANCE:',
            value: `${data.balance} ${data.currency}`,
          },
        ],
        primaryFields: [
          {
            key: 'member',
            label: 'MEMBER',
            value: data.customerName,
          },
        ],
        secondaryFields: [
          {
            key: 'tier',
            label: 'TIER',
            value: data.loyaltyTier,
          },
          {
            key: 'cashback',
            label: 'CASHBACK',
            value: `${data.cashbackRate}%`,
          },
        ],
        backFields: [
          {
            key: 'referral',
            label: 'Refer Friends',
            value: data.staticTexts.referral_program,
          },
          {
            key: 'howItWorks',
            label: 'How It Works',
            value: data.staticTexts.how_it_works,
          },
          ...(data.staticTexts.announcement
            ? [
                {
                  key: 'announcement',
                  label: 'Announcement',
                  value: data.staticTexts.announcement,
                },
              ]
            : []),
        ],
      },
      barcode: {
        format: 'PKBarcodeFormatQR',
        message: data.memberId,
        messageEncoding: 'iso-8859-1',
      },
    };
  }

  private createSignature(manifestBuffer: Buffer): Buffer | null {
    if (!this.certificate || !this.privateKey) {
      console.warn('Cannot create signature: certificates not loaded');
      return null;
    }

    try {
      const p7 = forge.pkcs7.createSignedData();
      p7.content = forge.util.createBuffer(manifestBuffer.toString('binary'));
      p7.addCertificate(this.certificate);

      if (this.wwdrCert) {
        p7.addCertificate(this.wwdrCert);
      }

      p7.addSigner({
        key: this.privateKey,
        certificate: this.certificate,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data,
          },
          {
            type: forge.pki.oids.messageDigest,
          },
          {
            type: forge.pki.oids.signingTime,
            value: new Date(),
          },
        ],
      });

      p7.sign({ detached: true });

      const asn1 = p7.toAsn1();
      const derBytes = forge.asn1.toDer(asn1).getBytes();
      return Buffer.from(derBytes, 'binary');
    } catch (error) {
      console.error('Error creating signature:', error);
      return null;
    }
  }

  private async createPkPassZip(files: Map<string, Buffer>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const passThrough = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 9 } });

      passThrough.on('data', (chunk) => chunks.push(chunk));
      passThrough.on('end', () => resolve(Buffer.concat(chunks)));
      passThrough.on('error', reject);

      archive.pipe(passThrough);

      for (const [filename, content] of files) {
        archive.append(content, { name: filename });
      }

      archive.finalize();
    });
  }
}

export const applePassService = new ApplePassService();
