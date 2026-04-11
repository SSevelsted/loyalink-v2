import { escapeHtml } from '@/lib/escape-html'

export { escapeHtml }

/** Wrap email body HTML in the standard container */
export function emailWrapper(body: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111">${body}</div>`
}

/** Standard black CTA button */
export function ctaButton(text: string, href: string): string {
  return `<p style="margin:0 0 24px"><a href="${escapeHtml(href)}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">${escapeHtml(text)}</a></p>`
}

/** Small grey footer text */
export function footerNote(text: string): string {
  return `<p style="color:#888;font-size:13px;margin:16px 0 0">${text}</p>`
}

/** Sign-off line: "— Loyalink" or "— Name, Loyalink" */
export function signOff(name?: string): string {
  const line = name ? `${escapeHtml(name)}, Loyalink` : 'Loyalink'
  return `<p style="color:#555;margin:24px 0 0">&mdash; ${line}</p>`
}

/** Heading (h2) */
export function heading(text: string): string {
  return `<h2 style="font-size:20px;font-weight:600;margin:0 0 8px">${escapeHtml(text)}</h2>`
}

/** Greeting paragraph: "Hey {name}," */
export function greeting(name: string): string {
  return `<p style="color:#555;margin:0 0 16px">Hey ${escapeHtml(name)},</p>`
}

/** Standard body paragraph */
export function p(html: string): string {
  return `<p style="color:#555;margin:0 0 16px">${html}</p>`
}

/** Bullet list from array of HTML strings */
export function bulletList(items: string[]): string {
  const lis = items.map(i => `<li style="color:#555;margin:0 0 6px">${i}</li>`).join('')
  return `<ul style="padding-left:20px;margin:0 0 16px">${lis}</ul>`
}

/** Green highlight banner (e.g. tier upgrade) */
export function successBanner(html: string): string {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:0 0 20px;text-align:center"><p style="margin:0;font-weight:600;color:#16a34a">${html}</p></div>`
}

/** Format a currency amount: "500 kr" */
export function fmtAmount(amount: number, currency: string = 'kr'): string {
  return `${Math.round(amount)} ${escapeHtml(currency)}`
}
