#!/usr/bin/env node
// Copy shared mobile-only assets (e.g. the branded error page used by
// Capacitor's server.errorPath) into the gitignored platform asset folders.
// Run after `npx cap sync`, which clears those folders.

import { cp, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'mobile-assets')

const targets = [
  join(root, 'android/app/src/main/assets/public'),
  join(root, 'ios/App/App/public'),
]

for (const target of targets) {
  await mkdir(target, { recursive: true })
  await cp(source, target, { recursive: true, force: true })
  console.log(`copied mobile-assets → ${target}`)
}
