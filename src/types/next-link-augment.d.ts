/* Augment next/link to expose the experimental transitionTypes prop.
   Required because @types/next doesn't yet surface the experimental
   viewTransition API even though it exists at runtime. */

import 'next/link'

declare module 'next/link' {
  interface LinkProps {
    transitionTypes?: string[]
  }
}
