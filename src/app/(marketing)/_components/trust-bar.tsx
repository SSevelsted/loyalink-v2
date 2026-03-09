'use client'

import { useEffect, useRef, useState } from 'react'

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1500
          const start = Date.now()
          const tick = () => {
            const progress = Math.min((Date.now() - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * end))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [end])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const stats = [
  { value: 200, suffix: '+', label: 'Studios' },
  { value: 50000, suffix: '+', label: 'Members' },
  { value: 2, prefix: '€', suffix: 'M+', label: 'Cashback earned' },
  { value: 4.9, suffix: '★', label: 'Rating' },
]

export function TrustBar() {
  return (
    <section className="border-y border-border/40 bg-muted/10 py-10 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {stat.prefix ?? ''}
              <Counter end={stat.value} suffix={stat.suffix ?? ''} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
