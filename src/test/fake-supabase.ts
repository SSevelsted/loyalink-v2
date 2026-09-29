// In-memory stand-in for the supabase-js query builder, for node:test suites.
//
// Tests seed tables, patch `adminSupabase.from` with `fake.from`, run the
// service, and assert on the resulting rows. Asserting on state (not on the
// exact query shape) lets one test run against both old and new code.
//
// Supported: select / insert / update / delete; eq, neq, in, is, gt, gte, lt,
// lte, not(col, 'in' | 'is' | 'eq', value); order, range, limit; single,
// maybeSingle; `.select()` after a write returns the written rows. Like
// PostgREST, neq and the range filters never match NULL, and a select returns
// at most 1000 rows. member_promotions enforces one active promotion per
// customer (the unique index in prod).
import { randomUUID } from 'node:crypto'

export type Row = Record<string, unknown>
export type Tables = Record<string, Row[]>
type Op = 'select' | 'insert' | 'update' | 'delete'
type Result = { data: unknown; error: { message: string; code?: string } | null }

export type FakeCall = {
  table: string
  op: Op
  payload?: unknown
  filters: Array<[column: string, operator: string, value: unknown]>
}

export type FailRule = {
  table: string
  op: Op
  message: string
  /** Fail only the calls this returns true for. Default: every matching call. */
  when?: (call: FakeCall) => boolean
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a === 'object' || typeof b === 'object') return false
  return String(a) === String(b)
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' || typeof b === 'number') return Number(a) - Number(b)
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}

function parseList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  return String(value).replace(/^\(|\)$/g, '').split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
}

type FakeOptions = {
  fail?: FailRule[]
  /** Runs before each call executes; may change `tables` to simulate a concurrent writer. */
  beforeExecute?: (call: FakeCall, tables: Tables) => void
  /** PostgREST's max-rows cap on a select. Default 1000, as in prod. */
  maxRows?: number
}

export function createFakeSupabase(seed: Tables, options: FakeOptions = {}) {
  const tables: Tables = structuredClone(seed)
  const calls: FakeCall[] = []

  const rows = (table: string): Row[] => (tables[table] ??= [])

  function from(table: string) {
    const call: FakeCall = { table, op: 'select', filters: [] }
    const predicates: Array<(row: Row) => boolean> = []
    let returning = false
    let orderBy: { column: string; ascending: boolean } | null = null
    let range: [number, number] | null = null

    const filter = (column: string, operator: string, value: unknown, test: (row: Row) => boolean) => {
      call.filters.push([column, operator, value])
      predicates.push(test)
      return builder
    }

    const execute = (): Result => {
      calls.push(call)
      options.beforeExecute?.(call, tables)
      const failure = options.fail?.find((f) => f.table === table && f.op === call.op && (!f.when || f.when(call)))
      if (failure) return { data: null, error: { message: failure.message } }

      const matches = () => rows(table).filter((row) => predicates.every((p) => p(row)))

      switch (call.op) {
        case 'select': {
          let out = matches()
          if (orderBy) {
            const { column, ascending } = orderBy
            out = [...out].sort((a, b) => compare(a[column], b[column]) * (ascending ? 1 : -1))
          }
          if (range) out = out.slice(range[0], range[1] + 1)
          out = out.slice(0, options.maxRows ?? 1000)
          return { data: structuredClone(out), error: null }
        }
        case 'insert': {
          const input = (Array.isArray(call.payload) ? call.payload : [call.payload]) as Row[]
          const inserted: Row[] = input.map((r) => ({ id: randomUUID(), created_at: new Date().toISOString(), ...r }))
          if (table === 'member_promotions') {
            for (const r of inserted) {
              const clash = r.status === 'active'
                && rows(table).some((p) => p.status === 'active' && p.customer_id === r.customer_id)
              if (clash) return { data: null, error: { message: 'duplicate key', code: '23505' } }
            }
          }
          rows(table).push(...inserted)
          return { data: returning ? structuredClone(inserted) : null, error: null }
        }
        case 'update': {
          const matched = matches()
          for (const row of matched) Object.assign(row, structuredClone(call.payload as Row))
          return { data: returning ? structuredClone(matched) : null, error: null }
        }
        case 'delete': {
          const matched = matches()
          tables[table] = rows(table).filter((row) => !matched.includes(row))
          return { data: returning ? structuredClone(matched) : null, error: null }
        }
      }
    }

    const asSingle = (maybe: boolean): Result => {
      const result = execute()
      if (result.error) return result
      const list = Array.isArray(result.data) ? result.data : []
      if (list.length === 1) return { data: list[0], error: null }
      if (list.length === 0 && maybe) return { data: null, error: null }
      return {
        data: null,
        error: { code: 'PGRST116', message: `JSON object requested, ${list.length} rows returned` },
      }
    }

    const builder = {
      select: () => {
        if (call.op !== 'select') returning = true
        return builder
      },
      insert: (payload: unknown) => {
        call.op = 'insert'
        call.payload = payload
        return builder
      },
      update: (payload: unknown) => {
        call.op = 'update'
        call.payload = payload
        return builder
      },
      delete: () => {
        call.op = 'delete'
        return builder
      },
      eq: (c: string, v: unknown) => filter(c, 'eq', v, (r) => same(r[c], v)),
      neq: (c: string, v: unknown) => filter(c, 'neq', v, (r) => r[c] != null && !same(r[c], v)),
      in: (c: string, v: unknown[]) => filter(c, 'in', v, (r) => v.some((x) => same(r[c], x))),
      is: (c: string, v: unknown) => filter(c, 'is', v, (r) => (v === null ? r[c] == null : r[c] === v)),
      gt: (c: string, v: unknown) => filter(c, 'gt', v, (r) => r[c] != null && compare(r[c], v) > 0),
      gte: (c: string, v: unknown) => filter(c, 'gte', v, (r) => r[c] != null && compare(r[c], v) >= 0),
      lt: (c: string, v: unknown) => filter(c, 'lt', v, (r) => r[c] != null && compare(r[c], v) < 0),
      lte: (c: string, v: unknown) => filter(c, 'lte', v, (r) => r[c] != null && compare(r[c], v) <= 0),
      not: (c: string, operator: string, v: unknown) =>
        filter(c, `not.${operator}`, v, (r) => {
          if (operator === 'in') return !parseList(v).some((x) => same(r[c], x))
          if (operator === 'is') return v === null ? r[c] != null : r[c] !== v
          if (operator === 'eq') return !same(r[c], v)
          throw new Error(`fake-supabase: not.${operator} is not supported`)
        }),
      order: (column: string, opts?: { ascending?: boolean }) => {
        orderBy = { column, ascending: opts?.ascending ?? true }
        return builder
      },
      range: (a: number, b: number) => {
        range = [a, b]
        return builder
      },
      limit: (n: number) => {
        range = [0, n - 1]
        return builder
      },
      single: async () => asSingle(false),
      maybeSingle: async () => asSingle(true),
      then: (onFulfilled: (r: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve().then(execute).then(onFulfilled, onRejected),
    }
    return builder
  }

  return {
    from,
    tables,
    calls,
    rows,
    /** The single row in `table` whose `id` is `id`. Throws when absent. */
    row(table: string, id: string): Row {
      const found = rows(table).find((r) => r.id === id)
      if (!found) throw new Error(`fake-supabase: no ${table} row with id ${id}`)
      return found
    },
    writes: (table: string) => calls.filter((c) => c.table === table && c.op !== 'select'),
  }
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>

/**
 * Point a real supabase-js client (adminSupabase) at the fake. Import
 * `@/lib/studio-access` BEFORE the service under test: with tsx the reverse
 * order can give the service its own adminSupabase instance.
 */
export function wireFake(client: object, fake: FakeSupabase) {
  Object.assign(client, { from: fake.from })
}

/** Env the service modules read at import time. Unsets email + legacy PassKit so nothing leaves the process. */
export function setTestEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
  process.env.PASS_SERVICE_SECRET ??= 'test-pass-secret'
  process.env.NEXT_PUBLIC_PASS_SERVICE_URL = 'http://pass.test'
  delete process.env.RESEND_API_KEY
  delete process.env.LEGACY_LOYALTY_SUPABASE_URL
  delete process.env.LEGACY_LOYALTY_SERVICE_ROLE_KEY
}

/** Replace global fetch with a recorder. Returns the recorded URLs and a restore function. */
export function stubFetch() {
  const original = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input))
    return new Response('{}', { status: 200 })
  }) as typeof fetch
  return { urls, restore: () => { globalThis.fetch = original } }
}
