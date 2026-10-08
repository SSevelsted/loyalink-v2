import { after } from 'next/server'
import { passServiceFetch } from '@/lib/pass-service'

type Schedule = (task: () => Promise<void>) => void

/**
 * POST a pass-service push and never throw. A failure is logged, not raised:
 * the write that triggered the push has already succeeded.
 */
export async function runPassPush(path: string): Promise<void> {
  try {
    const res = await passServiceFetch(path, { method: 'POST' })
    if (!res.ok) console.error(`[pass-push] ${path} failed: pass-service ${res.status}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[pass-push] ${path} failed: ${message}`)
  }
}

/**
 * Refresh wallet passes after the response is sent.
 *
 * A bare `void passServiceFetch(...)` is dropped on Vercel: the function is
 * frozen once the response goes out, so the push never reaches pass-service
 * and the member's Apple/Google card keeps the old tier, balance or link.
 * after() keeps the function alive until the push settles.
 *
 * Outside a request scope (scripts, unit tests) after() throws; the push then
 * runs as a plain un-awaited promise, which is fine in a long-lived process.
 */
export function schedulePassPush(path: string, schedule: Schedule = after): void {
  const task = () => runPassPush(path)
  try {
    schedule(task)
  } catch {
    void task()
  }
}

/** Refresh one member's pass after the response. */
export function pushCustomerPass(customerId: string, schedule?: Schedule): void {
  schedulePassPush(`/api/push/customer/${customerId}`, schedule)
}

/** Refresh every pass of a studio after the response. */
export function pushStudioPasses(studioId: string, schedule?: Schedule): void {
  schedulePassPush(`/api/push/studio/${studioId}`, schedule)
}
