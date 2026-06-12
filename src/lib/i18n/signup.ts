/**
 * Translations for the customer-facing signup surface (landing page, referral
 * page, join form, post-signup success). Mirrors the studio language picked
 * during onboarding. Studio operators still see English in the dashboard —
 * only what the customer sees gets localised.
 *
 * Conventions per language:
 *   da/sv/nb — informal "du", short and direct (loyalty marketing standard).
 *   de       — informal "du" (German loyalty programs almost always use du).
 *   fr       — formal "vous" (commerce default, expected by adults).
 *   es       — informal "tú" (Spanish brand voice for loyalty/retail).
 *   nl       — informal "je".
 *   pl       — informal "ty"/2nd person verb forms; brand-friendly.
 */

export type SignupTranslations = {
  // TrustBar pills
  freeForever: string
  thirtySeconds: string
  membersCount: (n: number) => string
  noAppNeeded: string

  // ValueStack
  whatYouGet: string
  benefitBaseCashback: (rate: number) => string
  benefitMaxCashback: (rate: number) => string
  benefitReferralCommission: (rate: number) => string
  benefitReferralFixedCommission: (amount: string) => string
  benefitReferralCashbackBoost: (rate: number) => string
  benefitReferralInvite: string
  benefitWelcomeBonus: (amount: string) => string
  benefitWalletCard: string
  benefitInstantSignup: string

  // ReferralBanner
  invitedYou: (name: string) => string
  welcomeBonusLabel: string // appears after the bolded amount
  cashbackFromDayOneLabel: (rate: number) => string // "X% cashback from day one"

  // TierProgression
  yourCashbackJourney: string
  startHere: string
  triggerFirstPurchase: string
  triggerFirstFullPayment: string
  triggerTotalSpend: (amount: string) => string
  triggerReferralCount: (n: number) => string
  triggerDaysMember: (n: number) => string
  tierCashbackSuffix: (rate: number) => string // "— X% cashback"

  // JoinForm
  fullNameLabel: string
  fullNamePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  phoneLabel: string
  phonePlaceholder: string
  selectPlaceholder: (label: string) => string // "Select gender"
  joinButton: string
  signingUp: string
  somethingWentWrong: string
  agreeToTerms: string // "By signing up you agree to our"
  termsAndPrivacy: string // "Terms & Privacy Policy"
  sendMeLink: string // resend pass link
  sentLinkCheckEmail: string
  youreIn: string // success heading
  welcomeYourCardReady: (name: string) => string // "Welcome, {name}. Your loyalty card is ready."
  scanWithPhone: string
  pointCameraAtQR: string
  cantSeeYourPass: string
  addToAppleWallet: string
  addToGoogleWallet: string
  cardWillBeSent: string

  // SuccessHub
  welcomeName: (name: string) => string
  studioLoyaltyProgram: (studio: string) => string
  bonusCredited: (amount: string) => string
  cashbackUnlocked: (rate: number) => string
  opening: string
  addToWallet: (platform: 'apple' | 'google') => string
  addToOtherWalletInstead: (platform: 'apple' | 'google') => string
  whatsNext: string
  stepAddCard: string
  stepAddCardDesc: string
  stepVisitStudio: (studio: string) => string
  stepVisitStudioDesc: string
  stepEarnCashback: (rate: number) => string
  stepEarnCashbackDesc: string
  referredBy: (name: string) => string

  // Refer page
  signUpAndGet: (rate: number, hasBonus: boolean, bonusAmount: string) => string
  joinAndGetBonus: string

  // Pass wallet bounce page
  passAddToWallet: string
  scanWithPhoneCamera: string
  forIPhoneAppleWatch: string
  forAndroid: string
  addInBrowser: string
  openCameraAndPoint: string

  // Default headline fallback used on /join when none provided
  fallbackHeadline: (rate: number) => string

  // Metadata
  fallbackJoinTitle: string
  welcomeMetaTitle: (studio: string) => string
}

const en: SignupTranslations = {
  freeForever: 'Free forever',
  thirtySeconds: '30 seconds',
  membersCount: (n) => `${n}+ members`,
  noAppNeeded: 'No app needed',

  whatYouGet: 'What You Get',
  benefitBaseCashback: (r) => `${r}% cashback on every purchase`,
  benefitMaxCashback: (r) => `Up to ${r}% cashback as you level up`,
  benefitReferralCommission: (r) => `Earn ${r}% on friends' purchases`,
  benefitReferralFixedCommission: (a) => `Earn ${a} for each friend's purchase`,
  benefitReferralCashbackBoost: (r) => `Earn +${r}% cashback for each friend you refer`,
  benefitReferralInvite: 'Invite friends with your personal referral link',
  benefitWelcomeBonus: (a) => `${a} welcome bonus when referred`,
  benefitWalletCard: 'Digital loyalty card in Apple & Google Wallet',
  benefitInstantSignup: 'Instant signup — no app download needed',

  invitedYou: (name) => `${name} invited you!`,
  welcomeBonusLabel: 'welcome bonus',
  cashbackFromDayOneLabel: (r) => `${r}% cashback from day one`,

  yourCashbackJourney: 'Your Cashback Journey',
  startHere: 'Start here',
  triggerFirstPurchase: 'After your first purchase',
  triggerFirstFullPayment: 'After your first full payment',
  triggerTotalSpend: (a) => `Spend ${a} total`,
  triggerReferralCount: (n) => (n === 1 ? 'Refer 1 friend' : `Refer ${n} friends`),
  triggerDaysMember: (n) => `After ${n} days as a member`,
  tierCashbackSuffix: (r) => `— ${r}% cashback`,

  fullNameLabel: 'Full name',
  fullNamePlaceholder: 'Your full name',
  emailLabel: 'Email',
  emailPlaceholder: 'you@email.com',
  phoneLabel: 'Phone',
  phonePlaceholder: '12 34 56 78',
  selectPlaceholder: (label) => `Select ${label.toLowerCase()}`,
  joinButton: 'Join & Get Your Pass',
  signingUp: 'Signing up...',
  somethingWentWrong: 'Something went wrong',
  agreeToTerms: 'By signing up you agree to our',
  termsAndPrivacy: 'Terms & Privacy Policy',
  sendMeLink: 'Send me a link to add my card',
  sentLinkCheckEmail: 'Check your email for a link to add your card.',
  youreIn: "You're in!",
  welcomeYourCardReady: (name) => `Welcome, ${name}. Your loyalty card is ready.`,
  scanWithPhone: 'Scan with your phone to add the pass',
  pointCameraAtQR: 'Point your phone camera at the QR code above',
  cantSeeYourPass: "Can't see your pass? Tap below to add it again",
  addToAppleWallet: 'Add to Apple Wallet',
  addToGoogleWallet: 'Add to Google Wallet',
  cardWillBeSent: 'Your card will be sent to you shortly.',

  welcomeName: (n) => `Welcome, ${n}!`,
  studioLoyaltyProgram: (s) => `${s} Loyalty Program`,
  bonusCredited: (a) => `${a} bonus credited`,
  cashbackUnlocked: (r) => `${r}% cashback unlocked`,
  opening: 'Opening...',
  addToWallet: (p) => (p === 'apple' ? 'Add to Apple Wallet' : 'Add to Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Add to Apple Wallet instead' : 'Add to Google Wallet instead',
  whatsNext: "What's next",
  stepAddCard: 'Add your loyalty card to your wallet',
  stepAddCardDesc: 'Tap the button above to save it',
  stepVisitStudio: (s) => `Visit ${s} and show your card`,
  stepVisitStudioDesc: 'Show it at checkout to earn rewards',
  stepEarnCashback: (r) => `Earn ${r}% cashback on every purchase`,
  stepEarnCashbackDesc: 'Your balance grows automatically',
  referredBy: (n) => `Referred by ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Sign up and get ${r}% cashback + ${bonus} welcome bonus`
      : `Sign up and get ${r}% cashback`,
  joinAndGetBonus: 'Join & Get Your Bonus',

  passAddToWallet: 'Add to Wallet',
  scanWithPhoneCamera: 'Scan with your phone camera to add your loyalty card',
  forIPhoneAppleWatch: 'For iPhone & Apple Watch',
  forAndroid: 'For Android',
  addInBrowser: 'Add in browser',
  openCameraAndPoint: "Open your phone's camera app and point it at the QR code",

  fallbackHeadline: (r) => `Get ${r}% Back on Every Visit`,
  fallbackJoinTitle: 'Join',
  welcomeMetaTitle: (s) => `Welcome to ${s}!`,
}

const da: SignupTranslations = {
  freeForever: 'Gratis for altid',
  thirtySeconds: '30 sekunder',
  membersCount: (n) => `${n}+ medlemmer`,
  noAppNeeded: 'Ingen app nødvendig',

  whatYouGet: 'Det får du',
  benefitBaseCashback: (r) => `${r}% cashback på hvert køb`,
  benefitMaxCashback: (r) => `Op til ${r}% cashback når du rykker op`,
  benefitReferralCommission: (r) => `Tjen ${r}% af dine venners forbrug`,
  benefitReferralFixedCommission: (a) => `Tjen ${a} hver gang en ven køber`,
  benefitReferralCashbackBoost: (r) => `Få +${r}% cashback for hver ven du inviterer`,
  benefitReferralInvite: 'Inviter venner med dit personlige henvisningslink',
  benefitWelcomeBonus: (a) => `${a} velkomstbonus når du bliver inviteret`,
  benefitWalletCard: 'Digitalt loyalitetskort i Apple & Google Wallet',
  benefitInstantSignup: 'Tilmeld dig på sekunder — ingen app skal hentes',

  invitedYou: (name) => `${name} har inviteret dig!`,
  welcomeBonusLabel: 'velkomstbonus',
  cashbackFromDayOneLabel: (r) => `${r}% cashback fra dag ét`,

  yourCashbackJourney: 'Din cashback-rejse',
  startHere: 'Start her',
  triggerFirstPurchase: 'Efter dit første køb',
  triggerFirstFullPayment: 'Efter din første fulde betaling',
  triggerTotalSpend: (a) => `Brug ${a} i alt`,
  triggerReferralCount: (n) => (n === 1 ? 'Inviter 1 ven' : `Inviter ${n} venner`),
  triggerDaysMember: (n) => `Efter ${n} dage som medlem`,
  tierCashbackSuffix: (r) => `— ${r}% cashback`,

  fullNameLabel: 'Fulde navn',
  fullNamePlaceholder: 'Dit fulde navn',
  emailLabel: 'Email',
  emailPlaceholder: 'dig@email.dk',
  phoneLabel: 'Telefon',
  phonePlaceholder: '12 34 56 78',
  selectPlaceholder: (label) => `Vælg ${label.toLowerCase()}`,
  joinButton: 'Tilmeld & få dit kort',
  signingUp: 'Tilmelder...',
  somethingWentWrong: 'Noget gik galt',
  agreeToTerms: 'Ved at tilmelde dig accepterer du vores',
  termsAndPrivacy: 'Vilkår & privatlivspolitik',
  sendMeLink: 'Send mig et link til at tilføje mit kort',
  sentLinkCheckEmail: 'Tjek din email for et link til at tilføje dit kort.',
  youreIn: 'Du er med!',
  welcomeYourCardReady: (name) => `Velkommen, ${name}. Dit loyalitetskort er klar.`,
  scanWithPhone: 'Scan med din telefon for at tilføje kortet',
  pointCameraAtQR: 'Peg din telefonkameralinse mod QR-koden ovenfor',
  cantSeeYourPass: 'Kan du ikke se dit kort? Tryk nedenfor for at tilføje det igen',
  addToAppleWallet: 'Tilføj til Apple Wallet',
  addToGoogleWallet: 'Tilføj til Google Wallet',
  cardWillBeSent: 'Dit kort sendes til dig om lidt.',

  welcomeName: (n) => `Velkommen, ${n}!`,
  studioLoyaltyProgram: (s) => `${s} loyalitetsprogram`,
  bonusCredited: (a) => `${a} bonus tilføjet`,
  cashbackUnlocked: (r) => `${r}% cashback låst op`,
  opening: 'Åbner...',
  addToWallet: (p) => (p === 'apple' ? 'Tilføj til Apple Wallet' : 'Tilføj til Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Tilføj til Apple Wallet i stedet' : 'Tilføj til Google Wallet i stedet',
  whatsNext: 'Næste skridt',
  stepAddCard: 'Tilføj dit loyalitetskort til din wallet',
  stepAddCardDesc: 'Tryk på knappen ovenfor for at gemme det',
  stepVisitStudio: (s) => `Besøg ${s} og vis dit kort`,
  stepVisitStudioDesc: 'Vis det i kassen for at optjene belønninger',
  stepEarnCashback: (r) => `Optjen ${r}% cashback på hvert køb`,
  stepEarnCashbackDesc: 'Din saldo vokser automatisk',
  referredBy: (n) => `Inviteret af ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Tilmeld dig og få ${r}% cashback + ${bonus} velkomstbonus`
      : `Tilmeld dig og få ${r}% cashback`,
  joinAndGetBonus: 'Tilmeld & få din bonus',

  passAddToWallet: 'Tilføj til Wallet',
  scanWithPhoneCamera: 'Scan med din telefonkameralinse for at tilføje dit loyalitetskort',
  forIPhoneAppleWatch: 'Til iPhone & Apple Watch',
  forAndroid: 'Til Android',
  addInBrowser: 'Tilføj i browseren',
  openCameraAndPoint: 'Åbn telefonens kamera-app og peg den mod QR-koden',

  fallbackHeadline: (r) => `Få ${r}% tilbage på hvert besøg`,
  fallbackJoinTitle: 'Tilmeld',
  welcomeMetaTitle: (s) => `Velkommen til ${s}!`,
}

const sv: SignupTranslations = {
  freeForever: 'Gratis för alltid',
  thirtySeconds: '30 sekunder',
  membersCount: (n) => `${n}+ medlemmar`,
  noAppNeeded: 'Ingen app behövs',

  whatYouGet: 'Det här får du',
  benefitBaseCashback: (r) => `${r}% cashback på varje köp`,
  benefitMaxCashback: (r) => `Upp till ${r}% cashback när du klättrar i nivå`,
  benefitReferralCommission: (r) => `Tjäna ${r}% på dina vänners köp`,
  benefitReferralFixedCommission: (a) => `Tjäna ${a} varje gång en vän handlar`,
  benefitReferralCashbackBoost: (r) => `Få +${r}% cashback för varje vän du bjuder in`,
  benefitReferralInvite: 'Bjud in vänner med din personliga länk',
  benefitWelcomeBonus: (a) => `${a} välkomstbonus när du blir bjuden`,
  benefitWalletCard: 'Digitalt lojalitetskort i Apple & Google Wallet',
  benefitInstantSignup: 'Registrera dig på sekunder — ingen app behöver laddas ner',

  invitedYou: (name) => `${name} har bjudit in dig!`,
  welcomeBonusLabel: 'välkomstbonus',
  cashbackFromDayOneLabel: (r) => `${r}% cashback från dag ett`,

  yourCashbackJourney: 'Din cashback-resa',
  startHere: 'Börja här',
  triggerFirstPurchase: 'Efter ditt första köp',
  triggerFirstFullPayment: 'Efter din första fullständiga betalning',
  triggerTotalSpend: (a) => `Spendera totalt ${a}`,
  triggerReferralCount: (n) => (n === 1 ? 'Bjud in 1 vän' : `Bjud in ${n} vänner`),
  triggerDaysMember: (n) => `Efter ${n} dagar som medlem`,
  tierCashbackSuffix: (r) => `— ${r}% cashback`,

  fullNameLabel: 'Fullständigt namn',
  fullNamePlaceholder: 'Ditt fullständiga namn',
  emailLabel: 'E-post',
  emailPlaceholder: 'du@email.se',
  phoneLabel: 'Telefon',
  phonePlaceholder: '12 34 56 78',
  selectPlaceholder: (label) => `Välj ${label.toLowerCase()}`,
  joinButton: 'Registrera & få ditt kort',
  signingUp: 'Registrerar...',
  somethingWentWrong: 'Något gick fel',
  agreeToTerms: 'Genom att registrera dig godkänner du våra',
  termsAndPrivacy: 'Villkor & integritetspolicy',
  sendMeLink: 'Skicka mig en länk för att lägga till mitt kort',
  sentLinkCheckEmail: 'Kolla din e-post efter en länk för att lägga till ditt kort.',
  youreIn: 'Du är med!',
  welcomeYourCardReady: (name) => `Välkommen, ${name}. Ditt lojalitetskort är klart.`,
  scanWithPhone: 'Skanna med din telefon för att lägga till kortet',
  pointCameraAtQR: 'Rikta telefonens kamera mot QR-koden ovan',
  cantSeeYourPass: 'Ser du inte kortet? Tryck nedan för att lägga till det igen',
  addToAppleWallet: 'Lägg till i Apple Wallet',
  addToGoogleWallet: 'Lägg till i Google Wallet',
  cardWillBeSent: 'Ditt kort skickas till dig snart.',

  welcomeName: (n) => `Välkommen, ${n}!`,
  studioLoyaltyProgram: (s) => `${s} lojalitetsprogram`,
  bonusCredited: (a) => `${a} bonus tillagd`,
  cashbackUnlocked: (r) => `${r}% cashback upplåst`,
  opening: 'Öppnar...',
  addToWallet: (p) => (p === 'apple' ? 'Lägg till i Apple Wallet' : 'Lägg till i Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Lägg till i Apple Wallet istället' : 'Lägg till i Google Wallet istället',
  whatsNext: 'Nästa steg',
  stepAddCard: 'Lägg till ditt lojalitetskort i din wallet',
  stepAddCardDesc: 'Tryck på knappen ovan för att spara det',
  stepVisitStudio: (s) => `Besök ${s} och visa ditt kort`,
  stepVisitStudioDesc: 'Visa det i kassan för att tjäna belöningar',
  stepEarnCashback: (r) => `Tjäna ${r}% cashback på varje köp`,
  stepEarnCashbackDesc: 'Ditt saldo växer automatiskt',
  referredBy: (n) => `Inbjuden av ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Registrera dig och få ${r}% cashback + ${bonus} välkomstbonus`
      : `Registrera dig och få ${r}% cashback`,
  joinAndGetBonus: 'Registrera & få din bonus',

  passAddToWallet: 'Lägg till i Wallet',
  scanWithPhoneCamera: 'Skanna med din telefonkamera för att lägga till ditt lojalitetskort',
  forIPhoneAppleWatch: 'Till iPhone & Apple Watch',
  forAndroid: 'Till Android',
  addInBrowser: 'Lägg till i webbläsaren',
  openCameraAndPoint: 'Öppna telefonens kamera-app och rikta den mot QR-koden',

  fallbackHeadline: (r) => `Få ${r}% tillbaka på varje besök`,
  fallbackJoinTitle: 'Registrera',
  welcomeMetaTitle: (s) => `Välkommen till ${s}!`,
}

const nb: SignupTranslations = {
  freeForever: 'Gratis for alltid',
  thirtySeconds: '30 sekunder',
  membersCount: (n) => `${n}+ medlemmer`,
  noAppNeeded: 'Ingen app nødvendig',

  whatYouGet: 'Dette får du',
  benefitBaseCashback: (r) => `${r}% cashback på hvert kjøp`,
  benefitMaxCashback: (r) => `Opp til ${r}% cashback når du rykker opp`,
  benefitReferralCommission: (r) => `Tjen ${r}% av vennenes forbruk`,
  benefitReferralFixedCommission: (a) => `Tjen ${a} hver gang en venn handler`,
  benefitReferralCashbackBoost: (r) => `Få +${r}% cashback for hver venn du inviterer`,
  benefitReferralInvite: 'Inviter venner med din personlige lenke',
  benefitWelcomeBonus: (a) => `${a} velkomstbonus når du blir invitert`,
  benefitWalletCard: 'Digitalt lojalitetskort i Apple & Google Wallet',
  benefitInstantSignup: 'Registrer deg på sekunder — ingen app må lastes ned',

  invitedYou: (name) => `${name} har invitert deg!`,
  welcomeBonusLabel: 'velkomstbonus',
  cashbackFromDayOneLabel: (r) => `${r}% cashback fra dag én`,

  yourCashbackJourney: 'Din cashback-reise',
  startHere: 'Start her',
  triggerFirstPurchase: 'Etter ditt første kjøp',
  triggerFirstFullPayment: 'Etter din første fulle betaling',
  triggerTotalSpend: (a) => `Bruk ${a} totalt`,
  triggerReferralCount: (n) => (n === 1 ? 'Inviter 1 venn' : `Inviter ${n} venner`),
  triggerDaysMember: (n) => `Etter ${n} dager som medlem`,
  tierCashbackSuffix: (r) => `— ${r}% cashback`,

  fullNameLabel: 'Fullt navn',
  fullNamePlaceholder: 'Ditt fulle navn',
  emailLabel: 'E-post',
  emailPlaceholder: 'du@email.no',
  phoneLabel: 'Telefon',
  phonePlaceholder: '12 34 56 78',
  selectPlaceholder: (label) => `Velg ${label.toLowerCase()}`,
  joinButton: 'Registrer & få kortet ditt',
  signingUp: 'Registrerer...',
  somethingWentWrong: 'Noe gikk galt',
  agreeToTerms: 'Ved å registrere deg godtar du våre',
  termsAndPrivacy: 'Vilkår & personvernerklæring',
  sendMeLink: 'Send meg en lenke for å legge til kortet mitt',
  sentLinkCheckEmail: 'Sjekk e-posten din etter en lenke for å legge til kortet ditt.',
  youreIn: 'Du er med!',
  welcomeYourCardReady: (name) => `Velkommen, ${name}. Lojalitetskortet ditt er klart.`,
  scanWithPhone: 'Skann med telefonen for å legge til kortet',
  pointCameraAtQR: 'Rett telefonkameraet mot QR-koden over',
  cantSeeYourPass: 'Ser du ikke kortet? Trykk under for å legge det til igjen',
  addToAppleWallet: 'Legg til i Apple Wallet',
  addToGoogleWallet: 'Legg til i Google Wallet',
  cardWillBeSent: 'Kortet ditt sendes til deg snart.',

  welcomeName: (n) => `Velkommen, ${n}!`,
  studioLoyaltyProgram: (s) => `${s} lojalitetsprogram`,
  bonusCredited: (a) => `${a} bonus lagt til`,
  cashbackUnlocked: (r) => `${r}% cashback låst opp`,
  opening: 'Åpner...',
  addToWallet: (p) => (p === 'apple' ? 'Legg til i Apple Wallet' : 'Legg til i Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Legg til i Apple Wallet i stedet' : 'Legg til i Google Wallet i stedet',
  whatsNext: 'Neste steg',
  stepAddCard: 'Legg til lojalitetskortet ditt i wallet',
  stepAddCardDesc: 'Trykk på knappen over for å lagre det',
  stepVisitStudio: (s) => `Besøk ${s} og vis kortet ditt`,
  stepVisitStudioDesc: 'Vis det i kassa for å tjene belønninger',
  stepEarnCashback: (r) => `Tjen ${r}% cashback på hvert kjøp`,
  stepEarnCashbackDesc: 'Saldoen din vokser automatisk',
  referredBy: (n) => `Invitert av ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Registrer deg og få ${r}% cashback + ${bonus} velkomstbonus`
      : `Registrer deg og få ${r}% cashback`,
  joinAndGetBonus: 'Registrer & få bonusen',

  passAddToWallet: 'Legg til i Wallet',
  scanWithPhoneCamera: 'Skann med telefonkameraet for å legge til lojalitetskortet ditt',
  forIPhoneAppleWatch: 'Til iPhone & Apple Watch',
  forAndroid: 'Til Android',
  addInBrowser: 'Legg til i nettleseren',
  openCameraAndPoint: 'Åpne kamera-appen på telefonen og rett den mot QR-koden',

  fallbackHeadline: (r) => `Få ${r}% tilbake på hvert besøk`,
  fallbackJoinTitle: 'Registrer',
  welcomeMetaTitle: (s) => `Velkommen til ${s}!`,
}

// German — uses informal "du" (standard for loyalty/retail marketing in DE).
const de: SignupTranslations = {
  freeForever: 'Für immer gratis',
  thirtySeconds: '30 Sekunden',
  membersCount: (n) => `${n}+ Mitglieder`,
  noAppNeeded: 'Keine App nötig',

  whatYouGet: 'Das bekommst du',
  benefitBaseCashback: (r) => `${r}% Cashback bei jedem Einkauf`,
  benefitMaxCashback: (r) => `Bis zu ${r}% Cashback, wenn du aufsteigst`,
  benefitReferralCommission: (r) => `Verdiene ${r}% an den Einkäufen deiner Freunde`,
  benefitReferralFixedCommission: (a) => `Verdiene ${a} bei jedem Einkauf eines Freundes`,
  benefitReferralCashbackBoost: (r) => `Erhalte +${r}% Cashback für jeden Freund, den du einlädst`,
  benefitReferralInvite: 'Lade Freunde mit deinem persönlichen Empfehlungslink ein',
  benefitWelcomeBonus: (a) => `${a} Willkommensbonus bei Empfehlung`,
  benefitWalletCard: 'Digitale Treuekarte in Apple & Google Wallet',
  benefitInstantSignup: 'Anmeldung in Sekunden — kein App-Download nötig',

  invitedYou: (name) => `${name} hat dich eingeladen!`,
  welcomeBonusLabel: 'Willkommensbonus',
  cashbackFromDayOneLabel: (r) => `${r}% Cashback ab dem ersten Tag`,

  yourCashbackJourney: 'Deine Cashback-Reise',
  startHere: 'Hier startest du',
  triggerFirstPurchase: 'Nach deinem ersten Einkauf',
  triggerFirstFullPayment: 'Nach deiner ersten vollen Zahlung',
  triggerTotalSpend: (a) => `${a} an Gesamtausgaben erreichen`,
  triggerReferralCount: (n) => (n === 1 ? '1 Freund empfehlen' : `${n} Freunde empfehlen`),
  triggerDaysMember: (n) => `Nach ${n} Tagen als Mitglied`,
  tierCashbackSuffix: (r) => `— ${r}% Cashback`,

  fullNameLabel: 'Vollständiger Name',
  fullNamePlaceholder: 'Dein vollständiger Name',
  emailLabel: 'E-Mail',
  emailPlaceholder: 'du@email.de',
  phoneLabel: 'Telefon',
  phonePlaceholder: '170 1234567',
  selectPlaceholder: (label) => `${label} auswählen`,
  joinButton: 'Anmelden & Karte erhalten',
  signingUp: 'Wird angemeldet...',
  somethingWentWrong: 'Etwas ist schiefgelaufen',
  agreeToTerms: 'Mit der Anmeldung akzeptierst du unsere',
  termsAndPrivacy: 'AGB & Datenschutz',
  sendMeLink: 'Schick mir einen Link, um meine Karte hinzuzufügen',
  sentLinkCheckEmail: 'Schau in dein Postfach — wir haben dir einen Link geschickt.',
  youreIn: 'Du bist dabei!',
  welcomeYourCardReady: (name) => `Willkommen, ${name}. Deine Treuekarte ist bereit.`,
  scanWithPhone: 'Scanne mit dem Handy, um die Karte hinzuzufügen',
  pointCameraAtQR: 'Richte die Handykamera auf den QR-Code oben',
  cantSeeYourPass: 'Karte nicht zu sehen? Tippe unten, um sie erneut hinzuzufügen',
  addToAppleWallet: 'Zu Apple Wallet hinzufügen',
  addToGoogleWallet: 'Zu Google Wallet hinzufügen',
  cardWillBeSent: 'Deine Karte wird dir gleich zugeschickt.',

  welcomeName: (n) => `Willkommen, ${n}!`,
  studioLoyaltyProgram: (s) => `${s} Treueprogramm`,
  bonusCredited: (a) => `${a} Bonus gutgeschrieben`,
  cashbackUnlocked: (r) => `${r}% Cashback freigeschaltet`,
  opening: 'Wird geöffnet...',
  addToWallet: (p) => (p === 'apple' ? 'Zu Apple Wallet hinzufügen' : 'Zu Google Wallet hinzufügen'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Stattdessen zu Apple Wallet hinzufügen' : 'Stattdessen zu Google Wallet hinzufügen',
  whatsNext: 'So geht es weiter',
  stepAddCard: 'Füge deine Treuekarte zu deiner Wallet hinzu',
  stepAddCardDesc: 'Tippe auf den Button oben, um sie zu speichern',
  stepVisitStudio: (s) => `Besuche ${s} und zeige deine Karte`,
  stepVisitStudioDesc: 'Zeige sie an der Kasse, um Belohnungen zu sammeln',
  stepEarnCashback: (r) => `Verdiene ${r}% Cashback bei jedem Einkauf`,
  stepEarnCashbackDesc: 'Dein Guthaben wächst automatisch',
  referredBy: (n) => `Empfohlen von ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Melde dich an und erhalte ${r}% Cashback + ${bonus} Willkommensbonus`
      : `Melde dich an und erhalte ${r}% Cashback`,
  joinAndGetBonus: 'Anmelden & Bonus sichern',

  passAddToWallet: 'Zu Wallet hinzufügen',
  scanWithPhoneCamera: 'Scanne mit der Handykamera, um deine Treuekarte hinzuzufügen',
  forIPhoneAppleWatch: 'Für iPhone & Apple Watch',
  forAndroid: 'Für Android',
  addInBrowser: 'Im Browser hinzufügen',
  openCameraAndPoint: 'Öffne die Kamera-App und richte sie auf den QR-Code',

  fallbackHeadline: (r) => `${r}% bei jedem Besuch zurückbekommen`,
  fallbackJoinTitle: 'Anmelden',
  welcomeMetaTitle: (s) => `Willkommen bei ${s}!`,
}

// French — formal "vous" (commerce/loyalty default).
const fr: SignupTranslations = {
  freeForever: 'Gratuit pour toujours',
  thirtySeconds: '30 secondes',
  membersCount: (n) => `${n}+ membres`,
  noAppNeeded: 'Aucune appli requise',

  whatYouGet: 'Ce que vous obtenez',
  benefitBaseCashback: (r) => `${r}% de cashback sur chaque achat`,
  benefitMaxCashback: (r) => `Jusqu'à ${r}% de cashback en montant de niveau`,
  benefitReferralCommission: (r) => `Gagnez ${r}% sur les achats de vos amis`,
  benefitReferralFixedCommission: (a) => `Gagnez ${a} à chaque achat d'un ami`,
  benefitReferralCashbackBoost: (r) => `Gagnez +${r}% de cashback pour chaque ami invité`,
  benefitReferralInvite: 'Invitez des amis avec votre lien personnel',
  benefitWelcomeBonus: (a) => `${a} de bonus de bienvenue avec un parrainage`,
  benefitWalletCard: 'Carte de fidélité numérique dans Apple & Google Wallet',
  benefitInstantSignup: 'Inscription en quelques secondes — aucune appli à télécharger',

  invitedYou: (name) => `${name} vous a invité !`,
  welcomeBonusLabel: 'de bonus de bienvenue',
  cashbackFromDayOneLabel: (r) => `${r}% de cashback dès le premier jour`,

  yourCashbackJourney: 'Votre parcours cashback',
  startHere: 'Commencez ici',
  triggerFirstPurchase: 'Après votre premier achat',
  triggerFirstFullPayment: 'Après votre premier paiement complet',
  triggerTotalSpend: (a) => `Atteignez ${a} de dépenses totales`,
  triggerReferralCount: (n) => (n === 1 ? 'Parrainez 1 ami' : `Parrainez ${n} amis`),
  triggerDaysMember: (n) => `Après ${n} jours en tant que membre`,
  tierCashbackSuffix: (r) => `— ${r}% de cashback`,

  fullNameLabel: 'Nom complet',
  fullNamePlaceholder: 'Votre nom complet',
  emailLabel: 'E-mail',
  emailPlaceholder: 'vous@email.fr',
  phoneLabel: 'Téléphone',
  phonePlaceholder: '06 12 34 56 78',
  selectPlaceholder: (label) => `Sélectionner ${label.toLowerCase()}`,
  joinButton: 'S\'inscrire & recevoir la carte',
  signingUp: 'Inscription...',
  somethingWentWrong: 'Une erreur s\'est produite',
  agreeToTerms: 'En vous inscrivant, vous acceptez nos',
  termsAndPrivacy: 'Conditions & politique de confidentialité',
  sendMeLink: 'Envoyez-moi un lien pour ajouter ma carte',
  sentLinkCheckEmail: 'Vérifiez votre e-mail pour le lien d\'ajout de votre carte.',
  youreIn: 'Vous y êtes !',
  welcomeYourCardReady: (name) => `Bienvenue, ${name}. Votre carte de fidélité est prête.`,
  scanWithPhone: 'Scannez avec votre téléphone pour ajouter la carte',
  pointCameraAtQR: 'Pointez l\'appareil photo de votre téléphone vers le QR code ci-dessus',
  cantSeeYourPass: 'Vous ne voyez pas votre carte ? Touchez ci-dessous pour la rajouter',
  addToAppleWallet: 'Ajouter à Apple Wallet',
  addToGoogleWallet: 'Ajouter à Google Wallet',
  cardWillBeSent: 'Votre carte vous sera envoyée sous peu.',

  welcomeName: (n) => `Bienvenue, ${n} !`,
  studioLoyaltyProgram: (s) => `Programme de fidélité ${s}`,
  bonusCredited: (a) => `${a} de bonus crédité`,
  cashbackUnlocked: (r) => `${r}% de cashback débloqué`,
  opening: 'Ouverture...',
  addToWallet: (p) => (p === 'apple' ? 'Ajouter à Apple Wallet' : 'Ajouter à Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Ajouter plutôt à Apple Wallet' : 'Ajouter plutôt à Google Wallet',
  whatsNext: 'La suite',
  stepAddCard: 'Ajoutez votre carte de fidélité à votre wallet',
  stepAddCardDesc: 'Touchez le bouton ci-dessus pour l\'enregistrer',
  stepVisitStudio: (s) => `Rendez-vous chez ${s} et présentez votre carte`,
  stepVisitStudioDesc: 'Présentez-la en caisse pour cumuler des récompenses',
  stepEarnCashback: (r) => `Gagnez ${r}% de cashback sur chaque achat`,
  stepEarnCashbackDesc: 'Votre solde augmente automatiquement',
  referredBy: (n) => `Parrainé par ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Inscrivez-vous et recevez ${r}% de cashback + ${bonus} de bonus de bienvenue`
      : `Inscrivez-vous et recevez ${r}% de cashback`,
  joinAndGetBonus: 'S\'inscrire & recevoir le bonus',

  passAddToWallet: 'Ajouter à Wallet',
  scanWithPhoneCamera: 'Scannez avec l\'appareil photo de votre téléphone pour ajouter votre carte de fidélité',
  forIPhoneAppleWatch: 'Pour iPhone & Apple Watch',
  forAndroid: 'Pour Android',
  addInBrowser: 'Ajouter dans le navigateur',
  openCameraAndPoint: 'Ouvrez l\'appareil photo de votre téléphone et pointez-le vers le QR code',

  fallbackHeadline: (r) => `Récupérez ${r}% à chaque visite`,
  fallbackJoinTitle: 'Inscription',
  welcomeMetaTitle: (s) => `Bienvenue chez ${s} !`,
}

// Spanish — informal "tú" (loyalty/retail brand voice).
const es: SignupTranslations = {
  freeForever: 'Gratis para siempre',
  thirtySeconds: '30 segundos',
  membersCount: (n) => `${n}+ miembros`,
  noAppNeeded: 'Sin app',

  whatYouGet: 'Lo que consigues',
  benefitBaseCashback: (r) => `${r}% de cashback en cada compra`,
  benefitMaxCashback: (r) => `Hasta ${r}% de cashback al subir de nivel`,
  benefitReferralCommission: (r) => `Gana ${r}% de las compras de tus amigos`,
  benefitReferralFixedCommission: (a) => `Gana ${a} por cada compra de un amigo`,
  benefitReferralCashbackBoost: (r) => `Gana +${r}% de cashback por cada amigo que invites`,
  benefitReferralInvite: 'Invita amigos con tu enlace personal',
  benefitWelcomeBonus: (a) => `${a} de bono de bienvenida al ser invitado`,
  benefitWalletCard: 'Tarjeta de fidelidad digital en Apple & Google Wallet',
  benefitInstantSignup: 'Registro en segundos — sin descargar ninguna app',

  invitedYou: (name) => `¡${name} te ha invitado!`,
  welcomeBonusLabel: 'de bono de bienvenida',
  cashbackFromDayOneLabel: (r) => `${r}% de cashback desde el primer día`,

  yourCashbackJourney: 'Tu camino de cashback',
  startHere: 'Empieza aquí',
  triggerFirstPurchase: 'Después de tu primera compra',
  triggerFirstFullPayment: 'Después de tu primer pago completo',
  triggerTotalSpend: (a) => `Gasta ${a} en total`,
  triggerReferralCount: (n) => (n === 1 ? 'Invita a 1 amigo' : `Invita a ${n} amigos`),
  triggerDaysMember: (n) => `Después de ${n} días como miembro`,
  tierCashbackSuffix: (r) => `— ${r}% de cashback`,

  fullNameLabel: 'Nombre completo',
  fullNamePlaceholder: 'Tu nombre completo',
  emailLabel: 'Correo electrónico',
  emailPlaceholder: 'tu@email.es',
  phoneLabel: 'Teléfono',
  phonePlaceholder: '612 34 56 78',
  selectPlaceholder: (label) => `Selecciona ${label.toLowerCase()}`,
  joinButton: 'Únete & consigue tu tarjeta',
  signingUp: 'Registrando...',
  somethingWentWrong: 'Algo salió mal',
  agreeToTerms: 'Al registrarte aceptas nuestros',
  termsAndPrivacy: 'Términos & política de privacidad',
  sendMeLink: 'Envíame un enlace para añadir mi tarjeta',
  sentLinkCheckEmail: 'Revisa tu correo: te hemos enviado un enlace para añadir tu tarjeta.',
  youreIn: '¡Ya estás dentro!',
  welcomeYourCardReady: (name) => `Bienvenido, ${name}. Tu tarjeta de fidelidad está lista.`,
  scanWithPhone: 'Escanea con tu móvil para añadir la tarjeta',
  pointCameraAtQR: 'Apunta la cámara del móvil al código QR de arriba',
  cantSeeYourPass: '¿No ves tu tarjeta? Toca abajo para añadirla de nuevo',
  addToAppleWallet: 'Añadir a Apple Wallet',
  addToGoogleWallet: 'Añadir a Google Wallet',
  cardWillBeSent: 'Tu tarjeta te llegará en breve.',

  welcomeName: (n) => `¡Bienvenido, ${n}!`,
  studioLoyaltyProgram: (s) => `Programa de fidelidad ${s}`,
  bonusCredited: (a) => `${a} de bono añadido`,
  cashbackUnlocked: (r) => `${r}% de cashback desbloqueado`,
  opening: 'Abriendo...',
  addToWallet: (p) => (p === 'apple' ? 'Añadir a Apple Wallet' : 'Añadir a Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Añadir a Apple Wallet en su lugar' : 'Añadir a Google Wallet en su lugar',
  whatsNext: 'Lo siguiente',
  stepAddCard: 'Añade tu tarjeta de fidelidad a la wallet',
  stepAddCardDesc: 'Toca el botón de arriba para guardarla',
  stepVisitStudio: (s) => `Visita ${s} y muestra tu tarjeta`,
  stepVisitStudioDesc: 'Muéstrala en caja para ganar recompensas',
  stepEarnCashback: (r) => `Gana ${r}% de cashback en cada compra`,
  stepEarnCashbackDesc: 'Tu saldo crece automáticamente',
  referredBy: (n) => `Invitado por ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Regístrate y obtén ${r}% de cashback + ${bonus} de bono de bienvenida`
      : `Regístrate y obtén ${r}% de cashback`,
  joinAndGetBonus: 'Únete & consigue tu bono',

  passAddToWallet: 'Añadir a Wallet',
  scanWithPhoneCamera: 'Escanea con la cámara de tu móvil para añadir tu tarjeta de fidelidad',
  forIPhoneAppleWatch: 'Para iPhone & Apple Watch',
  forAndroid: 'Para Android',
  addInBrowser: 'Añadir en el navegador',
  openCameraAndPoint: 'Abre la cámara del móvil y apúntala al código QR',

  fallbackHeadline: (r) => `Recibe ${r}% en cada visita`,
  fallbackJoinTitle: 'Registro',
  welcomeMetaTitle: (s) => `¡Bienvenido a ${s}!`,
}

// Dutch — informal "je" (loyalty default).
const nl: SignupTranslations = {
  freeForever: 'Voor altijd gratis',
  thirtySeconds: '30 seconden',
  membersCount: (n) => `${n}+ leden`,
  noAppNeeded: 'Geen app nodig',

  whatYouGet: 'Wat je krijgt',
  benefitBaseCashback: (r) => `${r}% cashback op elke aankoop`,
  benefitMaxCashback: (r) => `Tot ${r}% cashback naarmate je stijgt`,
  benefitReferralCommission: (r) => `Verdien ${r}% op de aankopen van je vrienden`,
  benefitReferralFixedCommission: (a) => `Verdien ${a} bij elke aankoop van een vriend`,
  benefitReferralCashbackBoost: (r) => `Verdien +${r}% cashback voor elke vriend die je uitnodigt`,
  benefitReferralInvite: 'Nodig vrienden uit met je persoonlijke link',
  benefitWelcomeBonus: (a) => `${a} welkomstbonus bij uitnodiging`,
  benefitWalletCard: 'Digitale loyaliteitskaart in Apple & Google Wallet',
  benefitInstantSignup: 'Direct aanmelden — geen app-download nodig',

  invitedYou: (name) => `${name} heeft je uitgenodigd!`,
  welcomeBonusLabel: 'welkomstbonus',
  cashbackFromDayOneLabel: (r) => `${r}% cashback vanaf dag één`,

  yourCashbackJourney: 'Jouw cashback-reis',
  startHere: 'Start hier',
  triggerFirstPurchase: 'Na je eerste aankoop',
  triggerFirstFullPayment: 'Na je eerste volledige betaling',
  triggerTotalSpend: (a) => `Geef in totaal ${a} uit`,
  triggerReferralCount: (n) => (n === 1 ? 'Nodig 1 vriend uit' : `Nodig ${n} vrienden uit`),
  triggerDaysMember: (n) => `Na ${n} dagen lidmaatschap`,
  tierCashbackSuffix: (r) => `— ${r}% cashback`,

  fullNameLabel: 'Volledige naam',
  fullNamePlaceholder: 'Je volledige naam',
  emailLabel: 'E-mail',
  emailPlaceholder: 'jij@email.nl',
  phoneLabel: 'Telefoon',
  phonePlaceholder: '06 12 34 56 78',
  selectPlaceholder: (label) => `${label} selecteren`,
  joinButton: 'Meld je aan & ontvang je kaart',
  signingUp: 'Aanmelden...',
  somethingWentWrong: 'Er ging iets mis',
  agreeToTerms: 'Door je aan te melden ga je akkoord met onze',
  termsAndPrivacy: 'Voorwaarden & privacybeleid',
  sendMeLink: 'Stuur me een link om mijn kaart toe te voegen',
  sentLinkCheckEmail: 'Check je e-mail voor een link om je kaart toe te voegen.',
  youreIn: 'Je bent erbij!',
  welcomeYourCardReady: (name) => `Welkom, ${name}. Je loyaliteitskaart is klaar.`,
  scanWithPhone: 'Scan met je telefoon om de kaart toe te voegen',
  pointCameraAtQR: 'Richt je telefooncamera op de QR-code hierboven',
  cantSeeYourPass: 'Zie je je kaart niet? Tik hieronder om hem opnieuw toe te voegen',
  addToAppleWallet: 'Toevoegen aan Apple Wallet',
  addToGoogleWallet: 'Toevoegen aan Google Wallet',
  cardWillBeSent: 'Je kaart wordt zo verstuurd.',

  welcomeName: (n) => `Welkom, ${n}!`,
  studioLoyaltyProgram: (s) => `${s} loyaliteitsprogramma`,
  bonusCredited: (a) => `${a} bonus toegevoegd`,
  cashbackUnlocked: (r) => `${r}% cashback ontgrendeld`,
  opening: 'Openen...',
  addToWallet: (p) => (p === 'apple' ? 'Toevoegen aan Apple Wallet' : 'Toevoegen aan Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'In plaats daarvan aan Apple Wallet toevoegen' : 'In plaats daarvan aan Google Wallet toevoegen',
  whatsNext: 'Volgende stap',
  stepAddCard: 'Voeg je loyaliteitskaart toe aan je wallet',
  stepAddCardDesc: 'Tik op de knop hierboven om hem op te slaan',
  stepVisitStudio: (s) => `Bezoek ${s} en laat je kaart zien`,
  stepVisitStudioDesc: 'Laat hem zien bij de kassa om beloningen te verdienen',
  stepEarnCashback: (r) => `Verdien ${r}% cashback op elke aankoop`,
  stepEarnCashbackDesc: 'Je saldo groeit automatisch',
  referredBy: (n) => `Uitgenodigd door ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Meld je aan en krijg ${r}% cashback + ${bonus} welkomstbonus`
      : `Meld je aan en krijg ${r}% cashback`,
  joinAndGetBonus: 'Meld je aan & ontvang je bonus',

  passAddToWallet: 'Toevoegen aan Wallet',
  scanWithPhoneCamera: 'Scan met je telefooncamera om je loyaliteitskaart toe te voegen',
  forIPhoneAppleWatch: 'Voor iPhone & Apple Watch',
  forAndroid: 'Voor Android',
  addInBrowser: 'In de browser toevoegen',
  openCameraAndPoint: 'Open de camera-app van je telefoon en richt hem op de QR-code',

  fallbackHeadline: (r) => `Krijg ${r}% terug bij elk bezoek`,
  fallbackJoinTitle: 'Aanmelden',
  welcomeMetaTitle: (s) => `Welkom bij ${s}!`,
}

// Polish — informal "ty"/2nd person verb forms.
const pl: SignupTranslations = {
  freeForever: 'Na zawsze za darmo',
  thirtySeconds: '30 sekund',
  membersCount: (n) => `${n}+ członków`,
  noAppNeeded: 'Bez aplikacji',

  whatYouGet: 'Co zyskujesz',
  benefitBaseCashback: (r) => `${r}% cashbacku od każdego zakupu`,
  benefitMaxCashback: (r) => `Nawet ${r}% cashbacku, gdy awansujesz`,
  benefitReferralCommission: (r) => `Zarabiaj ${r}% z zakupów znajomych`,
  benefitReferralFixedCommission: (a) => `Zarabiaj ${a} za każdy zakup znajomego`,
  benefitReferralCashbackBoost: (r) => `Zyskaj +${r}% cashbacku za każdego znajomego, którego zaprosisz`,
  benefitReferralInvite: 'Zaproś znajomych swoim osobistym linkiem',
  benefitWelcomeBonus: (a) => `${a} bonusu powitalnego z polecenia`,
  benefitWalletCard: 'Cyfrowa karta lojalnościowa w Apple & Google Wallet',
  benefitInstantSignup: 'Rejestracja w kilka sekund — bez pobierania aplikacji',

  invitedYou: (name) => `${name} zaprasza Cię!`,
  welcomeBonusLabel: 'bonusu powitalnego',
  cashbackFromDayOneLabel: (r) => `${r}% cashbacku od pierwszego dnia`,

  yourCashbackJourney: 'Twoja droga po cashback',
  startHere: 'Zaczynasz tutaj',
  triggerFirstPurchase: 'Po pierwszym zakupie',
  triggerFirstFullPayment: 'Po pierwszej pełnej płatności',
  triggerTotalSpend: (a) => `Wydaj łącznie ${a}`,
  triggerReferralCount: (n) => {
    if (n === 1) return 'Poleć 1 znajomego'
    // Polish plural: 2-4 → znajomych, 5+ → znajomych (genitive plural)
    return `Poleć ${n} znajomych`
  },
  triggerDaysMember: (n) => `Po ${n} dniach członkostwa`,
  tierCashbackSuffix: (r) => `— ${r}% cashbacku`,

  fullNameLabel: 'Imię i nazwisko',
  fullNamePlaceholder: 'Twoje imię i nazwisko',
  emailLabel: 'E-mail',
  emailPlaceholder: 'ty@email.pl',
  phoneLabel: 'Telefon',
  phonePlaceholder: '600 123 456',
  selectPlaceholder: (label) => `Wybierz ${label.toLowerCase()}`,
  joinButton: 'Dołącz & odbierz kartę',
  signingUp: 'Rejestracja...',
  somethingWentWrong: 'Coś poszło nie tak',
  agreeToTerms: 'Rejestrując się, akceptujesz nasze',
  termsAndPrivacy: 'Regulamin & politykę prywatności',
  sendMeLink: 'Wyślij mi link, żebym dodał kartę',
  sentLinkCheckEmail: 'Sprawdź skrzynkę — wysłaliśmy link do dodania karty.',
  youreIn: 'Jesteś z nami!',
  welcomeYourCardReady: (name) => `Witaj, ${name}. Twoja karta lojalnościowa jest gotowa.`,
  scanWithPhone: 'Zeskanuj telefonem, aby dodać kartę',
  pointCameraAtQR: 'Skieruj aparat telefonu na powyższy kod QR',
  cantSeeYourPass: 'Nie widzisz karty? Stuknij poniżej, aby dodać ją ponownie',
  addToAppleWallet: 'Dodaj do Apple Wallet',
  addToGoogleWallet: 'Dodaj do Google Wallet',
  cardWillBeSent: 'Karta zostanie do Ciebie wkrótce wysłana.',

  welcomeName: (n) => `Witaj, ${n}!`,
  studioLoyaltyProgram: (s) => `Program lojalnościowy ${s}`,
  bonusCredited: (a) => `${a} bonusu dodane`,
  cashbackUnlocked: (r) => `${r}% cashbacku odblokowane`,
  opening: 'Otwieranie...',
  addToWallet: (p) => (p === 'apple' ? 'Dodaj do Apple Wallet' : 'Dodaj do Google Wallet'),
  addToOtherWalletInstead: (p) =>
    p === 'apple' ? 'Dodaj zamiast tego do Apple Wallet' : 'Dodaj zamiast tego do Google Wallet',
  whatsNext: 'Co dalej',
  stepAddCard: 'Dodaj kartę lojalnościową do portfela',
  stepAddCardDesc: 'Stuknij przycisk powyżej, aby ją zapisać',
  stepVisitStudio: (s) => `Odwiedź ${s} i pokaż kartę`,
  stepVisitStudioDesc: 'Pokaż ją przy kasie, aby zdobywać nagrody',
  stepEarnCashback: (r) => `Zdobywaj ${r}% cashbacku od każdego zakupu`,
  stepEarnCashbackDesc: 'Twoje saldo rośnie automatycznie',
  referredBy: (n) => `Polecone przez: ${n}`,

  signUpAndGet: (r, hasBonus, bonus) =>
    hasBonus
      ? `Zarejestruj się i odbierz ${r}% cashbacku + ${bonus} bonusu powitalnego`
      : `Zarejestruj się i odbierz ${r}% cashbacku`,
  joinAndGetBonus: 'Dołącz & odbierz bonus',

  passAddToWallet: 'Dodaj do Wallet',
  scanWithPhoneCamera: 'Zeskanuj aparatem telefonu, aby dodać kartę lojalnościową',
  forIPhoneAppleWatch: 'Dla iPhone & Apple Watch',
  forAndroid: 'Dla Androida',
  addInBrowser: 'Dodaj w przeglądarce',
  openCameraAndPoint: 'Otwórz aparat w telefonie i skieruj go na kod QR',

  fallbackHeadline: (r) => `Otrzymuj ${r}% z każdej wizyty`,
  fallbackJoinTitle: 'Dołącz',
  welcomeMetaTitle: (s) => `Witaj w ${s}!`,
}

const translations: Record<string, SignupTranslations> = {
  en,
  da,
  sv,
  // ISO 639-1 for Norwegian is `no`; Bokmål is `nb`. The studio picker uses
  // `no`, so we register both keys to the same dictionary.
  no: nb,
  nb,
  de,
  fr,
  es,
  nl,
  pl,
}

/** Normalise raw studio language to a supported key. */
export function normalizeLanguage(lang: string | null | undefined): string {
  if (!lang) return 'en'
  const lower = lang.toLowerCase()
  return lower in translations ? lower : 'en'
}

/** Lookup helper — falls back to English for unknown codes. */
export function getSignupTranslations(lang: string | null | undefined): SignupTranslations {
  return translations[normalizeLanguage(lang)] ?? translations.en
}
