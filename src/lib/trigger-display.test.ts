// Tier trigger copy on the join page and the member page. Run with `npm test`.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getTriggerDisplayText } from '@/lib/format'
import { getLoyaltyTranslations } from '@/lib/loyalty-translations'
import { isManualOnlyTrigger, type UpgradeTriggerConfig } from '@/types/database'

const manual: UpgradeTriggerConfig = { type: 'total_spend', threshold: 999999 }
const threeFriends: UpgradeTriggerConfig = { type: 'referral_count', threshold: 3 }

describe('tier trigger copy', () => {
  it('the manual-only sentinel reads "by invitation", never a 999.999 spend', () => {
    assert.equal(isManualOnlyTrigger(manual), true)
    assert.equal(isManualOnlyTrigger({ type: 'total_spend', threshold: 50000 }), false)
    assert.equal(isManualOnlyTrigger(threeFriends), false)
    assert.equal(getTriggerDisplayText(manual, 'EUR', 'en'), 'By invitation')
    assert.equal(getTriggerDisplayText(manual, 'EUR', 'de'), 'Nur auf Einladung')
    assert.equal(getTriggerDisplayText(manual, 'DKK', 'da'), 'Kun på invitation')
    assert.equal(getTriggerDisplayText(manual, 'SEK', 'sv'), 'Endast på inbjudan')
    assert.equal(getTriggerDisplayText(manual, 'NOK', 'no'), 'Kun på invitasjon')
    assert.equal(getTriggerDisplayText({ type: 'total_spend', threshold: 5000 }, 'EUR', 'en').includes('5'), true)
    assert.equal(getLoyaltyTranslations('de').doByInvitation, 'Nur auf Einladung')
  })

  it('referral_count says the friends got tattooed, singular for 1', () => {
    assert.equal(getTriggerDisplayText(threeFriends, 'EUR', 'en'), '3 friends get tattooed with us')
    assert.equal(getTriggerDisplayText(threeFriends, 'EUR', 'de'), '3 Freunde lassen sich bei uns tätowieren')
    assert.equal(getTriggerDisplayText(threeFriends, 'DKK', 'da'), '3 venner bliver tatoveret hos os')
    assert.equal(getTriggerDisplayText(threeFriends, 'SEK', 'sv'), '3 vänner tatuerar sig hos oss')
    assert.equal(getTriggerDisplayText(threeFriends, 'NOK', 'no'), '3 venner tatoverer seg hos oss')
    assert.equal(getTriggerDisplayText({ type: 'referral_count', threshold: 1 }, 'EUR', 'en'), '1 friend gets tattooed with us')
    assert.equal(getLoyaltyTranslations('de').doReferralCount(3), '3 Freunde lassen sich bei uns tätowieren')
    assert.equal(getLoyaltyTranslations('en').doReferralCount(1), '1 friend gets tattooed with us')
  })
})
