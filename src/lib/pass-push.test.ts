// Wallet pass pushes run after the response (Next.js after()), never as a
// dropped fire-and-forget. Run with `npm test`.
import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { setTestEnv } from '@/test/fake-supabase'

type PassPush = typeof import('./pass-push')

let passPush: PassPush
let calls: { url: string; method?: string; secret: string | null }[]
let respond: () => Promise<Response>
const originalFetch = globalThis.fetch

before(async () => {
  setTestEnv()
  passPush = await import('./pass-push')
})

beforeEach(() => {
  calls = []
  respond = async () => new Response('{}', { status: 200 })
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method,
      secret: new Headers(init?.headers).get('x-loyalink-internal-secret'),
    })
    return respond()
  }) as typeof fetch
  mock.method(console, 'error', () => {})
})

afterEach(() => {
  globalThis.fetch = originalFetch
  mock.restoreAll()
})

describe('schedulePassPush', () => {
  it('hands the push to the scheduler and sends nothing before the scheduler runs it', async () => {
    const tasks: (() => Promise<void>)[] = []
    passPush.pushCustomerPass('m1', (task) => { tasks.push(task) })

    assert.equal(tasks.length, 1, 'one task scheduled')
    assert.equal(calls.length, 0, 'no request before the response is sent')

    await tasks[0]()
    assert.deepEqual(calls, [{ url: 'http://pass.test/api/push/customer/m1', method: 'POST', secret: 'test-pass-secret' }])
  })

  it('studio push uses the studio route', async () => {
    const tasks: (() => Promise<void>)[] = []
    passPush.pushStudioPasses('s1', (task) => { tasks.push(task) })
    await tasks[0]()
    assert.deepEqual(calls.map((c) => c.url), ['http://pass.test/api/push/studio/s1'])
  })

  it('runs the push at once when the scheduler throws (outside a request scope)', () => {
    passPush.pushCustomerPass('m2', () => { throw new Error('`after` was called outside a request scope') })
    assert.deepEqual(calls.map((c) => c.url), ['http://pass.test/api/push/customer/m2'])
  })

  it('with the default scheduler, a call outside a request scope still sends the push', () => {
    passPush.pushCustomerPass('m3')
    assert.deepEqual(calls.map((c) => c.url), ['http://pass.test/api/push/customer/m3'])
  })
})

describe('runPassPush', () => {
  it('logs and resolves when pass-service is unreachable', async () => {
    respond = async () => { throw new Error('ECONNRESET') }
    await assert.doesNotReject(passPush.runPassPush('/api/push/customer/m1'))
    const logged = (console.error as unknown as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls
    assert.equal(logged.length, 1)
    assert.match(String(logged[0].arguments[0]), /\/api\/push\/customer\/m1 failed: ECONNRESET/)
  })

  it('logs a non-2xx answer', async () => {
    respond = async () => new Response('nope', { status: 502 })
    await passPush.runPassPush('/api/push/customer/m1')
    const logged = (console.error as unknown as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls
    assert.match(String(logged[0].arguments[0]), /pass-service 502/)
  })

  it('logs nothing on success', async () => {
    await passPush.runPassPush('/api/push/customer/m1')
    const logged = (console.error as unknown as { mock: { calls: unknown[] } }).mock.calls
    assert.equal(logged.length, 0)
  })
})
