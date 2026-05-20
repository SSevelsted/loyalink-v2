/**
 * Translations for customer-facing transactional email templates.
 * Routed off the studio's language setting (en/da/sv/no/de/fr/es/nl/pl).
 *
 * Studio-operator emails (welcome, trial warnings, subscription, etc.) stay
 * English — those go to staff who picked English in the dashboard.
 */

export type EmailTranslations = {
  // Greeting & sign-off
  greeting: (name: string) => string
  signOffWith: (studio: string) => string

  // customer-welcome
  customerWelcome: {
    subject: (studio: string) => string
    intro: (studio: string) => string
    howItWorks: string
    bullet1: (rate: number) => string
    bullet2: (studio: string) => string
    bullet3: string
    currentBalance: (amount: string) => string
    yourTier: (tier: string) => string
    addPassBlurb: string
    addPassCta: string
    alreadyInWallet: string
    seeYouSoon: string
  }

  // pass-reminder
  passReminder: {
    subject: (studio: string) => string
    intro: (studio: string) => string
    missingOut: string
    bullet1: (rate: number) => string
    bullet2: string
    bullet3: string
    bullet4: string
    oneTap: string
    addCta: string
    linkExpiresShort: string
  }

  // pass-removed
  passRemoved: {
    subject: string
    intro: (studio: string) => string
    safeBalance: (amount: string) => string
    withCardYouGet: string
    bullet1: (rate: number) => string
    bullet2: string
    bullet3: string
    reAddCta: string
    expiresAndIgnore: string
  }

  // resend-pass-link
  resendPassLink: {
    subject: (studio: string) => string
    intro: (studio: string) => string
    addCta: string
    expires: string
  }

  // transaction-receipt
  transactionReceipt: {
    subjectEarned: (studio: string, amount: string) => string
    subjectReceipt: (studio: string) => string
    upgradeBanner: (tier: string, rate: number) => string
    breakdown: string
    rowPurchase: string
    rowBalanceUsed: string
    rowCharged: string
    rowCashback: (rate: number) => string
    rowYourBalance: string
    yourTier: (tier: string) => string
    spendMoreNudge: (amount: string, tier: string, rate: number) => string
    thanksFor: (studio: string) => string
  }

  // tier-upgrade
  tierUpgrade: {
    subject: (tier: string) => string
    intro: (tier: string, studio: string) => string
    whatItMeans: string
    bullet1: (rate: number, old: number) => string
    bullet2: string
    yourBalance: (amount: string) => string
    lifetimeEarned: (amount: string) => string
    thanksLoyal: string
  }

  // referral-reward
  referralReward: {
    subject: (amount: string) => string
    intro: (referred: string, studio: string, amount: string) => string
    updatedBalance: (amount: string) => string
    knowMore: (studio: string) => string
  }

  // win-back
  winBack: {
    subject: (amount: string, studio: string) => string
    intro: (studio: string, amount: string) => string
    boostNote: (boosted: number, normal: number, expiry: string) => string
    seeBalanceCta: string
  }
}

const en: EmailTranslations = {
  greeting: (n) => `Hey ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Welcome to ${s}`,
    intro: (s) => `You&rsquo;re in. Your <strong>${s}</strong> loyalty card is set up and ready.`,
    howItWorks: `Here&rsquo;s how it works:`,
    bullet1: (r) => `Every time you visit, you earn <strong>${r}%</strong> cashback`,
    bullet2: (s) => `Your cashback balance can only be spent at <strong>${s}</strong>`,
    bullet3: `The more you visit, the higher your tier and rewards`,
    currentBalance: (a) => `Your current balance: <strong>${a}</strong>`,
    yourTier: (t) => `Your tier: <strong>${t}</strong>`,
    addPassBlurb: `Add your loyalty card to your phone &mdash; it lives right in your Apple or Google Wallet. No app needed.`,
    addPassCta: 'Add to Wallet →',
    alreadyInWallet: `Your loyalty card is already in your wallet. You&rsquo;re all set.`,
    seeYouSoon: `See you soon,`,
  },

  passReminder: {
    subject: (s) => `Your ${s} card is waiting`,
    intro: (s) => `You signed up for <strong>${s}</strong>&rsquo;s loyalty program but haven&rsquo;t added the card to your wallet yet.`,
    missingOut: `Here&rsquo;s what you&rsquo;re missing out on:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback on every visit &mdash; automatically added to your balance`,
    bullet2: `Higher tiers with bigger rewards the more you visit`,
    bullet3: `Earn cashback when you refer friends`,
    bullet4: `Exclusive offers sent straight to your lock screen`,
    oneTap: `One tap and it&rsquo;s in your Apple or Google Wallet. No app needed.`,
    addCta: 'Add to Wallet →',
    linkExpiresShort: 'This link expires in 24 hours.',
  },

  passRemoved: {
    subject: 'Your balance is still safe',
    intro: (s) => `Looks like your <strong>${s}</strong> loyalty card was removed from your wallet.`,
    safeBalance: (a) => `No worries &mdash; your balance of <strong>${a}</strong> and all your rewards are still here. You can re-add the card anytime.`,
    withCardYouGet: `With your card in your wallet, you get:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback on every visit`,
    bullet2: `Balance updates and exclusive offers on your lock screen`,
    bullet3: `Cashback for referring friends`,
    reAddCta: 'Re-add to Wallet →',
    expiresAndIgnore: `This link expires in 24 hours. If you removed it on purpose, ignore this &mdash; your rewards aren&rsquo;t going anywhere.`,
  },

  resendPassLink: {
    subject: (s) => `Your ${s} loyalty card`,
    intro: (s) => `Here&rsquo;s your link to add your <strong>${s}</strong> loyalty card to your wallet.`,
    addCta: 'Add to Wallet →',
    expires: `This link expires in 24 hours. If you didn&rsquo;t request this, you can safely ignore it.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} earned`,
    subjectReceipt: (s) => `Your receipt from ${s}`,
    upgradeBanner: (tier, rate) => `🎉 You&rsquo;ve been upgraded to ${tier}! Your new cashback rate: ${rate}%.`,
    breakdown: `Here&rsquo;s your breakdown:`,
    rowPurchase: 'Purchase',
    rowBalanceUsed: 'Balance used',
    rowCharged: 'Charged',
    rowCashback: (r) => `Cashback earned (${r}%)`,
    rowYourBalance: 'Your balance',
    yourTier: (t) => `Your tier: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Spend <strong>${amount}</strong> more to unlock <strong>${tier}</strong> and earn <strong>${rate}%</strong> cashback.`,
    thanksFor: (s) => `Thanks for choosing <strong>${s}</strong>.`,
  },

  tierUpgrade: {
    subject: (tier) => `You just unlocked ${tier}`,
    intro: (tier, s) => `You&rsquo;ve been upgraded to <strong>${tier}</strong> at <strong>${s}</strong>.`,
    whatItMeans: `What this means:`,
    bullet1: (rate, old) => `Your cashback rate is now <strong>${rate}%</strong> (was ${old}%)`,
    bullet2: `Every visit earns you more`,
    yourBalance: (a) => `Your current balance: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Total earned lifetime: <strong>${a}</strong>`,
    thanksLoyal: `Thanks for being a loyal client. This is well-earned.`,
  },

  referralReward: {
    subject: (a) => `Your referral just earned you ${a}`,
    intro: (referred, s, a) => `Your friend <strong>${referred}</strong> just visited <strong>${s}</strong> &mdash; and you earned <strong>${a}</strong> in cashback for the referral.`,
    updatedBalance: (a) => `Your updated balance: <strong>${a}</strong>`,
    knowMore: (s) => `Know more people who&rsquo;d love <strong>${s}</strong>? Every referral that books earns you cashback.`,
  },

  winBack: {
    subject: (a, s) => `You have ${a} waiting at ${s}`,
    intro: (s, a) => `It&rsquo;s been a while since your last visit to <strong>${s}</strong>. Just a heads up &mdash; your cashback balance of <strong>${a}</strong> is still here, ready to use.`,
    boostNote: (boosted, normal, expiry) => `Right now, your cashback rate is temporarily boosted to <strong>${boosted}%</strong> (normally ${normal}%). This bonus expires on <strong>${expiry}</strong>.`,
    seeBalanceCta: 'See your balance →',
  },
}

const da: EmailTranslations = {
  greeting: (n) => `Hej ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Velkommen til ${s}`,
    intro: (s) => `Du er med. Dit loyalitetskort hos <strong>${s}</strong> er klar.`,
    howItWorks: `Sådan fungerer det:`,
    bullet1: (r) => `Hver gang du besøger, tjener du <strong>${r}%</strong> cashback`,
    bullet2: (s) => `Din cashback-saldo kan kun bruges hos <strong>${s}</strong>`,
    bullet3: `Jo mere du besøger, jo højere niveau og belønninger`,
    currentBalance: (a) => `Din nuværende saldo: <strong>${a}</strong>`,
    yourTier: (t) => `Dit niveau: <strong>${t}</strong>`,
    addPassBlurb: `Tilføj dit loyalitetskort til din telefon &mdash; det bor i Apple eller Google Wallet. Ingen app nødvendig.`,
    addPassCta: 'Tilføj til Wallet →',
    alreadyInWallet: `Dit loyalitetskort er allerede i din wallet. Du er klar.`,
    seeYouSoon: `Vi ses snart,`,
  },

  passReminder: {
    subject: (s) => `Dit ${s}-kort venter`,
    intro: (s) => `Du tilmeldte dig <strong>${s}</strong>&rsquo;s loyalitetsprogram, men har endnu ikke tilføjet kortet til din wallet.`,
    missingOut: `Her er hvad du går glip af:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback ved hvert besøg &mdash; lægges automatisk til din saldo`,
    bullet2: `Højere niveauer med større belønninger jo mere du besøger`,
    bullet3: `Tjen cashback når du inviterer venner`,
    bullet4: `Eksklusive tilbud sendt direkte til din låseskærm`,
    oneTap: `Ét tryk og det er i din Apple eller Google Wallet. Ingen app nødvendig.`,
    addCta: 'Tilføj til Wallet →',
    linkExpiresShort: 'Dette link udløber om 24 timer.',
  },

  passRemoved: {
    subject: 'Din saldo er stadig sikker',
    intro: (s) => `Det ser ud til, at dit loyalitetskort hos <strong>${s}</strong> blev fjernet fra din wallet.`,
    safeBalance: (a) => `Ingen panik &mdash; din saldo på <strong>${a}</strong> og alle dine belønninger er her stadig. Du kan tilføje kortet igen når som helst.`,
    withCardYouGet: `Med dit kort i din wallet får du:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback ved hvert besøg`,
    bullet2: `Saldoopdateringer og eksklusive tilbud på din låseskærm`,
    bullet3: `Cashback for at invitere venner`,
    reAddCta: 'Tilføj igen til Wallet →',
    expiresAndIgnore: `Dette link udløber om 24 timer. Hvis du fjernede det med vilje, så ignorér denne mail &mdash; dine belønninger forsvinder ikke.`,
  },

  resendPassLink: {
    subject: (s) => `Dit ${s}-loyalitetskort`,
    intro: (s) => `Her er dit link til at tilføje dit loyalitetskort hos <strong>${s}</strong> til din wallet.`,
    addCta: 'Tilføj til Wallet →',
    expires: `Dette link udløber om 24 timer. Hvis du ikke har anmodet om dette, kan du roligt ignorere det.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} optjent`,
    subjectReceipt: (s) => `Din kvittering fra ${s}`,
    upgradeBanner: (tier, rate) => `🎉 Du er opgraderet til ${tier}! Din nye cashback-sats: ${rate}%.`,
    breakdown: `Her er din oversigt:`,
    rowPurchase: 'Køb',
    rowBalanceUsed: 'Saldo brugt',
    rowCharged: 'Opkrævet',
    rowCashback: (r) => `Cashback optjent (${r}%)`,
    rowYourBalance: 'Din saldo',
    yourTier: (t) => `Dit niveau: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Brug <strong>${amount}</strong> mere for at låse <strong>${tier}</strong> op og tjene <strong>${rate}%</strong> cashback.`,
    thanksFor: (s) => `Tak fordi du valgte <strong>${s}</strong>.`,
  },

  tierUpgrade: {
    subject: (tier) => `Du har lige låst ${tier} op`,
    intro: (tier, s) => `Du er opgraderet til <strong>${tier}</strong> hos <strong>${s}</strong>.`,
    whatItMeans: `Hvad det betyder:`,
    bullet1: (rate, old) => `Din cashback-sats er nu <strong>${rate}%</strong> (var ${old}%)`,
    bullet2: `Hvert besøg giver dig mere`,
    yourBalance: (a) => `Din nuværende saldo: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Samlet optjent: <strong>${a}</strong>`,
    thanksLoyal: `Tak fordi du er en loyal kunde. Det er velfortjent.`,
  },

  referralReward: {
    subject: (a) => `Din henvisning har lige tjent dig ${a}`,
    intro: (referred, s, a) => `Din ven <strong>${referred}</strong> har lige besøgt <strong>${s}</strong> &mdash; og du tjente <strong>${a}</strong> i cashback for henvisningen.`,
    updatedBalance: (a) => `Din opdaterede saldo: <strong>${a}</strong>`,
    knowMore: (s) => `Kender du flere, der vil elske <strong>${s}</strong>? Hver henvisning der booker giver dig cashback.`,
  },

  winBack: {
    subject: (a, s) => `Du har ${a} ventende hos ${s}`,
    intro: (s, a) => `Det er et stykke tid siden dit sidste besøg hos <strong>${s}</strong>. Lige en lille reminder &mdash; din cashback-saldo på <strong>${a}</strong> er her stadig, klar til brug.`,
    boostNote: (boosted, normal, expiry) => `Lige nu er din cashback-sats midlertidigt boostet til <strong>${boosted}%</strong> (normalt ${normal}%). Denne bonus udløber <strong>${expiry}</strong>.`,
    seeBalanceCta: 'Se din saldo →',
  },
}

const sv: EmailTranslations = {
  greeting: (n) => `Hej ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Välkommen till ${s}`,
    intro: (s) => `Du är med. Ditt lojalitetskort hos <strong>${s}</strong> är redo.`,
    howItWorks: `Så här fungerar det:`,
    bullet1: (r) => `Varje gång du besöker tjänar du <strong>${r}%</strong> cashback`,
    bullet2: (s) => `Ditt cashback-saldo kan bara användas hos <strong>${s}</strong>`,
    bullet3: `Ju mer du besöker, desto högre nivå och belöningar`,
    currentBalance: (a) => `Ditt nuvarande saldo: <strong>${a}</strong>`,
    yourTier: (t) => `Din nivå: <strong>${t}</strong>`,
    addPassBlurb: `Lägg till ditt lojalitetskort i telefonen &mdash; det finns i Apple eller Google Wallet. Ingen app behövs.`,
    addPassCta: 'Lägg till i Wallet →',
    alreadyInWallet: `Ditt lojalitetskort finns redan i din wallet. Du är klar.`,
    seeYouSoon: `Vi ses snart,`,
  },

  passReminder: {
    subject: (s) => `Ditt ${s}-kort väntar`,
    intro: (s) => `Du registrerade dig för <strong>${s}</strong>&rsquo;s lojalitetsprogram men har inte lagt till kortet i din wallet än.`,
    missingOut: `Det här går du miste om:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback vid varje besök &mdash; automatiskt tillagt i ditt saldo`,
    bullet2: `Högre nivåer med större belöningar ju mer du besöker`,
    bullet3: `Tjäna cashback när du bjuder in vänner`,
    bullet4: `Exklusiva erbjudanden direkt på din låsskärm`,
    oneTap: `Ett tryck och det finns i din Apple eller Google Wallet. Ingen app behövs.`,
    addCta: 'Lägg till i Wallet →',
    linkExpiresShort: 'Den här länken upphör om 24 timmar.',
  },

  passRemoved: {
    subject: 'Ditt saldo är fortfarande tryggt',
    intro: (s) => `Det verkar som att ditt lojalitetskort hos <strong>${s}</strong> togs bort från din wallet.`,
    safeBalance: (a) => `Inga problem &mdash; ditt saldo på <strong>${a}</strong> och alla dina belöningar finns kvar. Du kan lägga till kortet igen när som helst.`,
    withCardYouGet: `Med ditt kort i din wallet får du:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback vid varje besök`,
    bullet2: `Saldouppdateringar och exklusiva erbjudanden på din låsskärm`,
    bullet3: `Cashback för att bjuda in vänner`,
    reAddCta: 'Lägg till igen i Wallet →',
    expiresAndIgnore: `Den här länken upphör om 24 timmar. Om du tog bort det med flit, ignorera detta &mdash; dina belöningar försvinner inte.`,
  },

  resendPassLink: {
    subject: (s) => `Ditt ${s}-lojalitetskort`,
    intro: (s) => `Här är din länk för att lägga till ditt lojalitetskort hos <strong>${s}</strong> i din wallet.`,
    addCta: 'Lägg till i Wallet →',
    expires: `Den här länken upphör om 24 timmar. Om du inte begärde detta kan du ignorera det.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} intjänat`,
    subjectReceipt: (s) => `Ditt kvitto från ${s}`,
    upgradeBanner: (tier, rate) => `🎉 Du har uppgraderats till ${tier}! Din nya cashback-sats: ${rate}%.`,
    breakdown: `Här är din sammanställning:`,
    rowPurchase: 'Köp',
    rowBalanceUsed: 'Saldo använt',
    rowCharged: 'Debiterat',
    rowCashback: (r) => `Cashback intjänat (${r}%)`,
    rowYourBalance: 'Ditt saldo',
    yourTier: (t) => `Din nivå: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Spendera <strong>${amount}</strong> mer för att låsa upp <strong>${tier}</strong> och tjäna <strong>${rate}%</strong> cashback.`,
    thanksFor: (s) => `Tack för att du valde <strong>${s}</strong>.`,
  },

  tierUpgrade: {
    subject: (tier) => `Du har precis låst upp ${tier}`,
    intro: (tier, s) => `Du har uppgraderats till <strong>${tier}</strong> hos <strong>${s}</strong>.`,
    whatItMeans: `Vad det betyder:`,
    bullet1: (rate, old) => `Din cashback-sats är nu <strong>${rate}%</strong> (var ${old}%)`,
    bullet2: `Varje besök ger dig mer`,
    yourBalance: (a) => `Ditt nuvarande saldo: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Totalt intjänat: <strong>${a}</strong>`,
    thanksLoyal: `Tack för att du är en lojal kund. Det är välförtjänt.`,
  },

  referralReward: {
    subject: (a) => `Din hänvisning gav dig precis ${a}`,
    intro: (referred, s, a) => `Din vän <strong>${referred}</strong> besökte just <strong>${s}</strong> &mdash; och du tjänade <strong>${a}</strong> i cashback för hänvisningen.`,
    updatedBalance: (a) => `Ditt uppdaterade saldo: <strong>${a}</strong>`,
    knowMore: (s) => `Känner du fler som skulle gilla <strong>${s}</strong>? Varje hänvisning som bokar ger dig cashback.`,
  },

  winBack: {
    subject: (a, s) => `Du har ${a} som väntar hos ${s}`,
    intro: (s, a) => `Det var ett tag sedan ditt senaste besök hos <strong>${s}</strong>. Bara en påminnelse &mdash; ditt cashback-saldo på <strong>${a}</strong> finns kvar, redo att användas.`,
    boostNote: (boosted, normal, expiry) => `Just nu är din cashback-sats tillfälligt boostad till <strong>${boosted}%</strong> (normalt ${normal}%). Denna bonus upphör <strong>${expiry}</strong>.`,
    seeBalanceCta: 'Se ditt saldo →',
  },
}

const nb: EmailTranslations = {
  greeting: (n) => `Hei ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Velkommen til ${s}`,
    intro: (s) => `Du er med. Lojalitetskortet ditt hos <strong>${s}</strong> er klart.`,
    howItWorks: `Slik fungerer det:`,
    bullet1: (r) => `Hver gang du besøker, tjener du <strong>${r}%</strong> cashback`,
    bullet2: (s) => `Cashback-saldoen din kan kun brukes hos <strong>${s}</strong>`,
    bullet3: `Jo mer du besøker, jo høyere nivå og belønninger`,
    currentBalance: (a) => `Din nåværende saldo: <strong>${a}</strong>`,
    yourTier: (t) => `Ditt nivå: <strong>${t}</strong>`,
    addPassBlurb: `Legg til lojalitetskortet på telefonen &mdash; det bor i Apple eller Google Wallet. Ingen app nødvendig.`,
    addPassCta: 'Legg til i Wallet →',
    alreadyInWallet: `Lojalitetskortet ditt er allerede i wallet. Du er klar.`,
    seeYouSoon: `Vi ses snart,`,
  },

  passReminder: {
    subject: (s) => `${s}-kortet ditt venter`,
    intro: (s) => `Du registrerte deg for <strong>${s}</strong>&rsquo;s lojalitetsprogram, men har ikke lagt til kortet i wallet ennå.`,
    missingOut: `Her er hva du går glipp av:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback ved hvert besøk &mdash; legges automatisk til saldoen`,
    bullet2: `Høyere nivåer med større belønninger jo mer du besøker`,
    bullet3: `Tjen cashback når du inviterer venner`,
    bullet4: `Eksklusive tilbud direkte på låseskjermen`,
    oneTap: `Ett trykk og det er i Apple eller Google Wallet. Ingen app nødvendig.`,
    addCta: 'Legg til i Wallet →',
    linkExpiresShort: 'Denne lenken utløper om 24 timer.',
  },

  passRemoved: {
    subject: 'Saldoen din er fortsatt trygg',
    intro: (s) => `Det ser ut til at lojalitetskortet ditt hos <strong>${s}</strong> ble fjernet fra wallet.`,
    safeBalance: (a) => `Ingen panikk &mdash; saldoen din på <strong>${a}</strong> og alle belønningene er her fortsatt. Du kan legge til kortet igjen når som helst.`,
    withCardYouGet: `Med kortet i wallet får du:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback ved hvert besøk`,
    bullet2: `Saldooppdateringer og eksklusive tilbud på låseskjermen`,
    bullet3: `Cashback for å invitere venner`,
    reAddCta: 'Legg til igjen i Wallet →',
    expiresAndIgnore: `Denne lenken utløper om 24 timer. Hvis du fjernet det med vilje, ignorer denne &mdash; belønningene dine blir ikke borte.`,
  },

  resendPassLink: {
    subject: (s) => `${s}-lojalitetskortet ditt`,
    intro: (s) => `Her er lenken for å legge til lojalitetskortet ditt hos <strong>${s}</strong> i wallet.`,
    addCta: 'Legg til i Wallet →',
    expires: `Denne lenken utløper om 24 timer. Hvis du ikke ba om dette, kan du trygt ignorere det.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} opptjent`,
    subjectReceipt: (s) => `Kvitteringen din fra ${s}`,
    upgradeBanner: (tier, rate) => `🎉 Du er oppgradert til ${tier}! Ny cashback-sats: ${rate}%.`,
    breakdown: `Her er oversikten:`,
    rowPurchase: 'Kjøp',
    rowBalanceUsed: 'Saldo brukt',
    rowCharged: 'Belastet',
    rowCashback: (r) => `Cashback opptjent (${r}%)`,
    rowYourBalance: 'Saldoen din',
    yourTier: (t) => `Ditt nivå: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Bruk <strong>${amount}</strong> mer for å låse opp <strong>${tier}</strong> og tjene <strong>${rate}%</strong> cashback.`,
    thanksFor: (s) => `Takk for at du valgte <strong>${s}</strong>.`,
  },

  tierUpgrade: {
    subject: (tier) => `Du har akkurat låst opp ${tier}`,
    intro: (tier, s) => `Du er oppgradert til <strong>${tier}</strong> hos <strong>${s}</strong>.`,
    whatItMeans: `Hva det betyr:`,
    bullet1: (rate, old) => `Cashback-satsen din er nå <strong>${rate}%</strong> (var ${old}%)`,
    bullet2: `Hvert besøk gir deg mer`,
    yourBalance: (a) => `Din nåværende saldo: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Totalt opptjent: <strong>${a}</strong>`,
    thanksLoyal: `Takk for at du er en lojal kunde. Det er velfortjent.`,
  },

  referralReward: {
    subject: (a) => `Henvisningen din ga deg akkurat ${a}`,
    intro: (referred, s, a) => `Vennen din <strong>${referred}</strong> besøkte nettopp <strong>${s}</strong> &mdash; og du tjente <strong>${a}</strong> i cashback for henvisningen.`,
    updatedBalance: (a) => `Din oppdaterte saldo: <strong>${a}</strong>`,
    knowMore: (s) => `Kjenner du flere som ville like <strong>${s}</strong>? Hver henvisning som bestiller gir deg cashback.`,
  },

  winBack: {
    subject: (a, s) => `Du har ${a} ventende hos ${s}`,
    intro: (s, a) => `Det er en stund siden ditt siste besøk hos <strong>${s}</strong>. Bare en påminnelse &mdash; cashback-saldoen din på <strong>${a}</strong> er her fortsatt, klar til bruk.`,
    boostNote: (boosted, normal, expiry) => `Akkurat nå er cashback-satsen din midlertidig boostet til <strong>${boosted}%</strong> (normalt ${normal}%). Denne bonusen utløper <strong>${expiry}</strong>.`,
    seeBalanceCta: 'Se saldoen din →',
  },
}

const de: EmailTranslations = {
  greeting: (n) => `Hallo ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Willkommen bei ${s}`,
    intro: (s) => `Du bist dabei. Deine Treuekarte bei <strong>${s}</strong> ist eingerichtet und bereit.`,
    howItWorks: `So funktioniert es:`,
    bullet1: (r) => `Jedes Mal, wenn du vorbeischaust, verdienst du <strong>${r}%</strong> Cashback`,
    bullet2: (s) => `Dein Cashback-Guthaben kann nur bei <strong>${s}</strong> ausgegeben werden`,
    bullet3: `Je öfter du kommst, desto höher dein Status und deine Belohnungen`,
    currentBalance: (a) => `Dein aktuelles Guthaben: <strong>${a}</strong>`,
    yourTier: (t) => `Dein Status: <strong>${t}</strong>`,
    addPassBlurb: `Füge deine Treuekarte zu deinem Handy hinzu &mdash; sie lebt direkt in Apple oder Google Wallet. Keine App nötig.`,
    addPassCta: 'Zu Wallet hinzufügen →',
    alreadyInWallet: `Deine Treuekarte ist bereits in deiner Wallet. Du bist startklar.`,
    seeYouSoon: `Bis bald,`,
  },

  passReminder: {
    subject: (s) => `Deine ${s}-Karte wartet`,
    intro: (s) => `Du hast dich für das Treueprogramm von <strong>${s}</strong> angemeldet, aber die Karte noch nicht zu deiner Wallet hinzugefügt.`,
    missingOut: `Das verpasst du:`,
    bullet1: (r) => `<strong>${r}%</strong> Cashback bei jedem Besuch &mdash; automatisch deinem Guthaben gutgeschrieben`,
    bullet2: `Höhere Stufen mit größeren Belohnungen, je öfter du kommst`,
    bullet3: `Cashback, wenn du Freunde empfiehlst`,
    bullet4: `Exklusive Angebote direkt auf deinem Sperrbildschirm`,
    oneTap: `Ein Tipp und sie ist in deiner Apple oder Google Wallet. Keine App nötig.`,
    addCta: 'Zu Wallet hinzufügen →',
    linkExpiresShort: 'Dieser Link läuft in 24 Stunden ab.',
  },

  passRemoved: {
    subject: 'Dein Guthaben ist weiterhin sicher',
    intro: (s) => `Es sieht so aus, als wäre deine Treuekarte von <strong>${s}</strong> aus deiner Wallet entfernt worden.`,
    safeBalance: (a) => `Keine Sorge &mdash; dein Guthaben von <strong>${a}</strong> und alle deine Belohnungen sind noch da. Du kannst die Karte jederzeit wieder hinzufügen.`,
    withCardYouGet: `Mit deiner Karte in der Wallet bekommst du:`,
    bullet1: (r) => `<strong>${r}%</strong> Cashback bei jedem Besuch`,
    bullet2: `Guthaben-Updates und exklusive Angebote auf deinem Sperrbildschirm`,
    bullet3: `Cashback für Empfehlungen`,
    reAddCta: 'Wieder zu Wallet hinzufügen →',
    expiresAndIgnore: `Dieser Link läuft in 24 Stunden ab. Falls du sie absichtlich entfernt hast, ignoriere diese E-Mail &mdash; deine Belohnungen gehen nicht verloren.`,
  },

  resendPassLink: {
    subject: (s) => `Deine ${s}-Treuekarte`,
    intro: (s) => `Hier ist dein Link, um deine Treuekarte von <strong>${s}</strong> zu deiner Wallet hinzuzufügen.`,
    addCta: 'Zu Wallet hinzufügen →',
    expires: `Dieser Link läuft in 24 Stunden ab. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} verdient`,
    subjectReceipt: (s) => `Deine Quittung von ${s}`,
    upgradeBanner: (tier, rate) => `🎉 Du wurdest zu ${tier} befördert! Deine neue Cashback-Rate: ${rate}%.`,
    breakdown: `Hier ist deine Aufstellung:`,
    rowPurchase: 'Einkauf',
    rowBalanceUsed: 'Guthaben verwendet',
    rowCharged: 'Berechnet',
    rowCashback: (r) => `Cashback verdient (${r}%)`,
    rowYourBalance: 'Dein Guthaben',
    yourTier: (t) => `Dein Status: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Gib <strong>${amount}</strong> mehr aus, um <strong>${tier}</strong> freizuschalten und <strong>${rate}%</strong> Cashback zu verdienen.`,
    thanksFor: (s) => `Danke, dass du dich für <strong>${s}</strong> entschieden hast.`,
  },

  tierUpgrade: {
    subject: (tier) => `Du hast gerade ${tier} freigeschaltet`,
    intro: (tier, s) => `Du wurdest zu <strong>${tier}</strong> bei <strong>${s}</strong> befördert.`,
    whatItMeans: `Was das bedeutet:`,
    bullet1: (rate, old) => `Deine Cashback-Rate ist jetzt <strong>${rate}%</strong> (vorher ${old}%)`,
    bullet2: `Jeder Besuch bringt dir mehr`,
    yourBalance: (a) => `Dein aktuelles Guthaben: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Insgesamt verdient: <strong>${a}</strong>`,
    thanksLoyal: `Danke, dass du ein treuer Kunde bist. Wohlverdient.`,
  },

  referralReward: {
    subject: (a) => `Deine Empfehlung hat dir gerade ${a} eingebracht`,
    intro: (referred, s, a) => `Deine Freundin/dein Freund <strong>${referred}</strong> war gerade bei <strong>${s}</strong> &mdash; und du hast <strong>${a}</strong> Cashback für die Empfehlung verdient.`,
    updatedBalance: (a) => `Dein aktualisiertes Guthaben: <strong>${a}</strong>`,
    knowMore: (s) => `Kennst du noch mehr Leute, die <strong>${s}</strong> lieben würden? Jede Empfehlung, die bucht, bringt dir Cashback.`,
  },

  winBack: {
    subject: (a, s) => `Du hast ${a} bei ${s} warten`,
    intro: (s, a) => `Es ist schon eine Weile her seit deinem letzten Besuch bei <strong>${s}</strong>. Nur ein kurzer Hinweis &mdash; dein Cashback-Guthaben von <strong>${a}</strong> ist noch da und einsatzbereit.`,
    boostNote: (boosted, normal, expiry) => `Im Moment ist deine Cashback-Rate vorübergehend auf <strong>${boosted}%</strong> erhöht (normalerweise ${normal}%). Dieser Bonus läuft am <strong>${expiry}</strong> ab.`,
    seeBalanceCta: 'Dein Guthaben ansehen →',
  },
}

const fr: EmailTranslations = {
  greeting: (n) => `Bonjour ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Bienvenue chez ${s}`,
    intro: (s) => `Vous y êtes. Votre carte de fidélité chez <strong>${s}</strong> est configurée et prête.`,
    howItWorks: `Voici comment ça fonctionne :`,
    bullet1: (r) => `À chaque visite, vous gagnez <strong>${r}%</strong> de cashback`,
    bullet2: (s) => `Votre solde de cashback ne peut être dépensé que chez <strong>${s}</strong>`,
    bullet3: `Plus vous venez, plus votre niveau et vos récompenses augmentent`,
    currentBalance: (a) => `Votre solde actuel : <strong>${a}</strong>`,
    yourTier: (t) => `Votre niveau : <strong>${t}</strong>`,
    addPassBlurb: `Ajoutez votre carte de fidélité à votre téléphone &mdash; elle vit dans Apple ou Google Wallet. Aucune appli requise.`,
    addPassCta: 'Ajouter à Wallet →',
    alreadyInWallet: `Votre carte de fidélité est déjà dans votre wallet. Tout est prêt.`,
    seeYouSoon: `À bientôt,`,
  },

  passReminder: {
    subject: (s) => `Votre carte ${s} vous attend`,
    intro: (s) => `Vous vous êtes inscrit au programme de fidélité de <strong>${s}</strong>, mais vous n'avez pas encore ajouté la carte à votre wallet.`,
    missingOut: `Voici ce que vous manquez :`,
    bullet1: (r) => `<strong>${r}%</strong> de cashback à chaque visite &mdash; ajouté automatiquement à votre solde`,
    bullet2: `Des niveaux supérieurs avec de plus grandes récompenses plus vous venez`,
    bullet3: `Gagnez du cashback en parrainant des amis`,
    bullet4: `Offres exclusives envoyées directement sur votre écran de verrouillage`,
    oneTap: `Une seule touche et c'est dans votre Apple ou Google Wallet. Aucune appli requise.`,
    addCta: 'Ajouter à Wallet →',
    linkExpiresShort: 'Ce lien expire dans 24 heures.',
  },

  passRemoved: {
    subject: 'Votre solde est toujours en sécurité',
    intro: (s) => `Il semble que votre carte de fidélité <strong>${s}</strong> ait été supprimée de votre wallet.`,
    safeBalance: (a) => `Pas d'inquiétude &mdash; votre solde de <strong>${a}</strong> et toutes vos récompenses sont toujours là. Vous pouvez réajouter la carte à tout moment.`,
    withCardYouGet: `Avec votre carte dans votre wallet, vous obtenez :`,
    bullet1: (r) => `<strong>${r}%</strong> de cashback à chaque visite`,
    bullet2: `Mises à jour du solde et offres exclusives sur votre écran de verrouillage`,
    bullet3: `Du cashback en parrainant des amis`,
    reAddCta: 'Réajouter à Wallet →',
    expiresAndIgnore: `Ce lien expire dans 24 heures. Si vous l'avez supprimée exprès, ignorez cet e-mail &mdash; vos récompenses ne partent nulle part.`,
  },

  resendPassLink: {
    subject: (s) => `Votre carte de fidélité ${s}`,
    intro: (s) => `Voici votre lien pour ajouter votre carte de fidélité <strong>${s}</strong> à votre wallet.`,
    addCta: 'Ajouter à Wallet →',
    expires: `Ce lien expire dans 24 heures. Si vous n'avez pas fait cette demande, vous pouvez ignorer cet e-mail.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} gagné`,
    subjectReceipt: (s) => `Votre reçu de ${s}`,
    upgradeBanner: (tier, rate) => `🎉 Vous êtes passé au niveau ${tier} ! Votre nouveau taux de cashback : ${rate}%.`,
    breakdown: `Voici le détail :`,
    rowPurchase: 'Achat',
    rowBalanceUsed: 'Solde utilisé',
    rowCharged: 'Facturé',
    rowCashback: (r) => `Cashback gagné (${r}%)`,
    rowYourBalance: 'Votre solde',
    yourTier: (t) => `Votre niveau : <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Dépensez <strong>${amount}</strong> de plus pour débloquer <strong>${tier}</strong> et gagner <strong>${rate}%</strong> de cashback.`,
    thanksFor: (s) => `Merci d'avoir choisi <strong>${s}</strong>.`,
  },

  tierUpgrade: {
    subject: (tier) => `Vous venez de débloquer ${tier}`,
    intro: (tier, s) => `Vous êtes passé au niveau <strong>${tier}</strong> chez <strong>${s}</strong>.`,
    whatItMeans: `Ce que cela signifie :`,
    bullet1: (rate, old) => `Votre taux de cashback est maintenant <strong>${rate}%</strong> (était ${old}%)`,
    bullet2: `Chaque visite vous rapporte plus`,
    yourBalance: (a) => `Votre solde actuel : <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Total gagné : <strong>${a}</strong>`,
    thanksLoyal: `Merci d'être un client fidèle. C'est bien mérité.`,
  },

  referralReward: {
    subject: (a) => `Votre parrainage vient de vous rapporter ${a}`,
    intro: (referred, s, a) => `Votre ami <strong>${referred}</strong> vient de visiter <strong>${s}</strong> &mdash; et vous avez gagné <strong>${a}</strong> de cashback pour le parrainage.`,
    updatedBalance: (a) => `Votre solde mis à jour : <strong>${a}</strong>`,
    knowMore: (s) => `Vous connaissez d'autres personnes qui aimeraient <strong>${s}</strong> ? Chaque parrainage qui réserve vous rapporte du cashback.`,
  },

  winBack: {
    subject: (a, s) => `Vous avez ${a} qui vous attend chez ${s}`,
    intro: (s, a) => `Cela fait un moment depuis votre dernière visite chez <strong>${s}</strong>. Petit rappel &mdash; votre solde de cashback de <strong>${a}</strong> est toujours là, prêt à être utilisé.`,
    boostNote: (boosted, normal, expiry) => `En ce moment, votre taux de cashback est temporairement boosté à <strong>${boosted}%</strong> (normalement ${normal}%). Ce bonus expire le <strong>${expiry}</strong>.`,
    seeBalanceCta: 'Voir votre solde →',
  },
}

const es: EmailTranslations = {
  greeting: (n) => `Hola ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Bienvenido a ${s}`,
    intro: (s) => `Ya estás dentro. Tu tarjeta de fidelidad en <strong>${s}</strong> está lista.`,
    howItWorks: `Así funciona:`,
    bullet1: (r) => `Cada vez que vienes, ganas <strong>${r}%</strong> de cashback`,
    bullet2: (s) => `Tu saldo de cashback solo se puede gastar en <strong>${s}</strong>`,
    bullet3: `Cuanto más vienes, más alto tu nivel y mejores las recompensas`,
    currentBalance: (a) => `Tu saldo actual: <strong>${a}</strong>`,
    yourTier: (t) => `Tu nivel: <strong>${t}</strong>`,
    addPassBlurb: `Añade tu tarjeta de fidelidad al móvil &mdash; vive en Apple o Google Wallet. Sin app.`,
    addPassCta: 'Añadir a Wallet →',
    alreadyInWallet: `Tu tarjeta de fidelidad ya está en tu wallet. Listo.`,
    seeYouSoon: `Hasta pronto,`,
  },

  passReminder: {
    subject: (s) => `Tu tarjeta de ${s} te espera`,
    intro: (s) => `Te registraste en el programa de fidelidad de <strong>${s}</strong> pero aún no has añadido la tarjeta a tu wallet.`,
    missingOut: `Esto es lo que te estás perdiendo:`,
    bullet1: (r) => `<strong>${r}%</strong> de cashback en cada visita &mdash; añadido automáticamente a tu saldo`,
    bullet2: `Niveles superiores con mejores recompensas cuanto más vienes`,
    bullet3: `Gana cashback cuando invitas a amigos`,
    bullet4: `Ofertas exclusivas directamente en tu pantalla de bloqueo`,
    oneTap: `Un toque y está en tu Apple o Google Wallet. Sin app.`,
    addCta: 'Añadir a Wallet →',
    linkExpiresShort: 'Este enlace caduca en 24 horas.',
  },

  passRemoved: {
    subject: 'Tu saldo sigue a salvo',
    intro: (s) => `Parece que tu tarjeta de fidelidad de <strong>${s}</strong> se eliminó de tu wallet.`,
    safeBalance: (a) => `Tranquilo &mdash; tu saldo de <strong>${a}</strong> y todas tus recompensas siguen aquí. Puedes volver a añadir la tarjeta cuando quieras.`,
    withCardYouGet: `Con tu tarjeta en la wallet obtienes:`,
    bullet1: (r) => `<strong>${r}%</strong> de cashback en cada visita`,
    bullet2: `Actualizaciones de saldo y ofertas exclusivas en tu pantalla de bloqueo`,
    bullet3: `Cashback por invitar a amigos`,
    reAddCta: 'Volver a añadir a Wallet →',
    expiresAndIgnore: `Este enlace caduca en 24 horas. Si la quitaste a propósito, ignora este correo &mdash; tus recompensas no se van a ninguna parte.`,
  },

  resendPassLink: {
    subject: (s) => `Tu tarjeta de fidelidad de ${s}`,
    intro: (s) => `Aquí tienes el enlace para añadir tu tarjeta de fidelidad de <strong>${s}</strong> a tu wallet.`,
    addCta: 'Añadir a Wallet →',
    expires: `Este enlace caduca en 24 horas. Si no lo solicitaste, ignóralo.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} ganado`,
    subjectReceipt: (s) => `Tu recibo de ${s}`,
    upgradeBanner: (tier, rate) => `🎉 ¡Has subido al nivel ${tier}! Tu nueva tasa de cashback: ${rate}%.`,
    breakdown: `Aquí tienes el desglose:`,
    rowPurchase: 'Compra',
    rowBalanceUsed: 'Saldo usado',
    rowCharged: 'Cobrado',
    rowCashback: (r) => `Cashback ganado (${r}%)`,
    rowYourBalance: 'Tu saldo',
    yourTier: (t) => `Tu nivel: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Gasta <strong>${amount}</strong> más para desbloquear <strong>${tier}</strong> y ganar <strong>${rate}%</strong> de cashback.`,
    thanksFor: (s) => `Gracias por elegir <strong>${s}</strong>.`,
  },

  tierUpgrade: {
    subject: (tier) => `Acabas de desbloquear ${tier}`,
    intro: (tier, s) => `Has subido al nivel <strong>${tier}</strong> en <strong>${s}</strong>.`,
    whatItMeans: `Qué significa:`,
    bullet1: (rate, old) => `Tu tasa de cashback es ahora <strong>${rate}%</strong> (antes ${old}%)`,
    bullet2: `Cada visita te da más`,
    yourBalance: (a) => `Tu saldo actual: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Total ganado: <strong>${a}</strong>`,
    thanksLoyal: `Gracias por ser un cliente leal. Te lo has ganado.`,
  },

  referralReward: {
    subject: (a) => `Tu recomendación te acaba de dar ${a}`,
    intro: (referred, s, a) => `Tu amigo <strong>${referred}</strong> acaba de visitar <strong>${s}</strong> &mdash; y ganaste <strong>${a}</strong> de cashback por la recomendación.`,
    updatedBalance: (a) => `Tu saldo actualizado: <strong>${a}</strong>`,
    knowMore: (s) => `¿Conoces a más gente que le encantaría <strong>${s}</strong>? Cada recomendación que reserva te da cashback.`,
  },

  winBack: {
    subject: (a, s) => `Tienes ${a} esperándote en ${s}`,
    intro: (s, a) => `Ha pasado un tiempo desde tu última visita a <strong>${s}</strong>. Solo un recordatorio &mdash; tu saldo de cashback de <strong>${a}</strong> sigue aquí, listo para usar.`,
    boostNote: (boosted, normal, expiry) => `Ahora mismo tu tasa de cashback está temporalmente impulsada al <strong>${boosted}%</strong> (normalmente ${normal}%). Este bonus caduca el <strong>${expiry}</strong>.`,
    seeBalanceCta: 'Ver tu saldo →',
  },
}

const nl: EmailTranslations = {
  greeting: (n) => `Hoi ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Welkom bij ${s}`,
    intro: (s) => `Je bent erbij. Je loyaliteitskaart bij <strong>${s}</strong> is klaar.`,
    howItWorks: `Zo werkt het:`,
    bullet1: (r) => `Elke keer dat je langskomt, verdien je <strong>${r}%</strong> cashback`,
    bullet2: (s) => `Je cashback-saldo kun je alleen besteden bij <strong>${s}</strong>`,
    bullet3: `Hoe vaker je komt, hoe hoger je niveau en beloningen`,
    currentBalance: (a) => `Je huidige saldo: <strong>${a}</strong>`,
    yourTier: (t) => `Je niveau: <strong>${t}</strong>`,
    addPassBlurb: `Voeg je loyaliteitskaart toe aan je telefoon &mdash; hij woont in Apple of Google Wallet. Geen app nodig.`,
    addPassCta: 'Toevoegen aan Wallet →',
    alreadyInWallet: `Je loyaliteitskaart zit al in je wallet. Je bent klaar.`,
    seeYouSoon: `Tot snel,`,
  },

  passReminder: {
    subject: (s) => `Je ${s}-kaart wacht op je`,
    intro: (s) => `Je hebt je aangemeld voor het loyaliteitsprogramma van <strong>${s}</strong>, maar je hebt de kaart nog niet aan je wallet toegevoegd.`,
    missingOut: `Dit mis je:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback bij elk bezoek &mdash; automatisch aan je saldo toegevoegd`,
    bullet2: `Hogere niveaus met grotere beloningen hoe vaker je komt`,
    bullet3: `Verdien cashback door vrienden uit te nodigen`,
    bullet4: `Exclusieve aanbiedingen direct op je vergrendelscherm`,
    oneTap: `Eén tik en hij zit in je Apple of Google Wallet. Geen app nodig.`,
    addCta: 'Toevoegen aan Wallet →',
    linkExpiresShort: 'Deze link verloopt over 24 uur.',
  },

  passRemoved: {
    subject: 'Je saldo is nog steeds veilig',
    intro: (s) => `Het lijkt erop dat je loyaliteitskaart van <strong>${s}</strong> uit je wallet is verwijderd.`,
    safeBalance: (a) => `Geen zorgen &mdash; je saldo van <strong>${a}</strong> en al je beloningen staan er nog. Je kunt de kaart altijd weer toevoegen.`,
    withCardYouGet: `Met je kaart in je wallet krijg je:`,
    bullet1: (r) => `<strong>${r}%</strong> cashback bij elk bezoek`,
    bullet2: `Saldo-updates en exclusieve aanbiedingen op je vergrendelscherm`,
    bullet3: `Cashback voor het uitnodigen van vrienden`,
    reAddCta: 'Opnieuw toevoegen aan Wallet →',
    expiresAndIgnore: `Deze link verloopt over 24 uur. Als je hem expres hebt verwijderd, negeer deze mail &mdash; je beloningen blijven gewoon staan.`,
  },

  resendPassLink: {
    subject: (s) => `Je ${s}-loyaliteitskaart`,
    intro: (s) => `Hier is je link om je loyaliteitskaart van <strong>${s}</strong> aan je wallet toe te voegen.`,
    addCta: 'Toevoegen aan Wallet →',
    expires: `Deze link verloopt over 24 uur. Als je dit niet hebt aangevraagd, kun je deze mail negeren.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — ${a} verdiend`,
    subjectReceipt: (s) => `Je bon van ${s}`,
    upgradeBanner: (tier, rate) => `🎉 Je bent gepromoveerd naar ${tier}! Je nieuwe cashback-percentage: ${rate}%.`,
    breakdown: `Hier is je overzicht:`,
    rowPurchase: 'Aankoop',
    rowBalanceUsed: 'Saldo gebruikt',
    rowCharged: 'Berekend',
    rowCashback: (r) => `Cashback verdiend (${r}%)`,
    rowYourBalance: 'Je saldo',
    yourTier: (t) => `Je niveau: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Besteed <strong>${amount}</strong> meer om <strong>${tier}</strong> te ontgrendelen en <strong>${rate}%</strong> cashback te verdienen.`,
    thanksFor: (s) => `Bedankt dat je voor <strong>${s}</strong> hebt gekozen.`,
  },

  tierUpgrade: {
    subject: (tier) => `Je hebt zojuist ${tier} ontgrendeld`,
    intro: (tier, s) => `Je bent gepromoveerd naar <strong>${tier}</strong> bij <strong>${s}</strong>.`,
    whatItMeans: `Wat dit betekent:`,
    bullet1: (rate, old) => `Je cashback-percentage is nu <strong>${rate}%</strong> (was ${old}%)`,
    bullet2: `Elk bezoek levert je meer op`,
    yourBalance: (a) => `Je huidige saldo: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Totaal verdiend: <strong>${a}</strong>`,
    thanksLoyal: `Bedankt dat je een trouwe klant bent. Welverdiend.`,
  },

  referralReward: {
    subject: (a) => `Je verwijzing heeft je net ${a} opgeleverd`,
    intro: (referred, s, a) => `Je vriend <strong>${referred}</strong> heeft net <strong>${s}</strong> bezocht &mdash; en jij verdiende <strong>${a}</strong> cashback voor de verwijzing.`,
    updatedBalance: (a) => `Je bijgewerkte saldo: <strong>${a}</strong>`,
    knowMore: (s) => `Ken je nog meer mensen die <strong>${s}</strong> geweldig zouden vinden? Elke verwijzing die boekt levert je cashback op.`,
  },

  winBack: {
    subject: (a, s) => `Je hebt ${a} klaarstaan bij ${s}`,
    intro: (s, a) => `Het is een tijdje geleden dat je <strong>${s}</strong> hebt bezocht. Even een herinnering &mdash; je cashback-saldo van <strong>${a}</strong> staat er nog, klaar om te gebruiken.`,
    boostNote: (boosted, normal, expiry) => `Op dit moment is je cashback-percentage tijdelijk verhoogd naar <strong>${boosted}%</strong> (normaal ${normal}%). Deze bonus verloopt op <strong>${expiry}</strong>.`,
    seeBalanceCta: 'Bekijk je saldo →',
  },
}

const pl: EmailTranslations = {
  greeting: (n) => `Cześć ${n},`,
  signOffWith: (s) => s,

  customerWelcome: {
    subject: (s) => `Witaj w ${s}`,
    intro: (s) => `Jesteś z nami. Twoja karta lojalnościowa w <strong>${s}</strong> jest gotowa.`,
    howItWorks: `Tak to działa:`,
    bullet1: (r) => `Za każdą wizytę zdobywasz <strong>${r}%</strong> cashbacku`,
    bullet2: (s) => `Saldo cashbacku możesz wydać tylko w <strong>${s}</strong>`,
    bullet3: `Im częściej odwiedzasz, tym wyższy poziom i większe nagrody`,
    currentBalance: (a) => `Twoje obecne saldo: <strong>${a}</strong>`,
    yourTier: (t) => `Twój poziom: <strong>${t}</strong>`,
    addPassBlurb: `Dodaj kartę lojalnościową do telefonu &mdash; mieszka w Apple lub Google Wallet. Bez aplikacji.`,
    addPassCta: 'Dodaj do Wallet →',
    alreadyInWallet: `Twoja karta lojalnościowa jest już w portfelu. Gotowe.`,
    seeYouSoon: `Do zobaczenia wkrótce,`,
  },

  passReminder: {
    subject: (s) => `Twoja karta ${s} czeka`,
    intro: (s) => `Zarejestrowałeś się w programie lojalnościowym <strong>${s}</strong>, ale jeszcze nie dodałeś karty do portfela.`,
    missingOut: `Oto co tracisz:`,
    bullet1: (r) => `<strong>${r}%</strong> cashbacku za każdą wizytę &mdash; automatycznie dodawane do salda`,
    bullet2: `Wyższe poziomy z większymi nagrodami im częściej odwiedzasz`,
    bullet3: `Zdobywaj cashback, polecając znajomych`,
    bullet4: `Ekskluzywne oferty wprost na ekran blokady`,
    oneTap: `Jedno dotknięcie i karta jest w Apple lub Google Wallet. Bez aplikacji.`,
    addCta: 'Dodaj do Wallet →',
    linkExpiresShort: 'Ten link wygasa w ciągu 24 godzin.',
  },

  passRemoved: {
    subject: 'Twoje saldo jest nadal bezpieczne',
    intro: (s) => `Wygląda na to, że Twoja karta lojalnościowa <strong>${s}</strong> została usunięta z portfela.`,
    safeBalance: (a) => `Bez obaw &mdash; saldo <strong>${a}</strong> i wszystkie nagrody nadal są dostępne. Możesz w każdej chwili dodać kartę ponownie.`,
    withCardYouGet: `Z kartą w portfelu masz:`,
    bullet1: (r) => `<strong>${r}%</strong> cashbacku za każdą wizytę`,
    bullet2: `Aktualizacje salda i ekskluzywne oferty na ekranie blokady`,
    bullet3: `Cashback za polecanie znajomych`,
    reAddCta: 'Dodaj ponownie do Wallet →',
    expiresAndIgnore: `Ten link wygasa w ciągu 24 godzin. Jeśli usunąłeś kartę celowo, zignoruj tę wiadomość &mdash; Twoje nagrody nigdzie nie znikną.`,
  },

  resendPassLink: {
    subject: (s) => `Twoja karta lojalnościowa ${s}`,
    intro: (s) => `Oto link do dodania karty lojalnościowej <strong>${s}</strong> do portfela.`,
    addCta: 'Dodaj do Wallet →',
    expires: `Ten link wygasa w ciągu 24 godzin. Jeśli o niego nie prosiłeś, zignoruj tę wiadomość.`,
  },

  transactionReceipt: {
    subjectEarned: (s, a) => `${s} — zdobyto ${a}`,
    subjectReceipt: (s) => `Twoje potwierdzenie z ${s}`,
    upgradeBanner: (tier, rate) => `🎉 Awansowałeś na ${tier}! Twoja nowa stawka cashbacku: ${rate}%.`,
    breakdown: `Oto podsumowanie:`,
    rowPurchase: 'Zakup',
    rowBalanceUsed: 'Wykorzystane saldo',
    rowCharged: 'Naliczono',
    rowCashback: (r) => `Cashback zdobyty (${r}%)`,
    rowYourBalance: 'Twoje saldo',
    yourTier: (t) => `Twój poziom: <strong>${t}</strong>`,
    spendMoreNudge: (amount, tier, rate) => `Wydaj <strong>${amount}</strong> więcej, aby odblokować <strong>${tier}</strong> i zdobywać <strong>${rate}%</strong> cashbacku.`,
    thanksFor: (s) => `Dziękujemy, że wybierasz <strong>${s}</strong>.`,
  },

  tierUpgrade: {
    subject: (tier) => `Właśnie odblokowałeś ${tier}`,
    intro: (tier, s) => `Awansowałeś na <strong>${tier}</strong> w <strong>${s}</strong>.`,
    whatItMeans: `Co to oznacza:`,
    bullet1: (rate, old) => `Twoja stawka cashbacku to teraz <strong>${rate}%</strong> (była ${old}%)`,
    bullet2: `Każda wizyta przynosi Ci więcej`,
    yourBalance: (a) => `Twoje obecne saldo: <strong>${a}</strong>`,
    lifetimeEarned: (a) => `Łącznie zdobyte: <strong>${a}</strong>`,
    thanksLoyal: `Dziękujemy za lojalność. To w pełni zasłużone.`,
  },

  referralReward: {
    subject: (a) => `Twoje polecenie właśnie zarobiło Ci ${a}`,
    intro: (referred, s, a) => `Twój znajomy <strong>${referred}</strong> właśnie odwiedził <strong>${s}</strong> &mdash; a Ty zdobyłeś <strong>${a}</strong> cashbacku za polecenie.`,
    updatedBalance: (a) => `Twoje zaktualizowane saldo: <strong>${a}</strong>`,
    knowMore: (s) => `Znasz więcej osób, które pokochałyby <strong>${s}</strong>? Każde polecenie, które rezerwuje, przynosi Ci cashback.`,
  },

  winBack: {
    subject: (a, s) => `Masz ${a} czekające w ${s}`,
    intro: (s, a) => `Minęło już trochę czasu od Twojej ostatniej wizyty w <strong>${s}</strong>. Tylko przypominamy &mdash; Twoje saldo cashbacku w wysokości <strong>${a}</strong> wciąż na Ciebie czeka.`,
    boostNote: (boosted, normal, expiry) => `Właśnie teraz Twoja stawka cashbacku jest tymczasowo zwiększona do <strong>${boosted}%</strong> (normalnie ${normal}%). Ten bonus wygasa <strong>${expiry}</strong>.`,
    seeBalanceCta: 'Zobacz saldo →',
  },
}

const translations: Record<string, EmailTranslations> = {
  en,
  da,
  sv,
  no: nb,
  nb,
  de,
  fr,
  es,
  nl,
  pl,
}

export function getEmailTranslations(lang: string | null | undefined): EmailTranslations {
  if (!lang) return translations.en
  return translations[lang.toLowerCase()] ?? translations.en
}
