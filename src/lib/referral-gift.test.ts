// Gift-first referral pages: the numbers and copy behind /refer and the gift
// block on /loyalty. Run with `npm test`.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatAmount, getCurrencyConfig } from '@/lib/currency'
import { GIFT_LANGUAGES, getGiftTranslations } from '@/lib/i18n/gift'
import {
  THANK_YOU_AMOUNT_BY_CURRENCY,
  friendGift,
  giftHeadlineVariant,
  giftOfferLine,
  giverThankYou,
  referralGoalProgress,
  rewardMoment,
  referralGoalTier,
  thankYouAmount,
} from '@/lib/referral-gift'
import { DEFAULT_REWARDS_CONFIG, type RewardsConfig } from '@/types/database'

/** Nick Schestag after the switch: friend 10% + 25 EUR, Inner Circle 15% at 3 friends. */
function nickConfig(over: Partial<RewardsConfig['referrals']> = {}): RewardsConfig {
  return {
    ...DEFAULT_REWARDS_CONFIG,
    tiers: [
      { slug: 'base', name: 'Base', cashback_rate: 5, unlocks_referrals: true },
      { slug: 'loyalty_club', name: 'Loyalty Club', cashback_rate: 10, upgrade_trigger: { type: 'first_full_payment' }, unlocks_referrals: false },
      { slug: 'inner_circle', name: 'Inner Circle', cashback_rate: 15, upgrade_trigger: { type: 'referral_count', threshold: 3 }, unlocks_referrals: false },
    ],
    referrals: {
      ...DEFAULT_REWARDS_CONFIG.referrals,
      friend_tier_slug: 'loyalty_club',
      friend_cashback_rate: 10,
      friend_welcome_bonus: 25,
      referrer_cashback_bonus_per_ref: 0,
      referrer_commission_rate: 0,
      ...over,
    },
    pilot_switched_at: '2026-10-01T00:00:00.000Z',
  }
}

const eur = (n: number) => formatAmount(n, getCurrencyConfig('EUR'))

describe('thank-you amount by currency', () => {
  it('mirrors StreamInk: EUR 25, SEK 250, DKK 200', () => {
    assert.deepEqual({ ...THANK_YOU_AMOUNT_BY_CURRENCY }, { EUR: 25, SEK: 250, DKK: 200 })
    assert.equal(thankYouAmount('EUR'), 25)
    assert.equal(thankYouAmount('eur'), 25)
    assert.equal(thankYouAmount('SEK'), 250)
    assert.equal(thankYouAmount('dkk'), 200)
  })

  it('an unknown currency has no amount', () => {
    assert.equal(thankYouAmount('NOK'), null)
    assert.equal(thankYouAmount('kr'), null)
    assert.equal(thankYouAmount(null), null)
    assert.equal(thankYouAmount(''), null)
  })
})

describe('giver thank-you', () => {
  it('a switched studio gives the StreamInk thank-you in the member currency', () => {
    assert.deepEqual(giverThankYou(nickConfig(), 'EUR'), { kind: 'switched', amount: 25 })
    assert.deepEqual(giverThankYou(nickConfig(), 'SEK'), { kind: 'switched', amount: 250 })
  })

  it('a switched studio in an unknown currency says nothing about the giver', () => {
    assert.equal(giverThankYou(nickConfig(), 'NOK'), null)
  })

  it('a studio that is not switched keeps its own Loyalink reward, or none', () => {
    const notSwitched = { ...nickConfig({ referrer_cashback_bonus_per_ref: 2 }), pilot_switched_at: undefined }
    assert.deepEqual(giverThankYou(notSwitched, 'EUR'), { kind: 'loyalink', cashbackBoost: 2, commission: null })
    const zero = { ...nickConfig(), pilot_switched_at: undefined }
    assert.equal(giverThankYou(zero, 'EUR'), null)
    const commission = { ...nickConfig({ referrer_commission_rate: 5, referrer_commission_duration_days: 60 }), pilot_switched_at: undefined }
    assert.deepEqual(giverThankYou(commission, 'EUR'), {
      kind: 'loyalink',
      cashbackBoost: 0,
      commission: { type: 'percentage', value: 5, days: 60 },
    })
  })
})

describe('friend gift and headline variant', () => {
  it('uses the friend cashback rate and the welcome bonus', () => {
    assert.deepEqual(friendGift(nickConfig()), { bonus: 25, rate: 10 })
  })

  it('a bonus of 0 or less is no bonus', () => {
    assert.deepEqual(friendGift(nickConfig({ friend_welcome_bonus: 0 })), { bonus: 0, rate: 10 })
    assert.deepEqual(friendGift(nickConfig({ friend_welcome_bonus: -5 })), { bonus: 0, rate: 10 })
  })

  it('the headline shows the bonus when there is one, else the rate', () => {
    assert.equal(giftHeadlineVariant(25), 'bonus')
    assert.equal(giftHeadlineVariant(0), 'rate')
    assert.equal(giftHeadlineVariant(null), 'rate')
    assert.equal(giftHeadlineVariant(undefined), 'rate')
  })
})

describe('gift block line', () => {
  const en = getGiftTranslations('en')

  it('switched: friend gift + thank-you', () => {
    const cfg = nickConfig()
    assert.equal(
      giftOfferLine(en, friendGift(cfg), giverThankYou(cfg, 'EUR'), eur, rewardMoment(cfg)),
      'Your friend gets 25 € and 10% cashback. You get 25 € when they pay their deposit.',
    )
  })

  it('no bonus and no thank-you: the friend part only', () => {
    const cfg = { ...nickConfig({ friend_welcome_bonus: 0, friend_cashback_rate: 9 }), pilot_switched_at: undefined }
    assert.equal(giftOfferLine(en, friendGift(cfg), giverThankYou(cfg, 'DKK'), eur, rewardMoment(cfg)), 'Your friend gets 9% cashback.')
  })

  it('not switched with a cashback boost (full-payment trigger)', () => {
    const cfg = { ...nickConfig({ friend_welcome_bonus: 15, friend_cashback_rate: 15, referrer_cashback_bonus_per_ref: 2, activation_trigger: { type: 'first_full_payment' } }), pilot_switched_at: undefined }
    assert.equal(
      giftOfferLine(en, friendGift(cfg), giverThankYou(cfg, 'EUR'), eur, rewardMoment(cfg)),
      'Your friend gets 15 € and 15% cashback. You get +2% cashback when they get tattooed.',
    )
  })
})

describe('road to the referral tier', () => {
  it('finds Inner Circle by its referral_count trigger', () => {
    assert.equal(referralGoalTier(nickConfig())?.slug, 'inner_circle')
  })

  it('falls back to any referral_count tier (switched studios reuse old slugs)', () => {
    const cfg = nickConfig()
    cfg.tiers = cfg.tiers.map((t) => (t.slug === 'inner_circle' ? { ...t, slug: 'black' } : t))
    assert.equal(referralGoalTier(cfg)?.slug, 'black')
  })

  it('no referral_count trigger: no bar', () => {
    const cfg = nickConfig()
    cfg.tiers = cfg.tiers.map((t) => (t.slug === 'inner_circle' ? { ...t, upgrade_trigger: { type: 'total_spend', threshold: 999999 } } : t))
    assert.deepEqual(referralGoalProgress(cfg, 'base', 1), { kind: 'none' })
  })

  it('1 of 3 activated: 2 to go', () => {
    assert.deepEqual(referralGoalProgress(nickConfig(), 'loyalty_club', 1), {
      kind: 'progress', tierName: 'Inner Circle', rate: 15, threshold: 3, activated: 1, remaining: 2,
    })
  })

  it('caps the count at the threshold', () => {
    const p = referralGoalProgress(nickConfig(), 'loyalty_club', 7)
    assert.equal(p.kind, 'progress')
    if (p.kind === 'progress') {
      assert.equal(p.activated, 3)
      assert.equal(p.remaining, 0)
    }
  })

  it('a member on the tier has reached it', () => {
    assert.deepEqual(referralGoalProgress(nickConfig(), 'inner_circle', 3), { kind: 'reached', tierName: 'Inner Circle', rate: 15 })
  })
})

describe('gift copy', () => {
  it('every language has every string, with no em dash', () => {
    const keys = Object.keys(getGiftTranslations('en')).sort()
    for (const lang of GIFT_LANGUAGES) {
      const g = getGiftTranslations(lang)
      assert.deepEqual(Object.keys(g).sort(), keys, lang)
      const samples = [
        g.giftFrom('Ana'), g.bonusOnYourCard('25 €'), g.plusCashbackAt(10, 'Studio'), g.cashbackAt(10, 'Studio'),
        g.claimMyGift, g.howItWorks, g.howClaim, g.howConsult('Studio'), g.howTalk, g.howBookBonus('25 €', 10), g.howBookRate(10),
        g.trustLine, g.whereToSend, g.getMyCard, g.back, g.bonusWaiting('25 €'), g.cardReady, g.addCardLine('Studio'),
        g.phoneTaken, g.emailTaken, g.giveAGift, g.friendGetsBonus('25 €', 10), g.friendGetsRate(10),
        g.youGetThankYou('25 €', 'deposit'), g.youGetThankYou('25 €', 'tattoo'), g.youGetBoost(2, 'deposit'), g.youGetBoost(2, 'tattoo'), g.youGetCommissionPct(5, 60), g.youGetCommissionPct(5, 0),
        g.youGetCommissionFixed('5 €', 60), g.youGetCommissionFixed('5 €', 0), g.sendAGift, g.orShowCard,
        g.roadTo(15), g.progressOf(1, 3), g.moreFriends(1, 15, 'deposit'), g.moreFriends(2, 15, 'deposit'), g.moreFriends(1, 15, 'tattoo'), g.moreFriends(2, 15, 'tattoo'), g.youreIn('Inner Circle'),
        g.youEarnOnEverything(15), g.shareGift('Studio', '25 €', 10, 'https://x'), g.shareGift('Studio', null, 10, 'https://x'),
        g.sendOptionFriend, g.sendOptionShare, g.friendFirstName, g.friendFirstNamePlaceholder, g.friendPhone, g.sendTheGift,
        g.sending, g.friendSent('Studio', 'Ana'), g.sendAnother, g.sentToday('Ana, Jonas'), g.errSelf, g.errPhone, g.errLimit(10),
        g.errUnavailable, g.errFailed,
      ]
      for (const text of samples) {
        assert.ok(text.trim().length > 0, `${lang}: empty string`)
        assert.ok(!text.includes('—'), `${lang}: em dash in "${text}"`)
      }
    }
  })

  it('Danish is Danish (no English button on a Danish page)', () => {
    const da = getGiftTranslations('da')
    assert.equal(da.claimMyGift, 'Hent min gave')
    assert.equal(da.getMyCard, 'Få mit kort')
    assert.equal(getGiftTranslations('no').getMyCard, getGiftTranslations('nb').getMyCard)
    assert.equal(getGiftTranslations('xx').getMyCard, 'Get my card')
  })

  it('the share text names the gift in the right currency, never "kr" for EUR', () => {
    const text = getGiftTranslations('en').shareGift('Blood in Blood Out', eur(25), 10, 'https://loyalink.ai/refer/abc')
    assert.equal(text, 'A gift for you: 25 € on your card + 10% cashback at Blood in Blood Out. Claim it here: https://loyalink.ai/refer/abc')
  })
})

describe('deposit and consultation copy (round 2)', () => {
  it('the giver is thanked at the deposit; the bar counts friends who book', () => {
    const en = getGiftTranslations('en')
    assert.equal(en.youGetThankYou('25 €', 'deposit'), 'You get 25 € when they pay their deposit.')
    assert.equal(en.moreFriends(2, 15, 'deposit'), '2 more friends who book and you earn 15% on everything.')
    assert.equal(en.moreFriends(1, 15, 'deposit'), '1 more friend who books and you earn 15% on everything.')
    for (const lang of GIFT_LANGUAGES) {
      const g = getGiftTranslations(lang)
      assert.ok(!/tattooed|tatover|tatuerad|tätowiert|tatoué|tatuado|getatoeëerd|wytatuowan/i.test(g.moreFriends(2, 15, 'deposit')), `${lang}: ${g.moreFriends(2, 15, 'deposit')}`)
    }
  })

  it('how it works starts with the consultation; the last screen books the consultation', () => {
    const en = getGiftTranslations('en')
    assert.equal(en.howConsult('Simon Ink'), 'Simon Ink messages you to book a consultation.')
    assert.equal(en.howBookBonus('25 €', 10), 'Book your tattoo. Your 25 € is already on your card, and every tattoo gives you 10% back.')
    assert.equal(en.addCardLine('Simon Ink'), 'Add the card to your phone. Simon Ink will message you to book your consultation.')
    assert.equal(en.friendSent('Simon Ink', 'Ana'), 'Done. Simon Ink will message Ana to book a consultation.')
  })

  it('builds E.164 from the picker and the national number', async () => {
    const { toE164, countryCodeFor } = await import('@/lib/phone-country-codes')
    assert.equal(toE164('+45', '20 12 34 56'), '+4520123456')
    assert.equal(toE164('+44', '07700 900123'), '+447700900123')
    assert.equal(toE164('+45', ''), '')
    assert.equal(countryCodeFor('se'), '+46')
    assert.equal(countryCodeFor(null), '+45')
  })
})

describe('reward wording follows the real activation trigger', () => {
  const en = getGiftTranslations('en')
  const line = (cfg: RewardsConfig) => giftOfferLine(en, friendGift(cfg), giverThankYou(cfg, 'EUR'), eur, rewardMoment(cfg))

  it('first_purchase (deposit included): "pay their deposit" and "friends who book"', () => {
    const cfg = nickConfig({ activation_trigger: { type: 'first_purchase' } })
    assert.equal(rewardMoment(cfg), 'deposit')
    assert.equal(line(cfg), 'Your friend gets 25 € and 10% cashback. You get 25 € when they pay their deposit.')
    assert.equal(en.moreFriends(2, 15, rewardMoment(cfg)), '2 more friends who book and you earn 15% on everything.')
  })

  it('first_full_payment (Ink Nation; Nick before the script): "get tattooed" and "tattooed friends", even when switched', () => {
    const cfg = nickConfig({ activation_trigger: { type: 'first_full_payment' } })
    assert.ok(cfg.pilot_switched_at)
    assert.equal(rewardMoment(cfg), 'tattoo')
    assert.equal(line(cfg), 'Your friend gets 25 € and 10% cashback. You get 25 € when they get tattooed.')
    assert.equal(en.moreFriends(2, 15, rewardMoment(cfg)), '2 more tattooed friends and you earn 15% on everything.')
    assert.equal(en.moreFriends(1, 15, rewardMoment(cfg)), '1 more tattooed friend and you earn 15% on everything.')
  })

  it('a not-switched studio boost follows its trigger too', () => {
    const base = { ...nickConfig({ referrer_cashback_bonus_per_ref: 2, friend_welcome_bonus: 0 }), pilot_switched_at: undefined }
    const dep = { ...base, referrals: { ...base.referrals, activation_trigger: { type: 'first_purchase' as const } } }
    const tat = { ...base, referrals: { ...base.referrals, activation_trigger: { type: 'first_full_payment' as const } } }
    assert.equal(line(dep), 'Your friend gets 10% cashback. You get +2% cashback when they pay their deposit.')
    assert.equal(line(tat), 'Your friend gets 10% cashback. You get +2% cashback when they get tattooed.')
  })

  it('every language has both wordings and they differ', () => {
    for (const lang of GIFT_LANGUAGES) {
      const g = getGiftTranslations(lang)
      assert.notEqual(g.youGetThankYou('25 €', 'deposit'), g.youGetThankYou('25 €', 'tattoo'), lang)
      assert.notEqual(g.youGetBoost(2, 'deposit'), g.youGetBoost(2, 'tattoo'), lang)
      assert.notEqual(g.moreFriends(2, 15, 'deposit'), g.moreFriends(2, 15, 'tattoo'), lang)
    }
  })
})
