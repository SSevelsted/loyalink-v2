/**
 * Gift-first referral copy: the friend's landing page (/refer/[memberId]) and
 * the gift block on the member page (/loyalty/[memberId]).
 *
 * The friend's part is a gift from the client, never "earn on your friends".
 * Casual, sentence case, no em dashes. Every language the signup and member
 * pages support is here; the same per-language conventions apply (see
 * src/lib/i18n/signup.ts): du/du/du/du, vous, tú, je, ty.
 *
 * Amounts arrive formatted (formatAmount), rates as numbers.
 */

export type GiftTranslations = {
  // Friend page, step 1: the gift
  giftFrom: (giver: string) => string
  bonusOnYourCard: (amount: string) => string
  plusCashbackAt: (rate: number, studio: string) => string
  cashbackAt: (rate: number, studio: string) => string
  claimMyGift: string
  howItWorks: string
  howClaim: string
  /** Small steps that start with the consultation. */
  howConsult: (studio: string) => string
  howTalk: string
  /** The welcome bonus is credited at sign-up (member-service), so it is already on the card. */
  howBookBonus: (amount: string, rate: number) => string
  howBookRate: (rate: number) => string
  trustLine: string

  // Friend page, step 2: claim
  whereToSend: string
  getMyCard: string
  back: string

  // Friend page, step 3: card ready
  bonusWaiting: (amount: string) => string
  cardReady: string
  addCardLine: (studio: string) => string

  // Sign-up errors (JoinForm): never show the server's English message
  phoneTaken: string
  emailTaken: string

  // Member page gift block
  giveAGift: string
  friendGetsBonus: (bonus: string, rate: number) => string
  friendGetsRate: (rate: number) => string
  youGetThankYou: (amount: string) => string
  youGetBoost: (rate: number) => string
  /** days = referrer_commission_duration_days; 0 = no end. */
  youGetCommissionPct: (rate: number, days: number) => string
  youGetCommissionFixed: (amount: string, days: number) => string
  sendAGift: string
  orShowCard: string
  roadTo: (rate: number) => string
  progressOf: (done: number, total: number) => string
  moreFriends: (n: number, rate: number) => string
  youreIn: (tier: string) => string
  youEarnOnEverything: (rate: number) => string
  // "Send a gift" sheet (private view): the member sends a friend, or shares the link
  sendOptionFriend: string
  sendOptionShare: string
  friendFirstName: string
  friendFirstNamePlaceholder: string
  friendPhone: string
  sendTheGift: string
  sending: string
  friendSent: (studio: string, friend: string) => string
  sendAnother: string
  sentToday: (names: string) => string
  errSelf: string
  errPhone: string
  errLimit: (n: number) => string
  errUnavailable: string
  errFailed: string
  /** The text navigator.share / WhatsApp / SMS send. bonus is null when there is none. */
  shareGift: (studio: string, bonus: string | null, rate: number, link: string) => string
}

const en: GiftTranslations = {
  giftFrom: (g) => `A gift from ${g}`,
  bonusOnYourCard: (a) => `${a} on your card`,
  plusCashbackAt: (r, s) => `+ ${r}% cashback at ${s}`,
  cashbackAt: (r, s) => `${r}% cashback at ${s}`,
  claimMyGift: 'Claim my gift',
  howItWorks: 'How it works',
  howClaim: 'Claim your gift. 30 seconds, no app.',
  howConsult: (s) => `${s} messages you to book a consultation.`,
  howTalk: 'Talk through your idea with your artist.',
  howBookBonus: (a, r) => `Book your tattoo. Your ${a} is already on your card, and every tattoo gives you ${r}% back.`,
  howBookRate: (r) => `Book your tattoo. Every tattoo gives you ${r}% back on your card.`,
  trustLine: 'Free. No app. Saves to Apple or Google Wallet.',

  whereToSend: 'Where should we send it?',
  getMyCard: 'Get my card',
  back: 'Back',

  bonusWaiting: (a) => `Your ${a} is waiting`,
  cardReady: 'Your card is ready',
  addCardLine: (s) => `Add the card to your phone. ${s} will message you to book your consultation.`,

  phoneTaken: 'This number already has a card here.',
  emailTaken: 'This email already has a card here.',

  giveAGift: 'Give a friend a gift',
  friendGetsBonus: (b, r) => `Your friend gets ${b} and ${r}% cashback.`,
  friendGetsRate: (r) => `Your friend gets ${r}% cashback.`,
  youGetThankYou: (a) => `You get ${a} when they pay their deposit.`,
  youGetBoost: (r) => `You get +${r}% cashback when they get tattooed.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `You get ${r}% of what they spend for ${d} days.` : `You get ${r}% of what they spend.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `For ${d} days, you get ${a} each time they pay.` : `You get ${a} each time they pay.`),
  sendAGift: 'Send a gift',
  orShowCard: 'Or show your card. They scan it.',
  roadTo: (r) => `Road to ${r}% cashback`,
  progressOf: (d, t) => `${d} of ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `1 more friend who books and you earn ${r}% on everything.`
      : `${n} more friends who book and you earn ${r}% on everything.`,
  youreIn: (tier) => `You're in ${tier}`,
  youEarnOnEverything: (r) => `You earn ${r}% on everything.`,
  sendOptionFriend: "Enter your friend's details",
  sendOptionShare: 'Share your link',
  friendFirstName: "Friend's first name",
  friendFirstNamePlaceholder: 'First name',
  friendPhone: "Friend's phone",
  sendTheGift: 'Send the gift',
  sending: 'Sending...',
  friendSent: (s, f) => `Done. ${s} will message ${f} to book a consultation.`,
  sendAnother: 'Send another friend',
  sentToday: (names) => `Sent today: ${names}`,
  errSelf: "That's your own number. Enter your friend's number.",
  errPhone: 'Check the number, including the country code.',
  errLimit: (n) => `You've sent ${n} friends today. Try again tomorrow.`,
  errUnavailable: "This studio can't take friends here yet. Share your link instead.",
  errFailed: 'Something went wrong. Try again.',
  shareGift: (s, b, r, link) =>
    b
      ? `A gift for you: ${b} on your card + ${r}% cashback at ${s}. Claim it here: ${link}`
      : `A gift for you: ${r}% cashback at ${s}. Claim it here: ${link}`,
}

const da: GiftTranslations = {
  giftFrom: (g) => `En gave fra ${g}`,
  bonusOnYourCard: (a) => `${a} på dit kort`,
  plusCashbackAt: (r, s) => `+ ${r}% cashback hos ${s}`,
  cashbackAt: (r, s) => `${r}% cashback hos ${s}`,
  claimMyGift: 'Hent min gave',
  howItWorks: 'Sådan virker det',
  howClaim: 'Hent din gave. 30 sekunder, ingen app.',
  howConsult: (s) => `${s} skriver til dig for at booke en konsultation.`,
  howTalk: 'Snak din idé igennem med din tatovør.',
  howBookBonus: (a, r) => `Book din tatovering. Din gave på ${a} er allerede på dit kort, og hver tatovering giver dig ${r}% tilbage.`,
  howBookRate: (r) => `Book din tatovering. Hver tatovering giver dig ${r}% tilbage på dit kort.`,
  trustLine: 'Gratis. Ingen app. Gemmes i Apple eller Google Wallet.',

  whereToSend: 'Hvor skal vi sende den hen?',
  getMyCard: 'Få mit kort',
  back: 'Tilbage',

  bonusWaiting: (a) => `Din gave på ${a} venter`,
  cardReady: 'Dit kort er klar',
  addCardLine: (s) => `Læg kortet på din telefon. ${s} skriver til dig for at booke din konsultation.`,

  phoneTaken: 'Det nummer har allerede et kort her.',
  emailTaken: 'Den e-mail har allerede et kort her.',

  giveAGift: 'Giv en ven en gave',
  friendGetsBonus: (b, r) => `Din ven får ${b} og ${r}% cashback.`,
  friendGetsRate: (r) => `Din ven får ${r}% cashback.`,
  youGetThankYou: (a) => `Du får ${a}, når de betaler deres depositum.`,
  youGetBoost: (r) => `Du får +${r}% cashback, når de bliver tatoveret.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Du får ${r}% af det, de bruger, i ${d} dage.` : `Du får ${r}% af det, de bruger.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `I ${d} dage får du ${a}, hver gang de betaler.` : `Du får ${a}, hver gang de betaler.`),
  sendAGift: 'Send en gave',
  orShowCard: 'Eller vis dit kort. De scanner det.',
  roadTo: (r) => `Vejen til ${r}% cashback`,
  progressOf: (d, t) => `${d} af ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `1 ven mere, der booker, så får du ${r}% på alt.`
      : `${n} venner mere, der booker, så får du ${r}% på alt.`,
  youreIn: (tier) => `Du er i ${tier}`,
  youEarnOnEverything: (r) => `Du får ${r}% på alt.`,
  sendOptionFriend: 'Indtast din vens oplysninger',
  sendOptionShare: 'Del dit link',
  friendFirstName: 'Din vens fornavn',
  friendFirstNamePlaceholder: 'Fornavn',
  friendPhone: 'Din vens telefon',
  sendTheGift: 'Send gaven',
  sending: 'Sender...',
  friendSent: (s, f) => `Klar. ${s} skriver til ${f} for at booke en konsultation.`,
  sendAnother: 'Send en ven mere',
  sentToday: (names) => `Sendt i dag: ${names}`,
  errSelf: 'Det er dit eget nummer. Skriv din vens nummer.',
  errPhone: 'Tjek nummeret, også landekoden.',
  errLimit: (n) => `Du har sendt ${n} venner i dag. Prøv igen i morgen.`,
  errUnavailable: 'Studiet kan ikke modtage venner her endnu. Del dit link i stedet.',
  errFailed: 'Noget gik galt. Prøv igen.',
  shareGift: (s, b, r, link) =>
    b
      ? `En gave til dig: ${b} på dit kort + ${r}% cashback hos ${s}. Hent den her: ${link}`
      : `En gave til dig: ${r}% cashback hos ${s}. Hent den her: ${link}`,
}

const sv: GiftTranslations = {
  giftFrom: (g) => `En present från ${g}`,
  bonusOnYourCard: (a) => `${a} på ditt kort`,
  plusCashbackAt: (r, s) => `+ ${r}% cashback hos ${s}`,
  cashbackAt: (r, s) => `${r}% cashback hos ${s}`,
  claimMyGift: 'Hämta min present',
  howItWorks: 'Så funkar det',
  howClaim: 'Hämta din present. 30 sekunder, ingen app.',
  howConsult: (s) => `${s} hör av sig för att boka en konsultation.`,
  howTalk: 'Prata igenom din idé med din tatuerare.',
  howBookBonus: (a, r) => `Boka din tatuering. Din present på ${a} ligger redan på ditt kort, och varje tatuering ger dig ${r}% tillbaka.`,
  howBookRate: (r) => `Boka din tatuering. Varje tatuering ger dig ${r}% tillbaka på ditt kort.`,
  trustLine: 'Gratis. Ingen app. Sparas i Apple eller Google Wallet.',

  whereToSend: 'Vart ska vi skicka den?',
  getMyCard: 'Få mitt kort',
  back: 'Tillbaka',

  bonusWaiting: (a) => `Din present på ${a} väntar`,
  cardReady: 'Ditt kort är klart',
  addCardLine: (s) => `Lägg till kortet i din telefon. ${s} hör av sig för att boka din konsultation.`,

  phoneTaken: 'Det numret har redan ett kort här.',
  emailTaken: 'Den e-postadressen har redan ett kort här.',

  giveAGift: 'Ge en vän en present',
  friendGetsBonus: (b, r) => `Din vän får ${b} och ${r}% cashback.`,
  friendGetsRate: (r) => `Din vän får ${r}% cashback.`,
  youGetThankYou: (a) => `Du får ${a} när de betalar sin handpenning.`,
  youGetBoost: (r) => `Du får +${r}% cashback när de tatuerar sig.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Du får ${r}% av det de handlar för i ${d} dagar.` : `Du får ${r}% av det de handlar för.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `I ${d} dagar får du ${a} varje gång de betalar.` : `Du får ${a} varje gång de betalar.`),
  sendAGift: 'Skicka en present',
  orShowCard: 'Eller visa ditt kort. De skannar det.',
  roadTo: (r) => `Vägen till ${r}% cashback`,
  progressOf: (d, t) => `${d} av ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `1 vän till som bokar, så får du ${r}% på allt.`
      : `${n} vänner till som bokar, så får du ${r}% på allt.`,
  youreIn: (tier) => `Du är i ${tier}`,
  youEarnOnEverything: (r) => `Du får ${r}% på allt.`,
  sendOptionFriend: 'Fyll i din väns uppgifter',
  sendOptionShare: 'Dela din länk',
  friendFirstName: 'Din väns förnamn',
  friendFirstNamePlaceholder: 'Förnamn',
  friendPhone: 'Din väns telefon',
  sendTheGift: 'Skicka presenten',
  sending: 'Skickar...',
  friendSent: (s, f) => `Klart. ${s} hör av sig till ${f} för att boka en konsultation.`,
  sendAnother: 'Skicka en vän till',
  sentToday: (names) => `Skickat i dag: ${names}`,
  errSelf: 'Det är ditt eget nummer. Skriv din väns nummer.',
  errPhone: 'Kolla numret, även landskoden.',
  errLimit: (n) => `Du har skickat ${n} vänner i dag. Försök igen i morgon.`,
  errUnavailable: 'Studion kan inte ta emot vänner här än. Dela din länk i stället.',
  errFailed: 'Något gick fel. Försök igen.',
  shareGift: (s, b, r, link) =>
    b
      ? `En present till dig: ${b} på ditt kort + ${r}% cashback hos ${s}. Hämta den här: ${link}`
      : `En present till dig: ${r}% cashback hos ${s}. Hämta den här: ${link}`,
}

const nb: GiftTranslations = {
  giftFrom: (g) => `En gave fra ${g}`,
  bonusOnYourCard: (a) => `${a} på kortet ditt`,
  plusCashbackAt: (r, s) => `+ ${r}% cashback hos ${s}`,
  cashbackAt: (r, s) => `${r}% cashback hos ${s}`,
  claimMyGift: 'Hent gaven min',
  howItWorks: 'Slik funker det',
  howClaim: 'Hent gaven din. 30 sekunder, ingen app.',
  howConsult: (s) => `${s} sender deg en melding for å booke en konsultasjon.`,
  howTalk: 'Snakk gjennom ideen din med tatovøren din.',
  howBookBonus: (a, r) => `Bestill tatoveringen din. Gaven din på ${a} er allerede på kortet ditt, og hver tatovering gir deg ${r}% tilbake.`,
  howBookRate: (r) => `Bestill tatoveringen din. Hver tatovering gir deg ${r}% tilbake på kortet ditt.`,
  trustLine: 'Gratis. Ingen app. Lagres i Apple eller Google Wallet.',

  whereToSend: 'Hvor skal vi sende den?',
  getMyCard: 'Få kortet mitt',
  back: 'Tilbake',

  bonusWaiting: (a) => `Gaven din på ${a} venter`,
  cardReady: 'Kortet ditt er klart',
  addCardLine: (s) => `Legg kortet på telefonen din. ${s} sender deg en melding for å booke konsultasjonen din.`,

  phoneTaken: 'Det nummeret har allerede et kort her.',
  emailTaken: 'Den e-posten har allerede et kort her.',

  giveAGift: 'Gi en venn en gave',
  friendGetsBonus: (b, r) => `Vennen din får ${b} og ${r}% cashback.`,
  friendGetsRate: (r) => `Vennen din får ${r}% cashback.`,
  youGetThankYou: (a) => `Du får ${a} når de betaler depositumet.`,
  youGetBoost: (r) => `Du får +${r}% cashback når de tatoverer seg.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Du får ${r}% av det de bruker i ${d} dager.` : `Du får ${r}% av det de bruker.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `I ${d} dager får du ${a} hver gang de betaler.` : `Du får ${a} hver gang de betaler.`),
  sendAGift: 'Send en gave',
  orShowCard: 'Eller vis kortet ditt. De skanner det.',
  roadTo: (r) => `Veien til ${r}% cashback`,
  progressOf: (d, t) => `${d} av ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `1 venn til som booker, så får du ${r}% på alt.`
      : `${n} venner til som booker, så får du ${r}% på alt.`,
  youreIn: (tier) => `Du er i ${tier}`,
  youEarnOnEverything: (r) => `Du får ${r}% på alt.`,
  sendOptionFriend: 'Skriv inn vennens detaljer',
  sendOptionShare: 'Del lenken din',
  friendFirstName: 'Vennens fornavn',
  friendFirstNamePlaceholder: 'Fornavn',
  friendPhone: 'Vennens telefon',
  sendTheGift: 'Send gaven',
  sending: 'Sender...',
  friendSent: (s, f) => `Ferdig. ${s} sender ${f} en melding for å booke en konsultasjon.`,
  sendAnother: 'Send en venn til',
  sentToday: (names) => `Sendt i dag: ${names}`,
  errSelf: 'Det er ditt eget nummer. Skriv inn vennens nummer.',
  errPhone: 'Sjekk nummeret, også landskoden.',
  errLimit: (n) => `Du har sendt ${n} venner i dag. Prøv igjen i morgen.`,
  errUnavailable: 'Studioet kan ikke ta imot venner her ennå. Del lenken din i stedet.',
  errFailed: 'Noe gikk galt. Prøv igjen.',
  shareGift: (s, b, r, link) =>
    b
      ? `En gave til deg: ${b} på kortet ditt + ${r}% cashback hos ${s}. Hent den her: ${link}`
      : `En gave til deg: ${r}% cashback hos ${s}. Hent den her: ${link}`,
}

const de: GiftTranslations = {
  giftFrom: (g) => `Ein Geschenk von ${g}`,
  bonusOnYourCard: (a) => `${a} auf deiner Karte`,
  plusCashbackAt: (r, s) => `+ ${r}% Cashback bei ${s}`,
  cashbackAt: (r, s) => `${r}% Cashback bei ${s}`,
  claimMyGift: 'Geschenk abholen',
  howItWorks: "So funktioniert's",
  howClaim: 'Hol dir dein Geschenk. 30 Sekunden, keine App.',
  howConsult: (s) => `${s} schreibt dir, um ein Beratungsgespräch zu buchen.`,
  howTalk: 'Sprich deine Idee mit deinem Artist durch.',
  howBookBonus: (a, r) => `Buch dein Tattoo. Deine ${a} sind schon auf deiner Karte, und jedes Tattoo bringt dir ${r}% zurück.`,
  howBookRate: (r) => `Buch dein Tattoo. Jedes Tattoo bringt dir ${r}% zurück auf deine Karte.`,
  trustLine: 'Kostenlos. Keine App. Landet in Apple oder Google Wallet.',

  whereToSend: 'Wohin sollen wir es schicken?',
  getMyCard: 'Karte holen',
  back: 'Zurück',

  bonusWaiting: (a) => `Deine ${a} warten auf dich`,
  cardReady: 'Deine Karte ist bereit',
  addCardLine: (s) => `Leg die Karte auf dein Handy. ${s} schreibt dir, um dein Beratungsgespräch zu buchen.`,

  phoneTaken: 'Diese Nummer hat hier schon eine Karte.',
  emailTaken: 'Diese E-Mail hat hier schon eine Karte.',

  giveAGift: 'Mach einem Freund ein Geschenk',
  friendGetsBonus: (b, r) => `Dein Freund bekommt ${b} und ${r}% Cashback.`,
  friendGetsRate: (r) => `Dein Freund bekommt ${r}% Cashback.`,
  youGetThankYou: (a) => `Du bekommst ${a}, sobald dein Freund die Anzahlung zahlt.`,
  youGetBoost: (r) => `Du bekommst +${r}% Cashback, sobald das Tattoo gestochen ist.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Du bekommst ${d} Tage lang ${r}% von dem, was dein Freund ausgibt.` : `Du bekommst ${r}% von dem, was dein Freund ausgibt.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `Du bekommst ${d} Tage lang ${a} bei jeder Zahlung deines Freundes.` : `Du bekommst ${a} bei jeder Zahlung deines Freundes.`),
  sendAGift: 'Geschenk senden',
  orShowCard: 'Oder zeig deine Karte. Dein Freund scannt sie.',
  roadTo: (r) => `Auf dem Weg zu ${r}% Cashback`,
  progressOf: (d, t) => `${d} von ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `Noch 1 Freund, der bucht, und du bekommst ${r}% auf alles.`
      : `Noch ${n} Freunde, die buchen, und du bekommst ${r}% auf alles.`,
  youreIn: (tier) => `Du bist im ${tier}`,
  youEarnOnEverything: (r) => `Du bekommst ${r}% auf alles.`,
  sendOptionFriend: 'Daten deines Freundes eingeben',
  sendOptionShare: 'Deinen Link teilen',
  friendFirstName: 'Vorname deines Freundes',
  friendFirstNamePlaceholder: 'Vorname',
  friendPhone: 'Handynummer deines Freundes',
  sendTheGift: 'Geschenk senden',
  sending: 'Wird gesendet...',
  friendSent: (s, f) => `Fertig. ${s} schreibt ${f}, um ein Beratungsgespräch zu buchen.`,
  sendAnother: 'Noch einen Freund senden',
  sentToday: (names) => `Heute gesendet: ${names}`,
  errSelf: 'Das ist deine eigene Nummer. Gib die Nummer deines Freundes ein.',
  errPhone: 'Prüf die Nummer, auch die Ländervorwahl.',
  errLimit: (n) => `Du hast heute ${n} Freunde gesendet. Versuch es morgen wieder.`,
  errUnavailable: 'Das Studio kann hier noch keine Freunde annehmen. Teil lieber deinen Link.',
  errFailed: 'Etwas ist schiefgelaufen. Versuch es nochmal.',
  shareGift: (s, b, r, link) =>
    b
      ? `Ein Geschenk für dich: ${b} auf deiner Karte + ${r}% Cashback bei ${s}. Hier abholen: ${link}`
      : `Ein Geschenk für dich: ${r}% Cashback bei ${s}. Hier abholen: ${link}`,
}

const fr: GiftTranslations = {
  giftFrom: (g) => `Un cadeau de ${g}`,
  bonusOnYourCard: (a) => `${a} sur votre carte`,
  plusCashbackAt: (r, s) => `+ ${r}% de cashback chez ${s}`,
  cashbackAt: (r, s) => `${r}% de cashback chez ${s}`,
  claimMyGift: 'Récupérer mon cadeau',
  howItWorks: 'Comment ça marche',
  howClaim: 'Récupérez votre cadeau. 30 secondes, sans appli.',
  howConsult: (s) => `${s} vous écrit pour réserver une consultation.`,
  howTalk: 'Parlez de votre idée avec votre artiste.',
  howBookBonus: (a, r) => `Réservez votre tatouage. Vos ${a} sont déjà sur votre carte, et chaque tatouage vous rend ${r}%.`,
  howBookRate: (r) => `Réservez votre tatouage. Chaque tatouage vous rend ${r}% sur votre carte.`,
  trustLine: 'Gratuit. Sans appli. S’enregistre dans Apple ou Google Wallet.',

  whereToSend: 'Où devons-nous l’envoyer ?',
  getMyCard: 'Obtenir ma carte',
  back: 'Retour',

  bonusWaiting: (a) => `Vos ${a} vous attendent`,
  cardReady: 'Votre carte est prête',
  addCardLine: (s) => `Ajoutez la carte à votre téléphone. ${s} vous écrira pour réserver votre consultation.`,

  phoneTaken: 'Ce numéro a déjà une carte ici.',
  emailTaken: 'Cet e-mail a déjà une carte ici.',

  giveAGift: 'Offrez un cadeau à un ami',
  friendGetsBonus: (b, r) => `Votre ami reçoit ${b} et ${r}% de cashback.`,
  friendGetsRate: (r) => `Votre ami reçoit ${r}% de cashback.`,
  youGetThankYou: (a) => `Vous recevez ${a} quand votre ami paie son acompte.`,
  youGetBoost: (r) => `Vous recevez +${r}% de cashback une fois son tatouage fait.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Vous recevez ${r}% de ses dépenses pendant ${d} jours.` : `Vous recevez ${r}% de ses dépenses.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `Pendant ${d} jours, vous recevez ${a} à chacun de ses paiements.` : `Vous recevez ${a} à chacun de ses paiements.`),
  sendAGift: 'Offrir un cadeau',
  orShowCard: 'Ou montrez votre carte. Votre ami la scanne.',
  roadTo: (r) => `En route vers ${r}% de cashback`,
  progressOf: (d, t) => `${d} sur ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `Encore 1 ami qui réserve et vous gagnez ${r}% sur tout.`
      : `Encore ${n} amis qui réservent et vous gagnez ${r}% sur tout.`,
  youreIn: (tier) => `Bienvenue dans ${tier}`,
  youEarnOnEverything: (r) => `Vous gagnez ${r}% sur tout.`,
  sendOptionFriend: 'Saisir les coordonnées de votre ami',
  sendOptionShare: 'Partager votre lien',
  friendFirstName: 'Prénom de votre ami',
  friendFirstNamePlaceholder: 'Prénom',
  friendPhone: 'Téléphone de votre ami',
  sendTheGift: 'Envoyer le cadeau',
  sending: 'Envoi...',
  friendSent: (s, f) => `C’est fait. ${s} écrira à ${f} pour réserver une consultation.`,
  sendAnother: 'Envoyer un autre ami',
  sentToday: (names) => `Envoyé aujourd’hui : ${names}`,
  errSelf: 'C’est votre propre numéro. Saisissez celui de votre ami.',
  errPhone: 'Vérifiez le numéro, indicatif compris.',
  errLimit: (n) => `Vous avez envoyé ${n} amis aujourd’hui. Réessayez demain.`,
  errUnavailable: 'Ce studio ne peut pas encore recevoir d’amis ici. Partagez plutôt votre lien.',
  errFailed: 'Un problème est survenu. Réessayez.',
  // Sent from one friend to another, so it uses "tu".
  shareGift: (s, b, r, link) =>
    b
      ? `Un cadeau pour toi : ${b} sur ta carte + ${r}% de cashback chez ${s}. Récupère-le ici : ${link}`
      : `Un cadeau pour toi : ${r}% de cashback chez ${s}. Récupère-le ici : ${link}`,
}

const es: GiftTranslations = {
  giftFrom: (g) => `Un regalo de ${g}`,
  bonusOnYourCard: (a) => `${a} en tu tarjeta`,
  plusCashbackAt: (r, s) => `+ ${r}% de cashback en ${s}`,
  cashbackAt: (r, s) => `${r}% de cashback en ${s}`,
  claimMyGift: 'Reclamar mi regalo',
  howItWorks: 'Cómo funciona',
  howClaim: 'Reclama tu regalo. 30 segundos, sin app.',
  howConsult: (s) => `${s} te escribe para reservar una consulta.`,
  howTalk: 'Habla de tu idea con tu artista.',
  howBookBonus: (a, r) => `Reserva tu tatuaje. Tus ${a} ya están en tu tarjeta, y cada tatuaje te devuelve un ${r}%.`,
  howBookRate: (r) => `Reserva tu tatuaje. Cada tatuaje te devuelve un ${r}% en tu tarjeta.`,
  trustLine: 'Gratis. Sin app. Se guarda en Apple o Google Wallet.',

  whereToSend: '¿Dónde te lo enviamos?',
  getMyCard: 'Obtener mi tarjeta',
  back: 'Atrás',

  bonusWaiting: (a) => `Tus ${a} te esperan`,
  cardReady: 'Tu tarjeta está lista',
  addCardLine: (s) => `Añade la tarjeta a tu móvil. ${s} te escribirá para reservar tu consulta.`,

  phoneTaken: 'Este número ya tiene una tarjeta aquí.',
  emailTaken: 'Este email ya tiene una tarjeta aquí.',

  giveAGift: 'Hazle un regalo a un amigo',
  friendGetsBonus: (b, r) => `Tu amigo recibe ${b} y un ${r}% de cashback.`,
  friendGetsRate: (r) => `Tu amigo recibe un ${r}% de cashback.`,
  youGetThankYou: (a) => `Tú recibes ${a} cuando pague su depósito.`,
  youGetBoost: (r) => `Tú recibes +${r}% de cashback cuando se tatúe.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Tú recibes un ${r}% de lo que gaste durante ${d} días.` : `Tú recibes un ${r}% de lo que gaste.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `Durante ${d} días, tú recibes ${a} cada vez que pague.` : `Tú recibes ${a} cada vez que pague.`),
  sendAGift: 'Enviar un regalo',
  orShowCard: 'O enseña tu tarjeta. Tu amigo la escanea.',
  roadTo: (r) => `Camino al ${r}% de cashback`,
  progressOf: (d, t) => `${d} de ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `1 amigo más que reserve y ganas un ${r}% en todo.`
      : `${n} amigos más que reserven y ganas un ${r}% en todo.`,
  youreIn: (tier) => `Estás en ${tier}`,
  youEarnOnEverything: (r) => `Ganas un ${r}% en todo.`,
  sendOptionFriend: 'Introduce los datos de tu amigo',
  sendOptionShare: 'Comparte tu enlace',
  friendFirstName: 'Nombre de tu amigo',
  friendFirstNamePlaceholder: 'Nombre',
  friendPhone: 'Teléfono de tu amigo',
  sendTheGift: 'Enviar el regalo',
  sending: 'Enviando...',
  friendSent: (s, f) => `Listo. ${s} escribirá a ${f} para reservar una consulta.`,
  sendAnother: 'Enviar otro amigo',
  sentToday: (names) => `Enviado hoy: ${names}`,
  errSelf: 'Es tu propio número. Introduce el de tu amigo.',
  errPhone: 'Revisa el número, con el prefijo del país.',
  errLimit: (n) => `Has enviado ${n} amigos hoy. Inténtalo mañana.`,
  errUnavailable: 'Este estudio aún no puede recibir amigos aquí. Comparte tu enlace.',
  errFailed: 'Algo salió mal. Inténtalo de nuevo.',
  shareGift: (s, b, r, link) =>
    b
      ? `Un regalo para ti: ${b} en tu tarjeta + ${r}% de cashback en ${s}. Reclámalo aquí: ${link}`
      : `Un regalo para ti: ${r}% de cashback en ${s}. Reclámalo aquí: ${link}`,
}

const nl: GiftTranslations = {
  giftFrom: (g) => `Een cadeau van ${g}`,
  bonusOnYourCard: (a) => `${a} op je kaart`,
  plusCashbackAt: (r, s) => `+ ${r}% cashback bij ${s}`,
  cashbackAt: (r, s) => `${r}% cashback bij ${s}`,
  claimMyGift: 'Claim mijn cadeau',
  howItWorks: 'Zo werkt het',
  howClaim: 'Claim je cadeau. 30 seconden, geen app.',
  howConsult: (s) => `${s} stuurt je een bericht om een consult te boeken.`,
  howTalk: 'Bespreek je idee met je artiest.',
  howBookBonus: (a, r) => `Boek je tattoo. Je ${a} staat al op je kaart, en elke tattoo geeft je ${r}% terug.`,
  howBookRate: (r) => `Boek je tattoo. Elke tattoo geeft je ${r}% terug op je kaart.`,
  trustLine: 'Gratis. Geen app. Komt in Apple of Google Wallet.',

  whereToSend: 'Waar sturen we het naartoe?',
  getMyCard: 'Ontvang mijn kaart',
  back: 'Terug',

  bonusWaiting: (a) => `Je ${a} staat klaar`,
  cardReady: 'Je kaart staat klaar',
  addCardLine: (s) => `Zet de kaart op je telefoon. ${s} stuurt je een bericht om je consult te boeken.`,

  phoneTaken: 'Dit nummer heeft hier al een kaart.',
  emailTaken: 'Dit e-mailadres heeft hier al een kaart.',

  giveAGift: 'Geef een vriend een cadeau',
  friendGetsBonus: (b, r) => `Je vriend krijgt ${b} en ${r}% cashback.`,
  friendGetsRate: (r) => `Je vriend krijgt ${r}% cashback.`,
  youGetThankYou: (a) => `Jij krijgt ${a} als ze hun aanbetaling doen.`,
  youGetBoost: (r) => `Jij krijgt +${r}% cashback als ze getatoeëerd zijn.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Jij krijgt ${d} dagen lang ${r}% van wat ze uitgeven.` : `Jij krijgt ${r}% van wat ze uitgeven.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `Jij krijgt ${d} dagen lang ${a} elke keer dat ze betalen.` : `Jij krijgt ${a} elke keer dat ze betalen.`),
  sendAGift: 'Stuur een cadeau',
  orShowCard: 'Of laat je kaart zien. Zij scannen hem.',
  roadTo: (r) => `Op weg naar ${r}% cashback`,
  progressOf: (d, t) => `${d} van ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `Nog 1 vriend die boekt en je krijgt ${r}% op alles.`
      : `Nog ${n} vrienden die boeken en je krijgt ${r}% op alles.`,
  youreIn: (tier) => `Je zit in ${tier}`,
  youEarnOnEverything: (r) => `Je krijgt ${r}% op alles.`,
  sendOptionFriend: 'Vul de gegevens van je vriend in',
  sendOptionShare: 'Deel je link',
  friendFirstName: 'Voornaam van je vriend',
  friendFirstNamePlaceholder: 'Voornaam',
  friendPhone: 'Telefoon van je vriend',
  sendTheGift: 'Stuur het cadeau',
  sending: 'Versturen...',
  friendSent: (s, f) => `Klaar. ${s} stuurt ${f} een bericht om een consult te boeken.`,
  sendAnother: 'Nog een vriend sturen',
  sentToday: (names) => `Vandaag verstuurd: ${names}`,
  errSelf: 'Dat is je eigen nummer. Vul het nummer van je vriend in.',
  errPhone: 'Controleer het nummer, ook de landcode.',
  errLimit: (n) => `Je hebt vandaag ${n} vrienden gestuurd. Probeer het morgen weer.`,
  errUnavailable: 'Deze studio kan hier nog geen vrienden ontvangen. Deel je link.',
  errFailed: 'Er ging iets mis. Probeer het opnieuw.',
  shareGift: (s, b, r, link) =>
    b
      ? `Een cadeau voor jou: ${b} op je kaart + ${r}% cashback bij ${s}. Claim het hier: ${link}`
      : `Een cadeau voor jou: ${r}% cashback bij ${s}. Claim het hier: ${link}`,
}

const pl: GiftTranslations = {
  giftFrom: (g) => `Prezent od ${g}`,
  bonusOnYourCard: (a) => `${a} na twojej karcie`,
  plusCashbackAt: (r, s) => `+ ${r}% cashbacku w ${s}`,
  cashbackAt: (r, s) => `${r}% cashbacku w ${s}`,
  claimMyGift: 'Odbierz prezent',
  howItWorks: 'Jak to działa',
  howClaim: 'Odbierz prezent. 30 sekund, bez aplikacji.',
  howConsult: (s) => `${s} napisze do ciebie, żeby umówić konsultację.`,
  howTalk: 'Omów swój pomysł z artystą.',
  howBookBonus: (a, r) => `Umów tatuaż. Prezent (${a}) jest już na twojej karcie, a każdy tatuaż zwraca ci ${r}%.`,
  howBookRate: (r) => `Umów tatuaż. Każdy tatuaż zwraca ci ${r}% na kartę.`,
  trustLine: 'Za darmo. Bez aplikacji. Zapisuje się w Apple lub Google Wallet.',

  whereToSend: 'Gdzie mamy go wysłać?',
  getMyCard: 'Odbierz kartę',
  back: 'Wstecz',

  bonusWaiting: (a) => `${a} czeka na ciebie`,
  cardReady: 'Twoja karta jest gotowa',
  addCardLine: (s) => `Dodaj kartę do telefonu. ${s} napisze do ciebie, żeby umówić konsultację.`,

  phoneTaken: 'Ten numer ma już tu kartę.',
  emailTaken: 'Ten e-mail ma już tu kartę.',

  giveAGift: 'Daj znajomemu prezent',
  friendGetsBonus: (b, r) => `Twój znajomy dostaje ${b} i ${r}% cashbacku.`,
  friendGetsRate: (r) => `Twój znajomy dostaje ${r}% cashbacku.`,
  youGetThankYou: (a) => `Ty dostajesz ${a}, gdy znajomy wpłaci zaliczkę.`,
  youGetBoost: (r) => `Ty dostajesz +${r}% cashbacku, gdy zrobi tatuaż.`,
  youGetCommissionPct: (r, d) => (d > 0 ? `Ty dostajesz ${r}% z tego, co wyda, przez ${d} dni.` : `Ty dostajesz ${r}% z tego, co wyda.`),
  youGetCommissionFixed: (a, d) => (d > 0 ? `Przez ${d} dni dostajesz ${a} przy każdej jego płatności.` : `Ty dostajesz ${a} przy każdej jego płatności.`),
  sendAGift: 'Wyślij prezent',
  orShowCard: 'Albo pokaż swoją kartę. Znajomy ją zeskanuje.',
  roadTo: (r) => `Droga do ${r}% cashbacku`,
  progressOf: (d, t) => `${d} z ${t}`,
  moreFriends: (n, r) =>
    n === 1
      ? `Jeszcze 1 znajomy, który się umówi, i dostajesz ${r}% na wszystko.`
      : `Jeszcze ${n} znajomych, którzy się umówią, i dostajesz ${r}% na wszystko.`,
  youreIn: (tier) => `Jesteś w ${tier}`,
  youEarnOnEverything: (r) => `Dostajesz ${r}% na wszystko.`,
  sendOptionFriend: 'Wpisz dane znajomego',
  sendOptionShare: 'Udostępnij swój link',
  friendFirstName: 'Imię znajomego',
  friendFirstNamePlaceholder: 'Imię',
  friendPhone: 'Telefon znajomego',
  sendTheGift: 'Wyślij prezent',
  sending: 'Wysyłanie...',
  friendSent: (s, f) => `Gotowe. ${s} napisze do: ${f}, żeby umówić konsultację.`,
  sendAnother: 'Wyślij kolejnego znajomego',
  sentToday: (names) => `Wysłane dziś: ${names}`,
  errSelf: 'To twój własny numer. Wpisz numer znajomego.',
  errPhone: 'Sprawdź numer, razem z kierunkowym kraju.',
  errLimit: (n) => `Wysłano dziś ${n} znajomych. Spróbuj jutro.`,
  errUnavailable: 'To studio nie przyjmuje jeszcze tu znajomych. Udostępnij swój link.',
  errFailed: 'Coś poszło nie tak. Spróbuj ponownie.',
  shareGift: (s, b, r, link) =>
    b
      ? `Prezent dla ciebie: ${b} na karcie + ${r}% cashbacku w ${s}. Odbierz tutaj: ${link}`
      : `Prezent dla ciebie: ${r}% cashbacku w ${s}. Odbierz tutaj: ${link}`,
}

const translations: Record<string, GiftTranslations> = {
  en,
  da,
  sv,
  // The studio language picker stores `no`; `nb` is Bokmål. Same dictionary.
  no: nb,
  nb,
  de,
  fr,
  es,
  nl,
  pl,
}

/** Every language key, for tests. */
export const GIFT_LANGUAGES = Object.keys(translations)

export function getGiftTranslations(lang: string | null | undefined): GiftTranslations {
  return translations[(lang ?? '').toLowerCase()] ?? en
}
