# Commands

npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
cd pass-service && npm run dev  # Wallet pass service

# Architecture

- Path alias: `@/*` → `./src/*`
- Supabase client: use `client.ts` in client components, `server.ts` in server/API routes
- Route groups: `(auth)` login/invite, `(dashboard)` protected, `join/[slug]` public
- Pass service: separate Express app in `pass-service/` (Apple/Google Wallet)
- DB types: `src/types/database.ts`

# Design System

- IMPORTANT: Use shadcn/ui (New York style, neutral base, CSS variables) via `npx shadcn@latest add <component>`
- Always check existing components in `src/components/ui/` before adding new ones
- Installed: avatar, badge, button, card, command, dialog, dropdown-menu, input, label, popover, select, separator, sheet, sidebar, skeleton, sonner, table, tabs, textarea, tooltip
- Tailwind CSS 4 for all styling. No inline styles, no CSS modules
- Icons: Lucide React only
- Toasts: Sonner only
- Dark mode via next-themes — all components must work in both modes

# Language

- UI text: English by default. Studio language is set during onboarding.
- Code, comments, variable names, commits: always English.

# UX Standards

When building user-facing features, proactively apply modern SaaS best practices:
- Forms: all fields required by default, proper validation, country picker for phone/address, formatted phone numbers (spaces every 3-4 digits), email validation
- Inputs: appropriate input types (tel, email, url), autocomplete attributes, placeholder examples
- Feedback: loading states, success/error toasts, disabled submit buttons while processing
- Accessibility: proper labels, focus management, keyboard navigation
- Do not wait to be asked — if a feature is missing obvious UX polish, add it

# Rules

- YOU MUST reuse existing hooks, components, and utilities before creating new ones
- Do not add dependencies without explicit approval
- Keep changes focused but include necessary UX improvements
