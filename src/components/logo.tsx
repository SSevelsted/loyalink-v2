export function LogoMark({ className, gradient = false }: { className?: string; gradient?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {gradient && (
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      )}
      <circle cx="8.5" cy="12" r="5.5" stroke={gradient ? "url(#logo-gradient)" : "currentColor"} strokeWidth="2.5" />
      <circle cx="15.5" cy="12" r="5.5" stroke={gradient ? "url(#logo-gradient)" : "currentColor"} strokeWidth="2.5" />
    </svg>
  )
}
