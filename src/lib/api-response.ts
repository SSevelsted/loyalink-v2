import { NextResponse } from 'next/server'

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function apiPaginated(
  data: unknown[],
  total: number,
  limit: number,
  offset: number,
) {
  return NextResponse.json({
    data,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    },
  })
}
