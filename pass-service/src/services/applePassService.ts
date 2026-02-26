import archiver from 'archiver';
import crypto from 'crypto';
import forge from 'node-forge';
import { PassThrough } from 'stream';
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { appleConfig, publicUrl } from '../config.js';

// Convert hex color (#fff or #ffffff) to Apple-required rgb() format
function toRgb(color: string): string {
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// Apple WWDR G4 certificate (public cert from Apple, not a secret)
const WWDR_G4_PEM = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT
HUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS
b290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE
Aww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf
eKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo
v9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t
QSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB
5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl
PNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D
YyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G
A1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv
b3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290
LmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD
AgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD
eeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv
p50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef
x4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ
EtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ
A1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp
pU8RBWk6z/Kf
-----END CERTIFICATE-----`;

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
  barcodes: Array<{
    format: string;
    message: string;
    messageEncoding: string;
  }>;
}

export class ApplePassService {
  private certificate: forge.pki.Certificate | null = null;
  private privateKey: forge.pki.PrivateKey | null = null;
  private wwdrCert: forge.pki.Certificate | null = null;

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

      if (certBag && certBag.length > 0) {
        // The first cert is usually the signing cert, additional ones may be WWDR
        for (const bag of certBag) {
          if (!bag.cert) continue;
          const cn = bag.cert.subject.getField('CN')?.value || '';
          if (cn.includes('Apple Worldwide Developer Relations') || cn.includes('WWDR')) {
            this.wwdrCert = bag.cert;
          } else {
            this.certificate = bag.cert;
          }
        }
        // If only one cert found, use it as signing cert
        if (!this.certificate && certBag[0].cert) {
          this.certificate = certBag[0].cert;
        }
      }

      if (keyBag && keyBag.length > 0 && keyBag[0].key) {
        this.privateKey = keyBag[0].key;
      }

      // Load WWDR cert from env if not found in P12
      if (!this.wwdrCert) {
        this.loadWwdrCert();
      }

      console.log('Apple certificates loaded successfully');
    } catch (error) {
      console.error('Error loading Apple certificates:', error);
    }
  }

  private loadWwdrCert(): void {
    if (process.env.APPLE_WWDR_CERTIFICATE_BASE64) {
      try {
        const wwdrPem = Buffer.from(process.env.APPLE_WWDR_CERTIFICATE_BASE64, 'base64').toString('utf-8');
        this.wwdrCert = forge.pki.certificateFromPem(wwdrPem);
        console.log('WWDR certificate loaded from env');
        return;
      } catch (e) {
        console.warn('Failed to load WWDR cert from env:', e);
      }
    }

    try {
      this.wwdrCert = forge.pki.certificateFromPem(WWDR_G4_PEM);
      console.log('WWDR G4 certificate loaded (built-in)');
    } catch (e) {
      console.warn('Failed to load built-in WWDR cert:', e);
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
      console.log(`[pass] Signature created (${signature.length} bytes)`);
      files.set('signature', signature);
    } else {
      console.error('[pass] SIGNATURE FAILED — pass will be rejected by Apple');
    }

    return this.createPkPassZip(files);
  }

  createPassJson(data: PassData): PassJson {
    return {
      formatVersion: 1,
      passTypeIdentifier: appleConfig.passTypeId,
      serialNumber: data.serialNumber,
      teamIdentifier: appleConfig.teamId,
      webServiceURL: `${publicUrl}/v1`,
      authenticationToken: data.authenticationToken,
      organizationName: 'LoyaLink',
      description: 'Loyalty Card',
      backgroundColor: toRgb(data.backgroundColor),
      foregroundColor: toRgb(data.foregroundColor),
      labelColor: toRgb(data.labelColor),
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
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: data.memberId,
          messageEncoding: 'iso-8859-1',
        },
      ],
    };
  }

  private createSignature(manifestBuffer: Buffer): Buffer | null {
    if (!this.certificate || !this.privateKey) {
      console.warn('Cannot create signature: certificates not loaded');
      return null;
    }

    const id = randomBytes(8).toString('hex');
    const tmp = tmpdir();
    const manifestPath = join(tmp, `manifest-${id}.json`);
    const certPath = join(tmp, `cert-${id}.pem`);
    const keyPath = join(tmp, `key-${id}.pem`);
    const wwdrPath = join(tmp, `wwdr-${id}.pem`);
    const sigPath = join(tmp, `signature-${id}.der`);

    try {
      writeFileSync(manifestPath, manifestBuffer);
      writeFileSync(certPath, forge.pki.certificateToPem(this.certificate));
      writeFileSync(keyPath, forge.pki.privateKeyToPem(this.privateKey));

      const wwdrPem = this.wwdrCert
        ? forge.pki.certificateToPem(this.wwdrCert)
        : WWDR_G4_PEM;
      writeFileSync(wwdrPath, wwdrPem);

      // Log cert details for diagnosis
      try {
        const certInfo = execFileSync('openssl', [
          'x509', '-in', certPath, '-noout', '-subject', '-issuer', '-dates',
        ], { encoding: 'utf8' });
        console.log('[cert]', certInfo.replace(/\n/g, ' | ').trim());
      } catch (e) {
        console.warn('[cert] Could not read cert info:', e);
      }

      execFileSync('openssl', [
        'smime', '-binary', '-sign',
        '-certfile', wwdrPath,
        '-signer', certPath,
        '-inkey', keyPath,
        '-in', manifestPath,
        '-out', sigPath,
        '-outform', 'DER',
        // Apple requires a DETACHED signature (manifest not embedded in DER)
      ]);

      return readFileSync(sigPath);
    } catch (error) {
      console.error('[pass] OpenSSL signing failed:', error);
      return null;
    } finally {
      for (const p of [manifestPath, certPath, keyPath, wwdrPath, sigPath]) {
        try { unlinkSync(p); } catch { /* ignore */ }
      }
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
