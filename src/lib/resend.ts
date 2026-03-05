import { Resend } from 'resend'

// Server-side only — never import in client components
// Lazily instantiated so missing env var during build doesn't crash module evaluation
let _resend: Resend | null = null
export function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export const FROM = process.env.RESEND_FROM_EMAIL ?? 'Loyalink <hello@loyalink.ai>'
