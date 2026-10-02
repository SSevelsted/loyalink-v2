// Member link token: the invite_link StreamInk sends, and its rotation.
// Run with `npm test`.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FakeSupabase } from '@/test/fake-supabase'
import { OTHER_STUDIO_ID, STUDIO_ID, customerRow } from '@/test/loyalty-fixtures'

type LinkService = typeof import('./member-link-service')
type Access = typeof import('@/lib/customer-access')
type Links = typeof import('@/lib/member-links')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: LinkService
let access: Access
let links: Links
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

function seed(): FakeSupabase {
  const fake = createFakeSupabase({
    customers: [
      customerRow('m1', { member_id: 'MEMBER01', link_token_version: 1 }),
      customerRow('legacy', { member_id: null }),
      customerRow('outsider', { studio_id: OTHER_STUDIO_ID }),
    ],
  })
  wireFake(adminSupabase, fake)
  return fake
}

const tokenOf = (link: string) => new URL(link).searchParams.get('token')

before(async () => {
  setTestEnv()
  process.env.CUSTOMER_ACCESS_SECRET ??= 'test-customer-access-secret'
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./member-link-service')
  access = await import('@/lib/customer-access')
  links = await import('@/lib/member-links')
  originalFrom = adminSupabase.from
})

beforeEach(() => { fetchStub = stubFetch() })
afterEach(() => { fetchStub.restore() })
after(() => { adminSupabase.from = originalFrom })

describe('memberInviteLink', () => {
  it('uses member_id, keeps addPass=1 and carries a member link token at the row version', () => {
    const link = links.memberInviteLink({ id: 'm1', member_id: 'MEMBER01', link_token_version: 3 })
    const url = new URL(link)
    assert.ok(url.pathname.endsWith('/loyalty/MEMBER01'))
    assert.equal(url.searchParams.get('addPass'), '1')
    assert.deepEqual(access.verifyMemberLinkToken(tokenOf(link)), { customerId: 'm1', version: 3 })
  })

  it('falls back to the uuid and version 1 for a legacy row', () => {
    const link = links.memberInviteLink({ id: 'legacy', member_id: null })
    assert.ok(new URL(link).pathname.endsWith('/loyalty/legacy'))
    assert.deepEqual(access.verifyMemberLinkToken(tokenOf(link)), { customerId: 'legacy', version: 1 })
  })

  it('the token does not expire', () => {
    const token = access.createMemberLinkToken('m1', 1)
    const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'))
    assert.equal(payload.exp, undefined)
  })
})

describe('rotateMemberLink', () => {
  it('bumps the version, revokes the old link, returns the new one and pushes the pass', async () => {
    const fake = seed()
    const oldToken = access.createMemberLinkToken('m1', 1)

    const result = await service.rotateMemberLink(STUDIO_ID, 'm1')

    assert.equal(result.link_token_version, 2)
    assert.equal(fake.row('customers', 'm1').link_token_version, 2)
    assert.equal(access.hasPersonalDataAccess(oldToken, 'm1', 2), false)
    assert.equal(access.hasPersonalDataAccess(tokenOf(result.invite_link), 'm1', 2), true)
    assert.ok(fetchStub.urls.includes('http://pass.test/api/push/customer/m1'))
  })

  it('409 when another rotation won the race (guarded write)', async () => {
    const fake = createFakeSupabase(
      { customers: [customerRow('m1', { member_id: 'MEMBER01', link_token_version: 1 })] },
      { beforeExecute: (call, tables) => {
        if (call.op === 'update') tables.customers[0].link_token_version = 5
      } },
    )
    wireFake(adminSupabase, fake)
    await assert.rejects(service.rotateMemberLink(STUDIO_ID, 'm1'), (e: unknown) => {
      assert.ok(e instanceof service.MemberLinkError)
      assert.equal(e.status, 409)
      return true
    })
    assert.equal(fake.row('customers', 'm1').link_token_version, 5)
  })

  it('404 for a member of another studio', async () => {
    seed()
    await assert.rejects(service.rotateMemberLink(STUDIO_ID, 'outsider'), (e: unknown) => {
      assert.ok(e instanceof service.MemberLinkError)
      assert.equal(e.status, 404)
      return true
    })
  })
})
