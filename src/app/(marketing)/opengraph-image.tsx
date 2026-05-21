import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Loyalink — Loyalty for Tattoo Studios'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '80px 96px',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(circle at 80% 20%, rgba(168,85,247,0.25), transparent 60%), radial-gradient(circle at 10% 100%, rgba(124,58,237,0.22), transparent 55%)',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <circle cx="8.5" cy="12" r="5.5" stroke="url(#g)" strokeWidth="2.5" />
          <circle cx="15.5" cy="12" r="5.5" stroke="url(#g)" strokeWidth="2.5" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              marginBottom: 24,
            }}
          >
            Loyalty for Tattoo Studios
          </div>
          <div
            style={{
              fontSize: 34,
              color: '#a1a1aa',
              lineHeight: 1.3,
              maxWidth: 960,
            }}
          >
            Cashback, wallet passes, and referrals — built to keep clients coming back.
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#a855f7',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          loyalink.ai
        </div>
      </div>
    ),
    { ...size }
  )
}
