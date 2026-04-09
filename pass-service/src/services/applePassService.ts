import { PKPass } from 'passkit-generator';
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { randomBytes } from 'crypto';
import { appleConfig, publicUrl, appUrl } from '../config.js';

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

interface PassTranslation {
  changeMessage: string;
  cashbackChangeMessage: string;
  tierChangeMessage: string;
  tierEarningsSuffix: string; // e.g. "og optjener nu" — inserted between tier name and cashback %
  balanceLabel: string;
  memberLabel: string;
  cashbackLabel: string;
  tierLabel: string;
  referralLabel: string;
  howItWorksLabel: string;
  howItWorksContent: string;
  announcementLabel: string;
  messageLabel: string;
  description: string;
}

const PASS_TRANSLATIONS: Record<string, PassTranslation> = {
  en: {
    changeMessage: 'Congrats! Your new balance is %@',
    cashbackChangeMessage: 'Your cashback rate is now %@',
    tierChangeMessage: 'Congrats! You\'ve been upgraded to %@!',
    tierEarningsSuffix: 'and now earning',
    balanceLabel: 'BALANCE',
    memberLabel: 'MEMBER',
    cashbackLabel: 'LOYALTY CASHBACK',
    tierLabel: 'TIER',
    referralLabel: 'Refer Friends',
    howItWorksLabel: 'How It Works',
    howItWorksContent: '1. Scan. Earn. Repeat.\nEvery time you visit the studio, scan your loyalty card before you pay. Each transaction adds cashback directly to your wallet — real money you can use toward your next visit.\n\n2. Level Up Your Cashback.\nThe more you visit, the higher your reward tier climbs. Each level boosts your cashback percentage, turning loyalty into actual value — not empty points.\n\n3. Bring Your Friends. Get Paid for It.\nWhen you refer a friend, they get their own loyalty card — and you get a cashback boost when they complete their first session. The more friends you bring, the faster you level up.\n\n4. Stay Connected. Stay Rewarded.\nCheck your balance anytime in your Wallet. Cashback never expires — as long as you scan your card every visit.',
    announcementLabel: 'Announcement',
    messageLabel: 'Message',
    description: 'Loyalty Card',
  },
  da: {
    changeMessage: 'Tillykke! Din nye saldo er %@',
    cashbackChangeMessage: 'Din cashback er nu %@',
    tierChangeMessage: 'Tillykke! Du er opgraderet til %@!',
    tierEarningsSuffix: 'og optjener nu',
    balanceLabel: 'SALDO',
    memberLabel: 'MEDLEM',
    cashbackLabel: 'LOYALITETS CASHBACK',
    tierLabel: 'NIVEAU',
    referralLabel: 'Inviter venner',
    howItWorksLabel: 'Sådan fungerer det',
    howItWorksContent: '1. Scan. Optjen. Gentag.\nHver gang du besøger studiet, scan dit loyalitetskort inden du betaler. Hver transaktion tilføjer cashback direkte til din pung — rigtige penge du kan bruge til dit næste besøg.\n\n2. Løft dit cashback-niveau.\nJo mere du besøger, jo højere stiger dit belønningsniveau. Hvert niveau øger din cashback-procent og gør loyalitet til reel værdi — ikke tomme point.\n\n3. Tag dine venner med. Bliv belønnet.\nNår du anbefaler en ven, får de deres eget loyalitetskort — og du får et cashback-boost, når de fuldfører deres første session. Jo flere venner du tager med, jo hurtigere rykker du op.\n\n4. Forbliv forbundet. Forbliv belønnet.\nTjek din saldo til enhver tid i din pung. Cashback udløber aldrig — så længe du scanner dit kort ved hvert besøg.',
    announcementLabel: 'Nyhed',
    messageLabel: 'Besked',
    description: 'Loyalitetskort',
  },
  sv: {
    changeMessage: 'Grattis! Ditt nya saldo är %@',
    cashbackChangeMessage: 'Din cashback är nu %@',
    tierChangeMessage: 'Grattis! Du har uppgraderats till %@!',
    tierEarningsSuffix: 'och tjänar nu',
    balanceLabel: 'SALDO',
    memberLabel: 'MEDLEM',
    cashbackLabel: 'LOJALITET CASHBACK',
    tierLabel: 'NIVÅ',
    referralLabel: 'Bjud in vänner',
    howItWorksLabel: 'Så här fungerar det',
    howItWorksContent: '1. Skanna. Tjäna. Upprepa.\nVarje gång du besöker studion, skanna ditt lojalitetskort innan du betalar. Varje transaktion lägger till cashback direkt i din plånbok — riktiga pengar du kan använda till ditt nästa besök.\n\n2. Höj din cashback-nivå.\nJu mer du besöker, desto högre klättrar din belöningsnivå. Varje nivå ökar din cashback-procent och omvandlar lojalitet till verkligt värde — inte tomma poäng.\n\n3. Ta med dina vänner. Bli belönad.\nNär du hänvisar en vän får de sitt eget lojalitetskort — och du får en cashback-bonus när de slutför sin första session. Ju fler vänner du tar med, desto snabbare avancerar du.\n\n4. Håll kontakten. Fortsätt att bli belönad.\nKontrollera ditt saldo när som helst i din plånbok. Cashback upphör aldrig — så länge du skannar ditt kort vid varje besök.',
    announcementLabel: 'Nyheter',
    messageLabel: 'Meddelande',
    description: 'Lojalitetskort',
  },
  no: {
    changeMessage: 'Gratulerer! Din nye saldo er %@',
    cashbackChangeMessage: 'Din cashback er nå %@',
    tierChangeMessage: 'Gratulerer! Du er oppgradert til %@!',
    tierEarningsSuffix: 'og tjener nå',
    balanceLabel: 'SALDO',
    memberLabel: 'MEDLEM',
    cashbackLabel: 'LOJALITET CASHBACK',
    tierLabel: 'NIVÅ',
    referralLabel: 'Inviter venner',
    howItWorksLabel: 'Slik fungerer det',
    howItWorksContent: '1. Skann. Tjen. Gjenta.\nHver gang du besøker studiet, skann lojalitetskortet ditt før du betaler. Hver transaksjon legger til cashback direkte i lommeboken din — ekte penger du kan bruke på ditt neste besøk.\n\n2. Løft cashback-nivået ditt.\nJo mer du besøker, jo høyere klatrer belønningsnivået ditt. Hvert nivå øker cashback-prosenten din og gjør lojalitet til ekte verdi — ikke tomme poeng.\n\n3. Ta med deg vennene dine. Bli belønnet.\nNår du anbefaler en venn, får de sitt eget lojalitetskort — og du får et cashback-løft når de fullfører sin første session. Jo flere venner du tar med, jo raskere rykker du opp.\n\n4. Hold kontakten. Hold deg belønnet.\nSjekk saldoen din når som helst i lommeboken din. Cashback utløper aldri — så lenge du skanner kortet ditt ved hvert besøk.',
    announcementLabel: 'Nyhet',
    messageLabel: 'Melding',
    description: 'Lojalitetskort',
  },
  de: {
    changeMessage: 'Glückwunsch! Dein neues Guthaben ist %@',
    cashbackChangeMessage: 'Deine Cashback-Rate ist jetzt %@',
    tierChangeMessage: 'Glückwunsch! Du wurdest zu %@ befördert!',
    tierEarningsSuffix: 'und verdienst jetzt',
    balanceLabel: 'GUTHABEN',
    memberLabel: 'MITGLIED',
    cashbackLabel: 'TREUE-CASHBACK',
    tierLabel: 'STUFE',
    referralLabel: 'Freunde werben',
    howItWorksLabel: 'So funktioniert es',
    howItWorksContent: '1. Scannen. Verdienen. Wiederholen.\nJedes Mal, wenn du das Studio besuchst, scanne deine Treuekarte, bevor du zahlst. Jede Transaktion fügt Cashback direkt zu deiner Geldbörse hinzu — echtes Geld für deinen nächsten Besuch.\n\n2. Steigere deinen Cashback.\nJe mehr du besuchst, desto höher steigt deine Belohnungsstufe. Jede Stufe erhöht deinen Cashback-Prozentsatz und verwandelt Treue in echten Wert — keine leeren Punkte.\n\n3. Bring deine Freunde mit. Werde belohnt.\nWenn du einen Freund empfiehlst, erhält er eine eigene Treuekarte — und du bekommst einen Cashback-Boost, wenn er seine erste Session abschließt. Je mehr Freunde du mitbringst, desto schneller steigst du auf.\n\n4. Bleib verbunden. Bleib belohnt.\nÜberprüfe dein Guthaben jederzeit in deiner Geldbörse. Cashback läuft nie ab — solange du bei jedem Besuch deine Karte scannst.',
    announcementLabel: 'Ankündigung',
    messageLabel: 'Nachricht',
    description: 'Treuekarte',
  },
  fr: {
    changeMessage: 'Félicitations ! Votre nouveau solde est %@',
    cashbackChangeMessage: 'Votre taux de cashback est maintenant %@',
    tierChangeMessage: 'Félicitations ! Vous êtes passé au niveau %@ !',
    tierEarningsSuffix: 'et gagnez maintenant',
    balanceLabel: 'SOLDE',
    memberLabel: 'MEMBRE',
    cashbackLabel: 'CASHBACK FIDÉLITÉ',
    tierLabel: 'NIVEAU',
    referralLabel: 'Parrainer des amis',
    howItWorksLabel: 'Comment ça marche',
    howItWorksContent: '1. Scanner. Gagner. Répéter.\nChaque fois que vous visitez le studio, scannez votre carte de fidélité avant de payer. Chaque transaction ajoute du cashback directement à votre portefeuille — de l\'argent réel pour votre prochaine visite.\n\n2. Montez en niveau.\nPlus vous visitez, plus votre niveau de récompense augmente. Chaque niveau augmente votre pourcentage de cashback — pas des points vides.\n\n3. Amenez vos amis. Soyez récompensé.\nQuand vous recommandez un ami, il reçoit sa propre carte de fidélité — et vous recevez un bonus cashback quand il complète sa première session. Plus vous amenez d\'amis, plus vite vous montez.\n\n4. Restez connecté. Restez récompensé.\nVérifiez votre solde à tout moment dans votre portefeuille. Le cashback n\'expire jamais — tant que vous scannez votre carte à chaque visite.',
    announcementLabel: 'Annonce',
    messageLabel: 'Message',
    description: 'Carte de fidélité',
  },
  es: {
    changeMessage: '¡Felicidades! Tu nuevo saldo es %@',
    cashbackChangeMessage: 'Tu tasa de cashback ahora es %@',
    tierChangeMessage: '¡Felicidades! Has sido ascendido a %@',
    tierEarningsSuffix: 'y ahora ganas',
    balanceLabel: 'SALDO',
    memberLabel: 'MIEMBRO',
    cashbackLabel: 'CASHBACK DE LEALTAD',
    tierLabel: 'NIVEL',
    referralLabel: 'Referir amigos',
    howItWorksLabel: 'Cómo funciona',
    howItWorksContent: '1. Escanea. Gana. Repite.\nCada vez que visites el estudio, escanea tu tarjeta de fidelidad antes de pagar. Cada transacción añade cashback directamente a tu cartera — dinero real para tu próxima visita.\n\n2. Sube tu nivel.\nCuanto más visites, más alto sube tu nivel de recompensa. Cada nivel aumenta tu porcentaje de cashback — no puntos vacíos.\n\n3. Trae a tus amigos. Sé recompensado.\nCuando refieres a un amigo, recibe su propia tarjeta de fidelidad — y tú recibes un impulso de cashback cuando complete su primera sesión. Cuantos más amigos traigas, más rápido subes.\n\n4. Mantente conectado. Mantente recompensado.\nConsulta tu saldo en cualquier momento en tu cartera. El cashback nunca caduca — siempre que escanees tu tarjeta en cada visita.',
    announcementLabel: 'Anuncio',
    messageLabel: 'Mensaje',
    description: 'Tarjeta de fidelidad',
  },
  nl: {
    changeMessage: 'Gefeliciteerd! Je nieuwe saldo is %@',
    cashbackChangeMessage: 'Je cashback is nu %@',
    tierChangeMessage: 'Gefeliciteerd! Je bent gepromoveerd naar %@!',
    tierEarningsSuffix: 'en verdient nu',
    balanceLabel: 'SALDO',
    memberLabel: 'LID',
    cashbackLabel: 'LOYALITEIT CASHBACK',
    tierLabel: 'NIVEAU',
    referralLabel: 'Vrienden uitnodigen',
    howItWorksLabel: 'Hoe het werkt',
    howItWorksContent: '1. Scannen. Verdienen. Herhalen.\nElke keer dat je de studio bezoekt, scan je loyaliteitskaart voordat je betaalt. Elke transactie voegt cashback direct toe aan je portemonnee — echt geld voor je volgende bezoek.\n\n2. Verhoog je niveau.\nHoe meer je bezoekt, hoe hoger je beloningsniveau stijgt. Elk niveau verhoogt je cashback-percentage — geen lege punten.\n\n3. Breng je vrienden mee. Word beloond.\nWanneer je een vriend doorverwijst, krijgen zij hun eigen loyaliteitskaart — en jij krijgt een cashback-boost wanneer zij hun eerste sessie voltooien. Hoe meer vrienden, hoe sneller je opklimt.\n\n4. Blijf verbonden. Blijf beloond.\nControleer je saldo op elk moment in je portemonnee. Cashback verloopt nooit — zolang je je kaart bij elk bezoek scant.',
    announcementLabel: 'Aankondiging',
    messageLabel: 'Bericht',
    description: 'Loyaliteitskaart',
  },
  pl: {
    changeMessage: 'Gratulacje! Twoje nowe saldo to %@',
    cashbackChangeMessage: 'Twój cashback wynosi teraz %@',
    tierChangeMessage: 'Gratulacje! Awansowałeś do poziomu %@!',
    tierEarningsSuffix: 'i teraz zarabiasz',
    balanceLabel: 'SALDO',
    memberLabel: 'CZŁONEK',
    cashbackLabel: 'CASHBACK LOJALNOŚCIOWY',
    tierLabel: 'POZIOM',
    referralLabel: 'Polecaj znajomych',
    howItWorksLabel: 'Jak to działa',
    howItWorksContent: '1. Skanuj. Zarabiaj. Powtarzaj.\nZa każdym razem, gdy odwiedzasz studio, zeskanuj kartę lojalnościową przed zapłatą. Każda transakcja dodaje cashback bezpośrednio do Twojego portfela — prawdziwe pieniądze na następną wizytę.\n\n2. Podnieś poziom.\nIm więcej odwiedzasz, tym wyżej wspina się Twój poziom nagród. Każdy poziom zwiększa Twój procent cashbacku — nie puste punkty.\n\n3. Przyprowadź znajomych. Bądź nagradzany.\nGdy polecisz znajomego, otrzyma własną kartę lojalnościową — a Ty dostaniesz bonus cashback, gdy ukończy swoją pierwszą sesję. Im więcej znajomych, tym szybciej awansujesz.\n\n4. Pozostań w kontakcie. Pozostań nagradzany.\nSprawdzaj saldo w dowolnym momencie w swoim portfelu. Cashback nigdy nie wygasa — dopóki skanujesz kartę przy każdej wizycie.',
    announcementLabel: 'Ogłoszenie',
    messageLabel: 'Wiadomość',
    description: 'Karta lojalnościowa',
  },
};

interface PassData {
  serialNumber: string;
  authenticationToken: string;
  customerName: string;
  balance: number;
  cashbackRate: number;
  loyaltyTier: string;
  memberId: string;
  studioName: string;
  currency: string;
  language?: string;
  pushMessage?: string;
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
  barcode: { format: string; message: string; messageEncoding: string };
  barcodes: Array<{ format: string; message: string; messageEncoding: string }>;
}

export class ApplePassService {
  private certPem: string | null = null;
  private keyPem: string | null = null;
  private isLoaded: boolean = false;

  constructor() {
    this.loadCertificates();
  }

  private loadCertificates(): void {
    try {
      if (!appleConfig.certificateBase64) {
        console.warn('Apple certificate not configured');
        return;
      }

      const p12Buffer = Buffer.from(appleConfig.certificateBase64, 'base64');
      const extracted = this.extractFromP12(p12Buffer, appleConfig.certificatePassword);
      if (!extracted) return;

      this.certPem = extracted.certPem;
      this.keyPem = extracted.keyPem;
      this.isLoaded = true;
      console.log('Apple certificates loaded successfully');
    } catch (error) {
      console.error('Error loading Apple certificates:', error);
    }
  }

  // Extract cert and key PEMs from P12 using OpenSSL — preserves ALL Apple-specific
  // certificate extensions (e.g. 1.2.840.113635.100.6.1.16 passTypeIdentifier).
  private extractFromP12(p12Buffer: Buffer, password: string): { certPem: string; keyPem: string } | null {
    const id = randomBytes(8).toString('hex');
    const tmp = tmpdir();
    const p12Path = join(tmp, `p12-${id}.p12`);
    const certPath = join(tmp, `cert-${id}.pem`);
    const keyPath = join(tmp, `key-${id}.pem`);

    try {
      writeFileSync(p12Path, p12Buffer);

      try {
        const ver = execFileSync('openssl', ['version'], { encoding: 'utf8' });
        console.log('[openssl]', ver.trim());
      } catch { /* ignore */ }

      const passArg = password ? `pass:${password}` : 'pass:';

      let extracted = false;
      for (const legacyFlag of [[], ['-legacy']]) {
        try {
          execFileSync('openssl', [
            'pkcs12', '-in', p12Path, '-nokeys', '-clcerts',
            '-passin', passArg, '-out', certPath, ...legacyFlag,
          ]);
          execFileSync('openssl', [
            'pkcs12', '-in', p12Path, '-nocerts', '-nodes',
            '-passin', passArg, '-out', keyPath, ...legacyFlag,
          ]);
          extracted = true;
          if (legacyFlag.length) console.log('[pass] P12 extracted with -legacy flag');
          break;
        } catch { /* try next option */ }
      }

      if (!extracted) {
        console.error('[pass] Failed to extract cert/key from P12');
        return null;
      }

      // Log cert details — verify Apple extension is present
      try {
        const certInfo = execFileSync('openssl', [
          'x509', '-in', certPath, '-noout', '-subject', '-issuer', '-dates',
        ], { encoding: 'utf8' });
        console.log('[cert]', certInfo.replace(/\n/g, ' | ').trim());

        const hasAppleExt = execFileSync('openssl', [
          'x509', '-in', certPath, '-noout', '-text',
        ], { encoding: 'utf8' }).includes('1.2.840.113635.100.6.1.16');
        console.log(`[cert] Apple passType extension present: ${hasAppleExt}`);
      } catch { /* ignore */ }

      return {
        certPem: readFileSync(certPath, 'utf8'),
        keyPem: readFileSync(keyPath, 'utf8'),
      };
    } catch (error) {
      console.error('[pass] P12 extraction failed:', error);
      return null;
    } finally {
      for (const p of [p12Path, certPath, keyPath]) {
        try { unlinkSync(p); } catch { /* ignore */ }
      }
    }
  }

  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[pass] Image download failed: ${res.status} ${res.statusText} — ${url}`);
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`[pass] Image downloaded: ${buf.length} bytes — ${url}`);
      return buf;
    } catch (err) {
      console.warn(`[pass] Image download error: ${err} — ${url}`);
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
    if (!this.isLoaded || !this.certPem || !this.keyPem) {
      throw new Error('Apple certificates not loaded');
    }

    const passJson = this.createPassJson(data);
    const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2));

    const files: Record<string, Buffer> = {
      'pass.json': passJsonBuffer,
    };

    console.log(`[pass] Images — icon: ${data.iconUrl || 'none'} | logo: ${data.logoUrl || 'none'} | strip: ${data.heroImageUrl || 'none'}`);

    // icon.png is REQUIRED by Apple — fall back to logoUrl if iconUrl is not set
    const iconBuffer = data.iconUrl ? await this.downloadImage(data.iconUrl) :
                       data.logoUrl ? await this.downloadImage(data.logoUrl) : null;
    files['icon.png'] = iconBuffer || this.createFallbackIcon();

    if (data.logoUrl) {
      const logoBuffer = await this.downloadImage(data.logoUrl);
      if (logoBuffer) files['logo.png'] = logoBuffer;
    }

    const stripUrl = data.heroImageUrl || null;
    if (stripUrl) {
      const stripBuffer = await this.downloadImage(stripUrl);
      files['strip.png'] = stripBuffer || readFileSync(join(__dirname, '../assets/default-strip.png'));
    } else {
      files['strip.png'] = readFileSync(join(__dirname, '../assets/default-strip.png'));
    }

    // passkit-generator handles manifest hashing, CMS signing, and ZIP creation
    const pass = new PKPass(files, {
      wwdr: WWDR_G4_PEM,
      signerCert: this.certPem,
      signerKey: this.keyPem,
    });

    return pass.getAsBuffer();
  }

  createPassJson(data: PassData): PassJson {
    const t = PASS_TRANSLATIONS[data.language ?? 'en'] ?? PASS_TRANSLATIONS['en'];
    return {
      formatVersion: 1,
      passTypeIdentifier: appleConfig.passTypeId,
      serialNumber: data.serialNumber,
      teamIdentifier: appleConfig.teamId,
      webServiceURL: `${publicUrl}/wallet`,
      authenticationToken: data.authenticationToken,
      organizationName: data.studioName,
      description: t.description,
      backgroundColor: toRgb(data.backgroundColor),
      foregroundColor: toRgb(data.foregroundColor),
      labelColor: toRgb(data.labelColor),
      storeCard: {
        headerFields: [
          {
            key: 'balance',
            label: t.balanceLabel,
            value: `${data.balance} ${data.currency}`,
            changeMessage: t.changeMessage,
          },
        ],
        primaryFields: [],
        secondaryFields: [
          {
            key: 'member',
            label: t.memberLabel,
            value: data.customerName,
          },
          {
            key: 'cashback',
            label: t.cashbackLabel,
            value: `${data.cashbackRate}%`,
            changeMessage: t.cashbackChangeMessage,
          },
        ],
        backFields: [
          {
            key: 'referral',
            label: t.referralLabel,
            // Loyalty page URL — Apple Wallet auto-detects URLs and makes them tappable
            value: `${appUrl}/loyalty/${data.memberId}`,
          },
          {
            key: 'howItWorks',
            label: t.howItWorksLabel,
            value: t.howItWorksContent,
          },
          {
            key: 'tier',
            label: t.tierLabel,
            value: `${data.loyaltyTier} ${t.tierEarningsSuffix} ${data.cashbackRate}% cashback`,
          },
          ...(data.staticTexts.announcement
            ? [
                {
                  key: 'announcement',
                  label: t.announcementLabel,
                  value: data.staticTexts.announcement,
                },
              ]
            : []),
          ...(data.pushMessage
            ? [
                {
                  key: 'push_message',
                  label: t.messageLabel,
                  value: data.pushMessage,
                  changeMessage: '%@',
                },
              ]
            : []),
        ],
      },
      // Legacy field for iOS < 9 compatibility
      barcode: {
        format: 'PKBarcodeFormatQR',
        message: data.memberId,
        messageEncoding: 'iso-8859-1',
      },
      // Modern field (iOS 9+)
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: data.memberId,
          messageEncoding: 'iso-8859-1',
        },
      ],
    };
  }
}

export const applePassService = new ApplePassService();
