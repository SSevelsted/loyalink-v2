'use client'

/// <reference types="react/canary" />
import { ViewTransition } from 'react'

/**
 * Wraps a page so it slides in from the right on forward navigation
 * and slides in from the left on back navigation. Pair with
 * `transitionTypes={['nav-forward']}` on the Link pushing forward, and
 * `transitionTypes={['nav-back']}` on the Link going back.
 *
 * Must be the outermost element of the page — no wrapping <div> above.
 */
export function DirectionalTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
