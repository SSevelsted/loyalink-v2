// The member page /loyalty/[memberId], against an in-memory database.
// Run with `npm test`.
//
// Before this fix the page rendered with the service key for anyone who knew
// the member id (it is on the card's QR code): balance, activity and the full
// names of every friend the member referred. It also handed every visitor a
// 24-hour customer access token.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, wireFake, type FakeSupabase } from '@/test/fake-supabase'
import { REWARDS_CONFIG, STUDIO_ID, customerRow } from '@/test/loyalty-fixtures'
import { friendDisplayName, firstName } from '@/lib/member-privacy'

type PageService = typeof import('./member-page-service')
type Access = typeof import('@/lib/customer-access')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let pages: PageService
let access: Access
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']

const studio = { id: STUDIO_ID, name: 'Ink Studio', slug: 'ink', settings: { rewards_config: REWARDS_CONFIG, currency: 'EUR', language: 'en' } }

function seed(): FakeSupabase {
  const fake = createFakeSupabase({
    customers: [
      customerRow('giver', {
        member_id: 'MEMBER01',
        name: 'Maja Sørensen',
        balance: 125,
        referral_code: 'GIVER123',
        referral_count: 1,
        metadata: { avatar_url: 'https://cdn.test/a.webp' },
        studios: studio,
      }),
    ],
    referrals: [
      {
        id: 'ref-1',
        studio_id: STUDIO_ID,
        referrer_customer_id: 'giver',
        referred_customer_id: 'friend',
        referral_code: 'GIVER123',
        status: 'pending',
        total_commission_earned: 0,
        created_at: '2026-09-30T10:00:00.000Z',
        referred_customer: {
          name: 'Ana Karlsen Holm',
          has_purchased: false,
          metadata: { pass_downloaded: true, pass_url: 'https://secret.test/pass', custom_fields: { phone: '+45' } },
        },
      },
    ],
    transactions: [
      { id: 'tx-1', customer_id: 'giver', type: 'adjustment', amount: 25, description: 'Gift from Ana', created_at: '2026-09-30T10:00:00.000Z' },
    ],
    studio_landing_pages: [],
  })
  wireFake(adminSupabase, fake)
  return fake
}

before(async () => {
  setTestEnv()
  process.env.CUSTOMER_ACCESS_SECRET ??= 'test-customer-access-secret'
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  pages = await import('./member-page-service')
  access = await import('@/lib/customer-access')
  originalFrom = adminSupabase.from
})

after(() => {
  adminSupabase.from = originalFrom
})

describe('loadMemberPage', () => {
  it('without a token: public view, no balance, activity, friends or avatar, first name only', async () => {
    const fake = seed()

    const page = await pages.loadMemberPage('MEMBER01', null)

    assert.ok(page)
    assert.equal(page.access, 'public')
    assert.equal(page.customer.name, 'Maja')
    assert.equal(page.customer.balance, null)
    assert.equal(page.customer.cashback_rate, null)
    assert.equal(page.customer.referral_count, 0)
    assert.equal(page.avatarUrl, null)
    assert.deepEqual(page.transactions, [])
    assert.deepEqual(page.referrals, [])
    assert.ok(
      !fake.calls.some((c) => c.table === 'transactions' || c.table === 'referrals'),
      'personal tables are not even read',
    )
    const serialized = JSON.stringify(page)
    assert.ok(!serialized.includes('Sørensen') && !serialized.includes('125') && !serialized.includes('Ana'))
  })

  it('without a token: the page token adds the pass but does not open personal data', async () => {
    seed()

    const page = await pages.loadMemberPage('MEMBER01', null)

    const payload = access.verifyCustomerAccessToken(page!.customerAccessToken)
    assert.equal(payload?.customerId, 'giver', 'still valid for /api/pass/generate and the pass download')
    assert.equal(payload?.pass_only, true)
    assert.equal(access.hasPersonalDataAccess(page!.customerAccessToken, 'giver'), false)
    // Putting that token in the URL does not unlock the page.
    assert.equal((await pages.loadMemberPage('MEMBER01', page!.customerAccessToken))!.access, 'public')
  })

  it('with a bad, expired or other member\'s token: public view', async () => {
    seed()

    const other = access.createCustomerAccessToken('someone-else', 3600)
    const expired = access.createCustomerAccessToken('giver', -10)
    for (const token of ['garbage', 'a.b', other, expired]) {
      assert.equal((await pages.loadMemberPage('MEMBER01', token))!.access, 'public', token)
    }
  })

  it('with the member\'s token: full view, friends as first name + last initial, no friend metadata', async () => {
    seed()
    const token = access.createCustomerAccessToken('giver', 3600)

    const page = await pages.loadMemberPage('MEMBER01', token)

    assert.ok(page)
    assert.equal(page.access, 'full')
    assert.equal(page.customer.name, 'Maja Sørensen')
    assert.equal(page.customer.balance, 125)
    assert.equal(page.avatarUrl, 'https://cdn.test/a.webp')
    assert.equal(page.transactions.length, 1)
    assert.equal(page.referrals.length, 1)
    assert.equal(page.referrals[0].referred_customer.name, 'Ana H.')
    assert.deepEqual(page.referrals[0].referred_customer.metadata, { pass_downloaded: true })
    assert.ok(!JSON.stringify(page).includes('Karlsen'))
    assert.ok(!JSON.stringify(page).includes('secret.test'))
    assert.equal(access.hasPersonalDataAccess(page.customerAccessToken, 'giver'), true)
  })

  it('member link token (invite_link, pass back field): full view at the current version, public after rotation', async () => {
    const fake = seed()
    const linkToken = access.createMemberLinkToken('giver', 1)

    assert.equal((await pages.loadMemberPage('MEMBER01', linkToken))!.access, 'full', 'no column yet = version 1')
    // It opens the page only: pass generation and the pass-service reject it.
    assert.equal(access.verifyCustomerAccessToken(linkToken), null)

    fake.row('customers', 'giver').link_token_version = 2
    assert.equal((await pages.loadMemberPage('MEMBER01', linkToken))!.access, 'public', 'rotated: old link revoked')
    assert.equal((await pages.loadMemberPage('MEMBER01', access.createMemberLinkToken('giver', 2)))!.access, 'full')
    assert.equal((await pages.loadMemberPage('MEMBER01', access.createMemberLinkToken('someone-else', 2)))!.access, 'public')
    const [payload] = linkToken.split('.')
    assert.equal((await pages.loadMemberPage('MEMBER01', `${payload}.forged`))!.access, 'public')
  })

  it('a full view never hands the long-lived link token to the browser', async () => {
    seed()
    const linkToken = access.createMemberLinkToken('giver', 1)

    const page = await pages.loadMemberPage('MEMBER01', linkToken)

    assert.notEqual(page!.customerAccessToken, linkToken)
    assert.ok(access.verifyCustomerAccessToken(page!.customerAccessToken), 'a normal 24h token for wallet + avatar')
  })

  it('resolves the member by uuid too, and returns null for an unknown id', async () => {
    seed()

    assert.equal((await pages.loadMemberPage('giver', null))!.customer.id, 'giver')
    assert.equal(await pages.loadMemberPage('nope', null), null)
  })
})

describe('member-privacy', () => {
  it('friendDisplayName', () => {
    assert.equal(friendDisplayName('Ana Karlsen Holm'), 'Ana H.')
    assert.equal(friendDisplayName('  ana   øberg '), 'ana Ø.')
    assert.equal(friendDisplayName('Ana'), 'Ana')
    assert.equal(friendDisplayName(''), '')
    assert.equal(friendDisplayName(null), '')
  })

  it('firstName', () => {
    assert.equal(firstName('Maja Sørensen'), 'Maja')
    assert.equal(firstName(null), '')
  })
})
