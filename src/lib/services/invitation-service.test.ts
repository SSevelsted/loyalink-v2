// Invitation lookup + claim against an in-memory database. Run with `npm test`.
//
// These run with the service key because RLS (028_rls_lockdown) gives an
// invitee no access to `invitations`. The tests pin what that server code
// may hand out: one invitation, by its exact token, never the token itself.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createFakeSupabase, setTestEnv, wireFake, type FakeSupabase, type Row } from '@/test/fake-supabase'

type Service = typeof import('./invitation-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

const TOKEN = '6f1c2a9e-1b7d-4c3e-9a55-0d6b2f8e4a11'
const OTHER_TOKEN = '0a0b0c0d-1111-4222-8333-444455556666'
const NOW = new Date('2026-10-02T12:00:00Z')

let service: Service
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']

function invitation(fields: Row = {}): Row {
  return {
    id: 'inv-1',
    studio_id: 'studio-a',
    email: 'artist@example.com',
    role: 'member',
    token: TOKEN,
    expires_at: '2026-10-05T12:00:00Z',
    accepted_at: null,
    ...fields,
  }
}

function seed(invitations: Row[], members: Row[] = []): FakeSupabase {
  const fake = createFakeSupabase({
    invitations,
    studios: [{ id: 'studio-a', name: 'Studio A' }, { id: 'studio-b', name: 'Studio B' }],
    studio_members: members,
  })
  wireFake(adminSupabase, fake)
  return fake
}

before(async () => {
  setTestEnv()
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./invitation-service')
  originalFrom = adminSupabase.from

  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(service.lookupInvitation(TOKEN, NOW), /fake-wired/, 'service does not use the patched adminSupabase')
})

after(() => {
  adminSupabase.from = originalFrom
})

describe('lookupInvitation', () => {
  it('returns studio name, role and email for the exact token, and nothing else', async () => {
    seed([invitation(), invitation({ id: 'inv-2', token: OTHER_TOKEN, studio_id: 'studio-b', email: 'x@example.com' })])

    const result = await service.lookupInvitation(TOKEN, NOW)

    assert.deepEqual(result, {
      status: 'ok',
      invitation: { email: 'artist@example.com', role: 'member', expiresAt: '2026-10-05T12:00:00Z', studioName: 'Studio A' },
    })
    assert.equal(JSON.stringify(result).includes(TOKEN), false, 'the token is never echoed back')
  })

  it('rejects a non-uuid token without a query', async () => {
    const fake = seed([invitation()])
    for (const bad of ['', 'abc', `${TOKEN} OR 1=1`, null, 42, { token: TOKEN }]) {
      assert.deepEqual(await service.lookupInvitation(bad, NOW), { status: 'not_found' })
    }
    assert.equal(fake.calls.length, 0)
  })

  it('an unknown, accepted or expired invitation reveals nothing', async () => {
    seed([invitation({ accepted_at: '2026-10-01T00:00:00Z' })])
    assert.deepEqual(await service.lookupInvitation(TOKEN, NOW), { status: 'not_found' })
    assert.deepEqual(await service.lookupInvitation(OTHER_TOKEN, NOW), { status: 'not_found' })

    seed([invitation({ expires_at: '2026-10-01T00:00:00Z' })])
    assert.deepEqual(await service.lookupInvitation(TOKEN, NOW), { status: 'expired' })
  })
})

describe('claimInvitation + addInvitedMember', () => {
  it('claims once: the second claim with the same token fails', async () => {
    const fake = seed([invitation()])

    const first = await service.claimInvitation(TOKEN, NOW)
    assert.equal(first.status, 'claimed')
    assert.equal(fake.rows('invitations')[0].accepted_at, NOW.toISOString())

    assert.deepEqual(await service.claimInvitation(TOKEN, NOW), { status: 'not_found' })
  })

  it('an expired invitation is released again, so it stays unaccepted', async () => {
    const fake = seed([invitation({ expires_at: '2026-10-01T00:00:00Z' })])

    assert.deepEqual(await service.claimInvitation(TOKEN, NOW), { status: 'expired' })
    assert.equal(fake.rows('invitations')[0].accepted_at, null)
  })

  it('adds the member with the invitation role; a duplicate membership is ok', async () => {
    const fake = seed([invitation({ role: 'admin' })])
    const claim = await service.claimInvitation(TOKEN, NOW)
    assert.equal(claim.status, 'claimed')
    if (claim.status !== 'claimed') return

    assert.deepEqual(await service.addInvitedMember(claim.invitation, 'user-1'), { ok: true })
    const members = fake.rows('studio_members')
    assert.equal(members.length, 1)
    assert.equal(members[0].studio_id, 'studio-a')
    assert.equal(members[0].role, 'admin')
  })

  it('releaseInvitation clears accepted_at', async () => {
    const fake = seed([invitation()])
    await service.claimInvitation(TOKEN, NOW)
    await service.releaseInvitation('inv-1')
    assert.equal(fake.rows('invitations')[0].accepted_at, null)
  })
})

// Guard for 028_rls_lockdown: anon has no table access any more, so a public
// page or route that reads a table with the anon key returns nothing in prod.
// Only these files may still import the anon client.
describe('no data access with the anon key', () => {
  const ALLOWED = new Set([
    'src/lib/studio-access.ts',
    // Replaced by a token-gated service-key version in PR #40.
    'src/app/api/loyalty/[memberId]/route.ts',
  ])

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path, out)
      else if (/\.(ts|tsx)$/.test(name)) out.push(path)
    }
    return out
  }

  it('anonSupabase is not used outside the allow-list', () => {
    const offenders = walk('src').filter((f) => !ALLOWED.has(f) && !f.endsWith('.test.ts') && readFileSync(f, 'utf8').includes('anonSupabase'))
    assert.deepEqual(offenders, [])
  })

  it('public pages do not use the cookie (anon) server client for data', () => {
    const publicDirs = ['src/app/join', 'src/app/refer', 'src/app/loyalty', 'src/app/pass', 'src/app/referral-success', 'src/app/(auth)/invite']
    const offenders = publicDirs.flatMap((d) => walk(d)).filter((f) => {
      const src = readFileSync(f, 'utf8')
      return src.includes("from '@/lib/supabase/server'") || src.includes("from '@/lib/supabase/client'")
    })
    assert.deepEqual(offenders, [])
  })
})
