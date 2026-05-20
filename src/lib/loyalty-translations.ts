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

// French — formal "vous" (commerce default for loyalty programs).
const fr: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Solde',

  shareMessage: (studio, rate, bonus, link) =>
    `Recevez ${rate}% de cashback${bonus > 0 ? ` + ${bonus} de bonus` : ''} chez ${studio} ! ${link}`,

  whatYourFriendGets: 'Ce que reçoit votre ami',
  howReferralsWork: 'Comment fonctionne le parrainage',
  shareYourLink: 'Partagez votre lien',
  cashbackProgression: 'Progression du cashback',
  recentActivity: 'Activité récente',
  stepsToComplete: 'Étapes à compléter',

  daysLeftThisMonth: (d) => `${d} jours restants ce mois-ci`,
  maximumCashback: 'Cashback maximum !',
  keepSharing: (rate) => `Vous gagnez ${rate}% — continuez à partager pour toucher des commissions`,
  inviteFriendsTitle: 'Invitez des amis. Gagnez plus.',
  permanentCashback: (bonus) => `+${bonus}% de cashback permanent`,
  forEachFriend: 'pour chaque ami parrainé',
  friendSpend: (rate) => `${rate}% des dépenses de votre ami`,
  forDays: (days) => `pendant ${days} jours`,
  forUnlimitedTime: 'sans limite de temps',
  earnRewardsGeneric: 'Gagnez des récompenses pour chaque ami invité',
  inviteFriendsButton: 'Inviter des amis',

  cashbackFromDayOne: (rate) => `${rate}% de cashback dès le premier jour`,
  earnBackOnEveryPurchase: 'Récupérez à chaque achat, dès maintenant',
  welcomeBonus: (amount, currency) => `${amount} ${currency} de bonus de bienvenue`,
  addedToBalance: 'Ajouté à leur solde dès leur qualification',
  digitalLoyaltyCard: 'Carte de fidélité numérique',
  savedToWallet: 'Enregistrée instantanément dans Apple Wallet ou Google Wallet',

  shareYourLinkStep: 'Partagez votre lien',
  friendSignsUp: 'L\'ami s\'inscrit et ajoute la carte au wallet',
  onceComplete: 'Une fois complété, vos récompenses arrivent automatiquement.',

  makesFirstPurchase: 'Effectue son premier achat',
  completesFirstFullPayment: 'Complète son premier paiement intégral',
  spendsAmount: (amount) => `Dépense ${amount}`,
  completesQualifyingAction: 'Effectue une action qualifiante',

  copied: 'Copié !',

  maximumCashbackReached: 'Cashback maximum atteint !',
  youveReferred: (n) => `Vous avez parrainé ${n} ami${n !== 1 ? 's' : ''}`,
  moreToReach: (n) => `${n} de plus pour atteindre`,

  howToEarnMore: 'Comment gagner plus',
  doFirstPurchase: 'Effectuez votre premier achat',
  doFirstFullPayment: 'Complétez votre premier paiement intégral',
  doTotalSpend: (amount) => `Atteignez ${amount} de dépenses totales`,
  doReferralCount: (n) => `Parrainez ${n} ami${n !== 1 ? 's' : ''}`,
  doDaysMember: (n) => `Soyez membre pendant ${n} jour${n !== 1 ? 's' : ''}`,
  upgradeToRate: (rate) => `→ ${rate}% de cashback`,
  inviteAndBoost: (bonus) => `Invitez un ami → +${bonus}% de cashback`,

  noActivityYet: 'Aucune activité pour le moment',
  transactionLabels: {
    credit: 'Achat enregistré',
    debit: 'Solde utilisé',
    adjustment: 'Ajustement du solde',
    cashback: 'Cashback gagné',
    referral_commission: 'Bonus de parrainage',
  },

  youveEarned: 'Vous avez gagné',
  fromReferrals: (activated, pending) =>
    `de ${activated} parrainage${activated !== 1 ? 's' : ''} réussi${activated !== 1 ? 's' : ''}${pending > 0 ? ` · ${pending} en attente` : ''}`,
  completedStatus: 'Complété',
  pendingStatus: 'En attente',
  expiredStatus: 'Expiré',
  waitingForFirstVisit: 'En attente de la première visite',

  earnedFromReferral: (amount) => `Vous avez gagné ${amount} grâce à ce parrainage`,
  waitingForActivation: (name) => `En attente que ${name} complète l'activation`,
  thisReferralExpired: 'Ce parrainage a expiré',
  signUp: 'Inscription',
  addWalletPass: 'Ajouter la carte wallet',
  referredTimeAgo: (time) => `Parrainé ${time}`,
  activatedTimeAgo: (time) => `Activé ${time}`,

  changePhoto: 'Changer la photo',

  justNow: 'à l\'instant',
  minutesAgo: (m) => `il y a ${m} min`,
  hoursAgo: (h) => `il y a ${h}h`,
  daysAgo: (d) => `il y a ${d}j`,
  monthsAgo: (mo) => `il y a ${mo} mois`,
}

// Spanish — informal "tú" (standard for loyalty/retail).
const es: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Saldo',

  shareMessage: (studio, rate, bonus, link) =>
    `¡Consigue ${rate}% de cashback${bonus > 0 ? ` + ${bonus} de bono` : ''} en ${studio}! ${link}`,

  whatYourFriendGets: 'Lo que recibe tu amigo',
  howReferralsWork: 'Cómo funciona',
  shareYourLink: 'Comparte tu enlace',
  cashbackProgression: 'Progresión de cashback',
  recentActivity: 'Actividad reciente',
  stepsToComplete: 'Pasos a completar',

  daysLeftThisMonth: (d) => `${d} días restantes este mes`,
  maximumCashback: '¡Cashback máximo!',
  keepSharing: (rate) => `Estás ganando ${rate}% — sigue compartiendo para conseguir comisiones`,
  inviteFriendsTitle: 'Invita a amigos. Gana más.',
  permanentCashback: (bonus) => `+${bonus}% de cashback permanente`,
  forEachFriend: 'por cada amigo que recomiendes',
  friendSpend: (rate) => `${rate}% de las compras de tu amigo`,
  forDays: (days) => `durante ${days} días`,
  forUnlimitedTime: 'sin límite de tiempo',
  earnRewardsGeneric: 'Gana recompensas por cada amigo que invites',
  inviteFriendsButton: 'Invitar amigos',

  cashbackFromDayOne: (rate) => `${rate}% de cashback desde el primer día`,
  earnBackOnEveryPurchase: 'Recupera en cada compra, desde el primer momento',
  welcomeBonus: (amount, currency) => `${amount} ${currency} de bono de bienvenida`,
  addedToBalance: 'Se añade a su saldo cuando se cualifican',
  digitalLoyaltyCard: 'Tarjeta de fidelidad digital',
  savedToWallet: 'Guardada al instante en Apple Wallet o Google Wallet',

  shareYourLinkStep: 'Comparte tu enlace',
  friendSignsUp: 'El amigo se registra y añade la tarjeta al wallet',
  onceComplete: 'Cuando se complete, recibirás tus recompensas automáticamente.',

  makesFirstPurchase: 'Hace su primera compra',
  completesFirstFullPayment: 'Completa su primer pago completo',
  spendsAmount: (amount) => `Gasta ${amount}`,
  completesQualifyingAction: 'Completa una acción cualificada',

  copied: '¡Copiado!',

  maximumCashbackReached: '¡Cashback máximo alcanzado!',
  youveReferred: (n) => `Has recomendado a ${n} amigo${n !== 1 ? 's' : ''}`,
  moreToReach: (n) => `${n} más para alcanzar`,

  howToEarnMore: 'Formas de ganar más',
  doFirstPurchase: 'Haz tu primera compra',
  doFirstFullPayment: 'Completa tu primer pago completo',
  doTotalSpend: (amount) => `Alcanza ${amount} en compras totales`,
  doReferralCount: (n) => `Recomienda a ${n} amigo${n !== 1 ? 's' : ''}`,
  doDaysMember: (n) => `Sé miembro durante ${n} día${n !== 1 ? 's' : ''}`,
  upgradeToRate: (rate) => `→ ${rate}% de cashback`,
  inviteAndBoost: (bonus) => `Invita a un amigo → +${bonus}% de cashback`,

  noActivityYet: 'Aún sin actividad',
  transactionLabels: {
    credit: 'Compra registrada',
    debit: 'Saldo canjeado',
    adjustment: 'Ajuste de saldo',
    cashback: 'Cashback ganado',
    referral_commission: 'Bono de recomendación',
  },

  youveEarned: 'Has ganado',
  fromReferrals: (activated, pending) =>
    `de ${activated} recomendación${activated !== 1 ? 'es' : ''} exitosa${activated !== 1 ? 's' : ''}${pending > 0 ? ` · ${pending} pendiente${pending !== 1 ? 's' : ''}` : ''}`,
  completedStatus: 'Completado',
  pendingStatus: 'Pendiente',
  expiredStatus: 'Caducado',
  waitingForFirstVisit: 'Esperando la primera visita',

  earnedFromReferral: (amount) => `Ganaste ${amount} con esta recomendación`,
  waitingForActivation: (name) => `Esperando a que ${name} complete la activación`,
  thisReferralExpired: 'Esta recomendación ha caducado',
  signUp: 'Registro',
  addWalletPass: 'Añadir tarjeta wallet',
  referredTimeAgo: (time) => `Recomendado ${time}`,
  activatedTimeAgo: (time) => `Activado ${time}`,

  changePhoto: 'Cambiar foto',

  justNow: 'ahora mismo',
  minutesAgo: (m) => `hace ${m} min`,
  hoursAgo: (h) => `hace ${h}h`,
  daysAgo: (d) => `hace ${d}d`,
  monthsAgo: (mo) => `hace ${mo} mes${mo !== 1 ? 'es' : ''}`,
}

// Dutch — informal "je" (loyalty default).
const nl: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Saldo',

  shareMessage: (studio, rate, bonus, link) =>
    `Krijg ${rate}% cashback${bonus > 0 ? ` + ${bonus} bonus` : ''} bij ${studio}! ${link}`,

  whatYourFriendGets: 'Wat je vriend krijgt',
  howReferralsWork: 'Zo werkt het',
  shareYourLink: 'Deel je link',
  cashbackProgression: 'Cashback-progressie',
  recentActivity: 'Recente activiteit',
  stepsToComplete: 'Te voltooien stappen',

  daysLeftThisMonth: (d) => `Nog ${d} dagen deze maand`,
  maximumCashback: 'Maximale cashback!',
  keepSharing: (rate) => `Je verdient ${rate}% — blijf delen om commissie te verdienen`,
  inviteFriendsTitle: 'Nodig vrienden uit. Verdien meer.',
  permanentCashback: (bonus) => `+${bonus}% permanente cashback`,
  forEachFriend: 'voor elke vriend die je uitnodigt',
  friendSpend: (rate) => `${rate}% van de aankopen van je vriend`,
  forDays: (days) => `${days} dagen lang`,
  forUnlimitedTime: 'zonder tijdslimiet',
  earnRewardsGeneric: 'Verdien beloningen voor elke vriend die je uitnodigt',
  inviteFriendsButton: 'Vrienden uitnodigen',

  cashbackFromDayOne: (rate) => `${rate}% cashback vanaf dag één`,
  earnBackOnEveryPurchase: 'Direct terugverdienen bij elke aankoop',
  welcomeBonus: (amount, currency) => `${amount} ${currency} welkomstbonus`,
  addedToBalance: 'Wordt aan hun saldo toegevoegd zodra ze zich kwalificeren',
  digitalLoyaltyCard: 'Digitale loyaliteitskaart',
  savedToWallet: 'Direct opgeslagen in Apple Wallet of Google Wallet',

  shareYourLinkStep: 'Deel je link',
  friendSignsUp: 'Vriend meldt zich aan en voegt de wallet-pas toe',
  onceComplete: 'Zodra dit voltooid is, ontvang je je beloningen automatisch.',

  makesFirstPurchase: 'Doet zijn/haar eerste aankoop',
  completesFirstFullPayment: 'Voltooit de eerste volledige betaling',
  spendsAmount: (amount) => `Besteedt ${amount}`,
  completesQualifyingAction: 'Voltooit een kwalificerende actie',

  copied: 'Gekopieerd!',

  maximumCashbackReached: 'Maximale cashback bereikt!',
  youveReferred: (n) => `Je hebt ${n} vriend${n !== 1 ? 'en' : ''} uitgenodigd`,
  moreToReach: (n) => `${n} meer om te bereiken`,

  howToEarnMore: 'Manieren om meer te verdienen',
  doFirstPurchase: 'Doe je eerste aankoop',
  doFirstFullPayment: 'Voltooi je eerste volledige betaling',
  doTotalSpend: (amount) => `Bereik ${amount} aan totale uitgaven`,
  doReferralCount: (n) => `Nodig ${n} vriend${n !== 1 ? 'en' : ''} uit`,
  doDaysMember: (n) => `Wees ${n} dag${n !== 1 ? 'en' : ''} lid`,
  upgradeToRate: (rate) => `→ ${rate}% cashback`,
  inviteAndBoost: (bonus) => `Nodig een vriend uit → +${bonus}% cashback`,

  noActivityYet: 'Nog geen activiteit',
  transactionLabels: {
    credit: 'Aankoop geregistreerd',
    debit: 'Saldo gebruikt',
    adjustment: 'Saldo-aanpassing',
    cashback: 'Cashback verdiend',
    referral_commission: 'Verwijzingsbonus',
  },

  youveEarned: 'Je hebt verdiend',
  fromReferrals: (activated, pending) =>
    `van ${activated} succesvolle verwijzing${activated !== 1 ? 'en' : ''}${pending > 0 ? ` · ${pending} in afwachting` : ''}`,
  completedStatus: 'Voltooid',
  pendingStatus: 'In afwachting',
  expiredStatus: 'Verlopen',
  waitingForFirstVisit: 'Wachten op eerste bezoek',

  earnedFromReferral: (amount) => `Je hebt ${amount} verdiend met deze verwijzing`,
  waitingForActivation: (name) => `Wachten tot ${name} de activering voltooit`,
  thisReferralExpired: 'Deze verwijzing is verlopen',
  signUp: 'Aanmelden',
  addWalletPass: 'Wallet-pas toevoegen',
  referredTimeAgo: (time) => `Uitgenodigd ${time}`,
  activatedTimeAgo: (time) => `Geactiveerd ${time}`,

  changePhoto: 'Foto wijzigen',

  justNow: 'zojuist',
  minutesAgo: (m) => `${m} min geleden`,
  hoursAgo: (h) => `${h}u geleden`,
  daysAgo: (d) => `${d}d geleden`,
  monthsAgo: (mo) => `${mo} mnd geleden`,
}

// Polish — informal "ty" / 2nd person verb forms.
const pl: LoyaltyTranslations = {
  cashback: 'Cashback',
  balance: 'Saldo',

  shareMessage: (studio, rate, bonus, link) =>
    `Odbierz ${rate}% cashbacku${bonus > 0 ? ` + ${bonus} bonusu` : ''} w ${studio}! ${link}`,

  whatYourFriendGets: 'Co dostanie Twój znajomy',
  howReferralsWork: 'Jak działają polecenia',
  shareYourLink: 'Udostępnij swój link',
  cashbackProgression: 'Postęp cashbacku',
  recentActivity: 'Ostatnia aktywność',
  stepsToComplete: 'Kroki do wykonania',

  daysLeftThisMonth: (d) => `${d} dni do końca miesiąca`,
  maximumCashback: 'Maksymalny cashback!',
  keepSharing: (rate) => `Zarabiasz ${rate}% — udostępniaj dalej, by zdobyć prowizje`,
  inviteFriendsTitle: 'Zapraszaj znajomych. Zarabiaj więcej.',
  permanentCashback: (bonus) => `+${bonus}% stałego cashbacku`,
  forEachFriend: 'za każdego poleconego znajomego',
  friendSpend: (rate) => `${rate}% wydatków Twojego znajomego`,
  forDays: (days) => `przez ${days} dni`,
  forUnlimitedTime: 'bez ograniczenia czasowego',
  earnRewardsGeneric: 'Zdobywaj nagrody za każdego zaproszonego znajomego',
  inviteFriendsButton: 'Zaproś znajomych',

  cashbackFromDayOne: (rate) => `${rate}% cashbacku od pierwszego dnia`,
  earnBackOnEveryPurchase: 'Odbieraj z każdego zakupu, od razu',
  welcomeBonus: (amount, currency) => `${amount} ${currency} bonusu powitalnego`,
  addedToBalance: 'Doliczane do salda po spełnieniu warunków',
  digitalLoyaltyCard: 'Cyfrowa karta lojalnościowa',
  savedToWallet: 'Natychmiast zapisana w Apple Wallet lub Google Wallet',

  shareYourLinkStep: 'Udostępnij swój link',
  friendSignsUp: 'Znajomy rejestruje się i dodaje kartę do wallet',
  onceComplete: 'Po zakończeniu nagrody trafią do Ciebie automatycznie.',

  makesFirstPurchase: 'Dokona pierwszego zakupu',
  completesFirstFullPayment: 'Dokończy pierwszą pełną płatność',
  spendsAmount: (amount) => `Wyda ${amount}`,
  completesQualifyingAction: 'Wykona kwalifikującą czynność',

  copied: 'Skopiowano!',

  maximumCashbackReached: 'Osiągnięto maksymalny cashback!',
  youveReferred: (n) => {
    if (n === 1) return 'Polecono 1 znajomego'
    return `Poleconych znajomych: ${n}`
  },
  moreToReach: (n) => `Jeszcze ${n}, aby osiągnąć`,

  howToEarnMore: 'Sposoby, by zarobić więcej',
  doFirstPurchase: 'Dokonaj pierwszego zakupu',
  doFirstFullPayment: 'Dokończ pierwszą pełną płatność',
  doTotalSpend: (amount) => `Osiągnij ${amount} łącznych wydatków`,
  doReferralCount: (n) => (n === 1 ? 'Poleć 1 znajomego' : `Poleć ${n} znajomych`),
  doDaysMember: (n) => `Bądź członkiem przez ${n} ${n === 1 ? 'dzień' : 'dni'}`,
  upgradeToRate: (rate) => `→ ${rate}% cashbacku`,
  inviteAndBoost: (bonus) => `Zaproś znajomego → +${bonus}% cashbacku`,

  noActivityYet: 'Brak aktywności',
  transactionLabels: {
    credit: 'Zarejestrowano zakup',
    debit: 'Wykorzystano saldo',
    adjustment: 'Korekta salda',
    cashback: 'Naliczony cashback',
    referral_commission: 'Bonus za polecenie',
  },

  youveEarned: 'Zarobiłeś',
  fromReferrals: (activated, pending) =>
    `z ${activated} ${activated === 1 ? 'udanego polecenia' : 'udanych poleceń'}${pending > 0 ? ` · ${pending} oczekujących` : ''}`,
  completedStatus: 'Zakończone',
  pendingStatus: 'Oczekuje',
  expiredStatus: 'Wygasło',
  waitingForFirstVisit: 'Oczekiwanie na pierwszą wizytę',

  earnedFromReferral: (amount) => `Zarobiłeś ${amount} z tego polecenia`,
  waitingForActivation: (name) => `Oczekiwanie na zakończenie aktywacji przez: ${name}`,
  thisReferralExpired: 'To polecenie wygasło',
  signUp: 'Rejestracja',
  addWalletPass: 'Dodaj kartę do wallet',
  referredTimeAgo: (time) => `Polecone ${time}`,
  activatedTimeAgo: (time) => `Aktywowane ${time}`,

  changePhoto: 'Zmień zdjęcie',

  justNow: 'przed chwilą',
  minutesAgo: (m) => `${m} min temu`,
  hoursAgo: (h) => `${h} godz. temu`,
  daysAgo: (d) => `${d} dni temu`,
  monthsAgo: (mo) => `${mo} mies. temu`,
}

const translations: Record<string, LoyaltyTranslations> = {
  en,
  da,
  sv,
  // ISO 639-1 `no` is Norwegian (macro); `nb` is Bokmål. The studio language
  // picker stores `no`, so register both as aliases for the same dictionary.
  no: nb,
  nb,
  de,
  fr,
  es,
  nl,
  pl,
}

export function getLoyaltyTranslations(lang: string): LoyaltyTranslations {
  return translations[lang?.toLowerCase()] ?? translations.en
}
