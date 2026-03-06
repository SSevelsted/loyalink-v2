export type LoyaltyTranslations = {
  // Stats
  cashback: string
  balance: string

  // Share
  shareMessage: (studio: string, rate: number, bonus: number, link: string) => string

  // Section headings
  whatYourFriendGets: string
  howReferralsWork: string
  shareYourLink: string
  cashbackProgression: string
  recentActivity: string
  stepsToComplete: string

  // Hero
  daysLeftThisMonth: (days: number) => string
  maximumCashback: string
  keepSharing: (rate: number) => string
  inviteFriendsTitle: string
  permanentCashback: (bonus: number) => string
  forEachFriend: string
  friendSpend: (rate: number) => string
  forDays: (days: number) => string
  forUnlimitedTime: string
  earnRewardsGeneric: string
  inviteFriendsButton: string

  // Friend benefits
  cashbackFromDayOne: (rate: number) => string
  earnBackOnEveryPurchase: string
  welcomeBonus: (amount: number, currency: string) => string
  addedToBalance: string
  digitalLoyaltyCard: string
  savedToWallet: string

  // How referrals work steps
  shareYourLinkStep: string
  friendSignsUp: string
  onceComplete: string

  // Trigger text
  makesFirstPurchase: string
  completesFirstFullPayment: string
  spendsAmount: (amount: string) => string
  completesQualifyingAction: string

  // Share UI
  copied: string

  // Progression
  maximumCashbackReached: string
  youveReferred: (count: number) => string
  moreToReach: (needed: number) => string

  // How to earn more
  howToEarnMore: string
  doFirstPurchase: string
  doFirstFullPayment: string
  doTotalSpend: (amount: string) => string
  doReferralCount: (n: number) => string
  doDaysMember: (n: number) => string
  upgradeToRate: (rate: number) => string
  inviteAndBoost: (bonus: number) => string

  // Activity
  noActivityYet: string
  transactionLabels: Record<string, string>

  // Referral history
  youveEarned: string
  fromReferrals: (activated: number, pending: number) => string
  completedStatus: string
  pendingStatus: string
  expiredStatus: string
  waitingForFirstVisit: string

  // Referral detail
  earnedFromReferral: (amount: string) => string
  waitingForActivation: (name: string) => string
  thisReferralExpired: string
  signUp: string
  addWalletPass: string
  referredTimeAgo: (time: string) => string
  activatedTimeAgo: (time: string) => string

  // Avatar
  changePhoto: string

  // Time
  justNow: string
  minutesAgo: (m: number) => string
  hoursAgo: (h: number) => string
  daysAgo: (d: number) => string
  monthsAgo: (mo: number) => string
}

const en: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Balance',

  shareMessage: (studio, rate, bonus, link) =>
    `Get ${rate}% cashback${bonus > 0 ? ` + ${bonus} kr bonus` : ''} at ${studio}! ${link}`,

  whatYourFriendGets: 'What your friend gets',
  howReferralsWork: 'How referrals work',
  shareYourLink: 'Share your link',
  cashbackProgression: 'Cashback progression',
  recentActivity: 'Recent activity',
  stepsToComplete: 'Steps to complete',

  daysLeftThisMonth: (d) => `${d} days left this month`,
  maximumCashback: 'Maximum cashback!',
  keepSharing: (rate) => `You're earning ${rate}% — keep sharing to earn commissions`,
  inviteFriendsTitle: 'Invite friends. Earn more.',
  permanentCashback: (bonus) => `+${bonus}% permanent cashback`,
  forEachFriend: 'for each friend you refer',
  friendSpend: (rate) => `${rate}% of your friend's spend`,
  forDays: (days) => `for ${days} days`,
  forUnlimitedTime: 'for unlimited time',
  earnRewardsGeneric: 'Earn rewards for every friend you invite',
  inviteFriendsButton: 'Invite Friends',

  cashbackFromDayOne: (rate) => `${rate}% cashback from day one`,
  earnBackOnEveryPurchase: 'Earn back on every purchase, starting immediately',
  welcomeBonus: (amount, currency) => `${amount} ${currency} welcome bonus`,
  addedToBalance: 'Added to their balance once they qualify',
  digitalLoyaltyCard: 'Digital loyalty card',
  savedToWallet: 'Saved to Apple Wallet or Google Wallet instantly',

  shareYourLinkStep: 'Share your link',
  friendSignsUp: 'Friend signs up & adds wallet pass',
  onceComplete: 'Once complete, you earn your rewards automatically.',

  makesFirstPurchase: 'Makes their first purchase',
  completesFirstFullPayment: 'Completes their first full payment',
  spendsAmount: (amount) => `Spends ${amount}`,
  completesQualifyingAction: 'Completes a qualifying action',

  copied: 'Copied!',

  maximumCashbackReached: 'Maximum cashback reached!',
  youveReferred: (n) => `You've referred ${n} friend${n !== 1 ? 's' : ''}`,
  moreToReach: (n) => `${n} more to reach`,

  howToEarnMore: 'Ways to earn more',
  doFirstPurchase: 'Make your first purchase',
  doFirstFullPayment: 'Complete your first full payment',
  doTotalSpend: (amount) => `Reach ${amount} in total spend`,
  doReferralCount: (n) => `Refer ${n} friend${n !== 1 ? 's' : ''}`,
  doDaysMember: (n) => `Be a member for ${n} day${n !== 1 ? 's' : ''}`,
  upgradeToRate: (rate) => `→ ${rate}% cashback`,
  inviteAndBoost: (bonus) => `Invite a friend → +${bonus}% cashback`,

  noActivityYet: 'No activity yet',
  transactionLabels: {
    credit: 'Purchase Recorded',
    debit: 'Balance Redeemed',
    adjustment: 'Balance Adjustment',
    cashback: 'Cashback Earned',
    referral_commission: 'Referral Bonus',
  },

  youveEarned: "You've earned",
  fromReferrals: (activated, pending) =>
    `from ${activated} successful referral${activated !== 1 ? 's' : ''}${pending > 0 ? ` · ${pending} pending` : ''}`,
  completedStatus: 'Completed',
  pendingStatus: 'Pending',
  expiredStatus: 'Expired',
  waitingForFirstVisit: 'Waiting for first visit',

  earnedFromReferral: (amount) => `You earned ${amount} from this referral`,
  waitingForActivation: (name) => `Waiting for ${name} to complete activation`,
  thisReferralExpired: 'This referral has expired',
  signUp: 'Sign up',
  addWalletPass: 'Add wallet pass',
  referredTimeAgo: (time) => `Referred ${time}`,
  activatedTimeAgo: (time) => `Activated ${time}`,

  changePhoto: 'Change photo',

  justNow: 'just now',
  minutesAgo: (m) => `${m}m ago`,
  hoursAgo: (h) => `${h}h ago`,
  daysAgo: (d) => `${d}d ago`,
  monthsAgo: (mo) => `${mo}mo ago`,
}

const da: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Saldo',

  shareMessage: (studio, rate, bonus, link) =>
    `Få ${rate}% cashback${bonus > 0 ? ` + ${bonus} kr bonus` : ''} hos ${studio}! ${link}`,

  whatYourFriendGets: 'Det får din ven',
  howReferralsWork: 'Sådan fungerer det',
  shareYourLink: 'Del dit link',
  cashbackProgression: 'Cashback-progression',
  recentActivity: 'Seneste aktivitet',
  stepsToComplete: 'Trin der skal gennemføres',

  daysLeftThisMonth: (d) => `${d} dage tilbage denne måned`,
  maximumCashback: 'Maksimal cashback!',
  keepSharing: (rate) => `Du tjener ${rate}% — del videre for at tjene kommission`,
  inviteFriendsTitle: 'Inviter venner. Tjen mere.',
  permanentCashback: (bonus) => `+${bonus}% permanent cashback`,
  forEachFriend: 'for hver ven du henviser',
  friendSpend: (rate) => `${rate}% af din vens forbrug`,
  forDays: (days) => `i ${days} dage`,
  forUnlimitedTime: 'uden tidsbegrænsning',
  earnRewardsGeneric: 'Tjen belønninger for hver ven du inviterer',
  inviteFriendsButton: 'Inviter venner',

  cashbackFromDayOne: (rate) => `${rate}% cashback fra dag ét`,
  earnBackOnEveryPurchase: 'Tjen tilbage på hvert køb med det samme',
  welcomeBonus: (amount, currency) => `${amount} ${currency} velkomstbonus`,
  addedToBalance: 'Tilføjes til deres saldo når de kvalificerer sig',
  digitalLoyaltyCard: 'Digitalt loyalitetskort',
  savedToWallet: 'Gemmes i Apple Wallet eller Google Wallet med det samme',

  shareYourLinkStep: 'Del dit link',
  friendSignsUp: 'Vennen tilmelder sig og tilføjer wallet-pas',
  onceComplete: 'Når det er fuldført, modtager du dine belønninger automatisk.',

  makesFirstPurchase: 'Foretager sit første køb',
  completesFirstFullPayment: 'Gennemfører sin første fulde betaling',
  spendsAmount: (amount) => `Bruger ${amount}`,
  completesQualifyingAction: 'Gennemfører en kvalificerende handling',

  copied: 'Kopieret!',

  maximumCashbackReached: 'Maksimal cashback nået!',
  youveReferred: (n) => `Du har henvist ${n} ven${n !== 1 ? 'ner' : ''}`,
  moreToReach: (n) => `${n} mere for at nå`,

  howToEarnMore: 'Måder at tjene mere',
  doFirstPurchase: 'Foretag dit første køb',
  doFirstFullPayment: 'Gennemfør din første fulde betaling',
  doTotalSpend: (amount) => `Nå ${amount} i samlet køb`,
  doReferralCount: (n) => `Henvis ${n} ven${n !== 1 ? 'ner' : ''}`,
  doDaysMember: (n) => `Vær medlem i ${n} dag${n !== 1 ? 'e' : ''}`,
  upgradeToRate: (rate) => `→ ${rate}% cashback`,
  inviteAndBoost: (bonus) => `Inviter en ven → +${bonus}% cashback`,

  noActivityYet: 'Ingen aktivitet endnu',
  transactionLabels: {
    credit: 'Køb registreret',
    debit: 'Saldo indløst',
    adjustment: 'Saldojustering',
    cashback: 'Cashback optjent',
    referral_commission: 'Henvisningsbonus',
  },

  youveEarned: 'Du har tjent',
  fromReferrals: (activated, pending) =>
    `fra ${activated} succesfuld${activated !== 1 ? 'e' : ''} henvisning${activated !== 1 ? 'er' : ''}${pending > 0 ? ` · ${pending} afventer` : ''}`,
  completedStatus: 'Fuldført',
  pendingStatus: 'Afventer',
  expiredStatus: 'Udløbet',
  waitingForFirstVisit: 'Afventer første besøg',

  earnedFromReferral: (amount) => `Du tjente ${amount} fra denne henvisning`,
  waitingForActivation: (name) => `Afventer at ${name} gennemfører aktivering`,
  thisReferralExpired: 'Denne henvisning er udløbet',
  signUp: 'Tilmelding',
  addWalletPass: 'Tilføj wallet-pas',
  referredTimeAgo: (time) => `Henvist ${time}`,
  activatedTimeAgo: (time) => `Aktiveret ${time}`,

  changePhoto: 'Skift foto',

  justNow: 'lige nu',
  minutesAgo: (m) => `${m} min. siden`,
  hoursAgo: (h) => `${h}t siden`,
  daysAgo: (d) => `${d}d siden`,
  monthsAgo: (mo) => `${mo} mdr. siden`,
}

const sv: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Saldo',

  shareMessage: (studio, rate, bonus, link) =>
    `Få ${rate}% cashback${bonus > 0 ? ` + ${bonus} kr bonus` : ''} hos ${studio}! ${link}`,

  whatYourFriendGets: 'Det här får din vän',
  howReferralsWork: 'Så fungerar det',
  shareYourLink: 'Dela din länk',
  cashbackProgression: 'Cashback-progression',
  recentActivity: 'Senaste aktivitet',
  stepsToComplete: 'Steg att slutföra',

  daysLeftThisMonth: (d) => `${d} dagar kvar den här månaden`,
  maximumCashback: 'Maximal cashback!',
  keepSharing: (rate) => `Du tjänar ${rate}% — fortsätt dela för att tjäna provision`,
  inviteFriendsTitle: 'Bjud in vänner. Tjäna mer.',
  permanentCashback: (bonus) => `+${bonus}% permanent cashback`,
  forEachFriend: 'för varje vän du hänvisar',
  friendSpend: (rate) => `${rate}% av din väns utgifter`,
  forDays: (days) => `i ${days} dagar`,
  forUnlimitedTime: 'utan tidsbegränsning',
  earnRewardsGeneric: 'Tjäna belöningar för varje vän du bjuder in',
  inviteFriendsButton: 'Bjud in vänner',

  cashbackFromDayOne: (rate) => `${rate}% cashback från dag ett`,
  earnBackOnEveryPurchase: 'Tjäna tillbaka på varje köp direkt',
  welcomeBonus: (amount, currency) => `${amount} ${currency} välkomstbonus`,
  addedToBalance: 'Läggs till deras saldo när de kvalificerar sig',
  digitalLoyaltyCard: 'Digitalt lojalitetskort',
  savedToWallet: 'Sparas i Apple Wallet eller Google Wallet direkt',

  shareYourLinkStep: 'Dela din länk',
  friendSignsUp: 'Vännen registrerar sig och lägger till wallet-pass',
  onceComplete: 'När det är klart får du dina belöningar automatiskt.',

  makesFirstPurchase: 'Gör sitt första köp',
  completesFirstFullPayment: 'Genomför sin första fullständiga betalning',
  spendsAmount: (amount) => `Spenderar ${amount}`,
  completesQualifyingAction: 'Genomför en kvalificerande åtgärd',

  copied: 'Kopierad!',

  maximumCashbackReached: 'Maximal cashback uppnådd!',
  youveReferred: (n) => `Du har hänvisat ${n} vän${n !== 1 ? 'ner' : ''}`,
  moreToReach: (n) => `${n} till för att nå`,

  howToEarnMore: 'Sätt att tjäna mer',
  doFirstPurchase: 'Gör ditt första köp',
  doFirstFullPayment: 'Slutför din första betalning',
  doTotalSpend: (amount) => `Nå ${amount} i total köp`,
  doReferralCount: (n) => `Hänvisa ${n} vän${n !== 1 ? 'ner' : ''}`,
  doDaysMember: (n) => `Var medlem i ${n} dag${n !== 1 ? 'ar' : ''}`,
  upgradeToRate: (rate) => `→ ${rate}% cashback`,
  inviteAndBoost: (bonus) => `Bjud in en vän → +${bonus}% cashback`,

  noActivityYet: 'Ingen aktivitet ännu',
  transactionLabels: {
    credit: 'Köp registrerat',
    debit: 'Saldo inlöst',
    adjustment: 'Saldojustering',
    cashback: 'Cashback intjänad',
    referral_commission: 'Hänvisningsbonus',
  },

  youveEarned: 'Du har tjänat',
  fromReferrals: (activated, pending) =>
    `från ${activated} lyckad${activated !== 1 ? 'e' : ''} hänvisning${activated !== 1 ? 'ar' : ''}${pending > 0 ? ` · ${pending} väntande` : ''}`,
  completedStatus: 'Slutförd',
  pendingStatus: 'Väntande',
  expiredStatus: 'Utgången',
  waitingForFirstVisit: 'Väntar på första besöket',

  earnedFromReferral: (amount) => `Du tjänade ${amount} från denna hänvisning`,
  waitingForActivation: (name) => `Väntar på att ${name} slutför aktivering`,
  thisReferralExpired: 'Denna hänvisning har utgått',
  signUp: 'Registrering',
  addWalletPass: 'Lägg till wallet-pass',
  referredTimeAgo: (time) => `Hänvisad ${time}`,
  activatedTimeAgo: (time) => `Aktiverad ${time}`,

  changePhoto: 'Byt foto',

  justNow: 'just nu',
  minutesAgo: (m) => `${m} min sedan`,
  hoursAgo: (h) => `${h}t sedan`,
  daysAgo: (d) => `${d}d sedan`,
  monthsAgo: (mo) => `${mo} mån sedan`,
}

const nb: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Saldo',

  shareMessage: (studio, rate, bonus, link) =>
    `Få ${rate}% cashback${bonus > 0 ? ` + ${bonus} kr bonus` : ''} hos ${studio}! ${link}`,

  whatYourFriendGets: 'Dette får vennen din',
  howReferralsWork: 'Slik fungerer det',
  shareYourLink: 'Del lenken din',
  cashbackProgression: 'Cashback-progresjon',
  recentActivity: 'Siste aktivitet',
  stepsToComplete: 'Steg som må fullføres',

  daysLeftThisMonth: (d) => `${d} dager igjen denne måneden`,
  maximumCashback: 'Maksimal cashback!',
  keepSharing: (rate) => `Du tjener ${rate}% — fortsett å dele for å tjene provisjon`,
  inviteFriendsTitle: 'Inviter venner. Tjen mer.',
  permanentCashback: (bonus) => `+${bonus}% permanent cashback`,
  forEachFriend: 'for hver venn du henviser',
  friendSpend: (rate) => `${rate}% av vennens forbruk`,
  forDays: (days) => `i ${days} dager`,
  forUnlimitedTime: 'uten tidsbegrensning',
  earnRewardsGeneric: 'Tjen belønninger for hver venn du inviterer',
  inviteFriendsButton: 'Inviter venner',

  cashbackFromDayOne: (rate) => `${rate}% cashback fra dag én`,
  earnBackOnEveryPurchase: 'Tjen tilbake på hvert kjøp med en gang',
  welcomeBonus: (amount, currency) => `${amount} ${currency} velkomstbonus`,
  addedToBalance: 'Legges til saldoen deres når de kvalifiserer seg',
  digitalLoyaltyCard: 'Digitalt lojalitetskort',
  savedToWallet: 'Lagres i Apple Wallet eller Google Wallet med en gang',

  shareYourLinkStep: 'Del lenken din',
  friendSignsUp: 'Vennen registrerer seg og legger til wallet-pass',
  onceComplete: 'Når det er fullført, mottar du belønningene dine automatisk.',

  makesFirstPurchase: 'Gjør sitt første kjøp',
  completesFirstFullPayment: 'Fullfører sin første fulle betaling',
  spendsAmount: (amount) => `Bruker ${amount}`,
  completesQualifyingAction: 'Fullfører en kvalifiserende handling',

  copied: 'Kopiert!',

  maximumCashbackReached: 'Maksimal cashback nådd!',
  youveReferred: (n) => `Du har henvist ${n} venn${n !== 1 ? 'er' : ''}`,
  moreToReach: (n) => `${n} til for å nå`,

  howToEarnMore: 'Måter å tjene mer',
  doFirstPurchase: 'Gjør ditt første kjøp',
  doFirstFullPayment: 'Fullfør din første betaling',
  doTotalSpend: (amount) => `Nå ${amount} i totalt kjøp`,
  doReferralCount: (n) => `Henvis ${n} venn${n !== 1 ? 'er' : ''}`,
  doDaysMember: (n) => `Vær medlem i ${n} dag${n !== 1 ? 'er' : ''}`,
  upgradeToRate: (rate) => `→ ${rate}% cashback`,
  inviteAndBoost: (bonus) => `Inviter en venn → +${bonus}% cashback`,

  noActivityYet: 'Ingen aktivitet ennå',
  transactionLabels: {
    credit: 'Kjøp registrert',
    debit: 'Saldo innløst',
    adjustment: 'Saldojustering',
    cashback: 'Cashback opptjent',
    referral_commission: 'Henvisningsbonus',
  },

  youveEarned: 'Du har tjent',
  fromReferrals: (activated, pending) =>
    `fra ${activated} vellykket${activated !== 1 ? 'e' : ''} henvisning${activated !== 1 ? 'er' : ''}${pending > 0 ? ` · ${pending} ventende` : ''}`,
  completedStatus: 'Fullført',
  pendingStatus: 'Ventende',
  expiredStatus: 'Utløpt',
  waitingForFirstVisit: 'Venter på første besøk',

  earnedFromReferral: (amount) => `Du tjente ${amount} fra denne henvisningen`,
  waitingForActivation: (name) => `Venter på at ${name} fullfører aktivering`,
  thisReferralExpired: 'Denne henvisningen har utløpt',
  signUp: 'Registrering',
  addWalletPass: 'Legg til wallet-pass',
  referredTimeAgo: (time) => `Henvist ${time}`,
  activatedTimeAgo: (time) => `Aktivert ${time}`,

  changePhoto: 'Bytt foto',

  justNow: 'akkurat nå',
  minutesAgo: (m) => `${m} min siden`,
  hoursAgo: (h) => `${h}t siden`,
  daysAgo: (d) => `${d}d siden`,
  monthsAgo: (mo) => `${mo} mnd siden`,
}

const de: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Guthaben',

  shareMessage: (studio, rate, bonus, link) =>
    `Erhalte ${rate}% Cashback${bonus > 0 ? ` + ${bonus} kr Bonus` : ''} bei ${studio}! ${link}`,

  whatYourFriendGets: 'Das bekommt dein Freund',
  howReferralsWork: 'So funktioniert es',
  shareYourLink: 'Teile deinen Link',
  cashbackProgression: 'Cashback-Fortschritt',
  recentActivity: 'Letzte Aktivität',
  stepsToComplete: 'Schritte zum Abschluss',

  daysLeftThisMonth: (d) => `Noch ${d} Tage diesen Monat`,
  maximumCashback: 'Maximaler Cashback!',
  keepSharing: (rate) => `Du verdienst ${rate}% — teile weiter, um Provisionen zu erhalten`,
  inviteFriendsTitle: 'Freunde einladen. Mehr verdienen.',
  permanentCashback: (bonus) => `+${bonus}% dauerhafter Cashback`,
  forEachFriend: 'für jeden Freund, den du empfiehlst',
  friendSpend: (rate) => `${rate}% der Ausgaben deines Freundes`,
  forDays: (days) => `für ${days} Tage`,
  forUnlimitedTime: 'ohne Zeitlimit',
  earnRewardsGeneric: 'Verdiene Belohnungen für jeden Freund, den du einlädst',
  inviteFriendsButton: 'Freunde einladen',

  cashbackFromDayOne: (rate) => `${rate}% Cashback ab Tag eins`,
  earnBackOnEveryPurchase: 'Sofort bei jedem Einkauf zurückverdienen',
  welcomeBonus: (amount, currency) => `${amount} ${currency} Willkommensbonus`,
  addedToBalance: 'Wird dem Guthaben gutgeschrieben, sobald sie sich qualifizieren',
  digitalLoyaltyCard: 'Digitale Treuekarte',
  savedToWallet: 'Sofort in Apple Wallet oder Google Wallet gespeichert',

  shareYourLinkStep: 'Teile deinen Link',
  friendSignsUp: 'Freund meldet sich an und fügt Wallet-Pass hinzu',
  onceComplete: 'Nach Abschluss erhältst du deine Belohnungen automatisch.',

  makesFirstPurchase: 'Tätigt den ersten Einkauf',
  completesFirstFullPayment: 'Schließt die erste vollständige Zahlung ab',
  spendsAmount: (amount) => `Gibt ${amount} aus`,
  completesQualifyingAction: 'Führt eine qualifizierende Aktion durch',

  copied: 'Kopiert!',

  maximumCashbackReached: 'Maximaler Cashback erreicht!',
  youveReferred: (n) => `Du hast ${n} Freund${n !== 1 ? 'e' : ''} empfohlen`,
  moreToReach: (n) => `Noch ${n}, um zu erreichen`,

  howToEarnMore: 'Wege, mehr zu verdienen',
  doFirstPurchase: 'Ersten Kauf tätigen',
  doFirstFullPayment: 'Erste vollständige Zahlung abschließen',
  doTotalSpend: (amount) => `${amount} Gesamtausgaben erreichen`,
  doReferralCount: (n) => `${n} Freund${n !== 1 ? 'e' : ''} empfehlen`,
  doDaysMember: (n) => `${n} Tag${n !== 1 ? 'e' : ''} Mitglied sein`,
  upgradeToRate: (rate) => `→ ${rate}% Cashback`,
  inviteAndBoost: (bonus) => `Freund einladen → +${bonus}% Cashback`,

  noActivityYet: 'Noch keine Aktivität',
  transactionLabels: {
    credit: 'Einkauf erfasst',
    debit: 'Guthaben eingelöst',
    adjustment: 'Guthabenanpassung',
    cashback: 'Cashback verdient',
    referral_commission: 'Empfehlungsbonus',
  },

  youveEarned: 'Du hast verdient',
  fromReferrals: (activated, pending) =>
    `aus ${activated} erfolgreiche${activated !== 1 ? 'n' : 'r'} Empfehlung${activated !== 1 ? 'en' : ''}${pending > 0 ? ` · ${pending} ausstehend` : ''}`,
  completedStatus: 'Abgeschlossen',
  pendingStatus: 'Ausstehend',
  expiredStatus: 'Abgelaufen',
  waitingForFirstVisit: 'Wartet auf ersten Besuch',

  earnedFromReferral: (amount) => `Du hast ${amount} durch diese Empfehlung verdient`,
  waitingForActivation: (name) => `Warte auf ${name}, die Aktivierung abzuschließen`,
  thisReferralExpired: 'Diese Empfehlung ist abgelaufen',
  signUp: 'Registrierung',
  addWalletPass: 'Wallet-Pass hinzufügen',
  referredTimeAgo: (time) => `Empfohlen ${time}`,
  activatedTimeAgo: (time) => `Aktiviert ${time}`,

  changePhoto: 'Foto ändern',

  justNow: 'gerade eben',
  minutesAgo: (m) => `vor ${m} Min.`,
  hoursAgo: (h) => `vor ${h} Std.`,
  daysAgo: (d) => `vor ${d}T`,
  monthsAgo: (mo) => `vor ${mo} Mon.`,
}

const translations: Record<string, LoyaltyTranslations> = { en, da, sv, nb, de }

export function getLoyaltyTranslations(lang: string): LoyaltyTranslations {
  return translations[lang] ?? translations.en
}
