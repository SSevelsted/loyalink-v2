#!/usr/bin/env node
/**
 * Generates the ES256-signed JWT that Supabase wants in
 * Authentication → Providers → Apple → "Secret Key (for OAuth)".
 *
 * Zero dependencies — uses Node's built-in crypto module only.
 * Apple caps the validity at ~6 months, so this JWT must be regenerated
 * every 180 days.
 *
 * Usage:
 *   TEAM_ID=XXXXXXXXXX SERVICE_ID=ai.loyalink.app.signin \
 *     node scripts/gen-apple-jwt.mjs <path-to-AuthKey_XXX.p8>
 *
 * Key ID is parsed from the filename (AuthKey_<KEY_ID>.p8).
 * On macOS the JWT is copied to the clipboard automatically.
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { createSign } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const [, , p8Path] = process.argv
const { TEAM_ID, SERVICE_ID, KEY_ID: KEY_ID_ENV } = process.env

if (!p8Path) fail('Pass the .p8 file path as the first argument.')
if (!TEAM_ID) fail('Set TEAM_ID (10-char Apple Team ID from the top-right of Apple Developer).')
if (!SERVICE_ID) fail('Set SERVICE_ID (your Sign in with Apple Services ID, e.g. ai.loyalink.app.signin).')

const keyIdFromFilename = basename(p8Path).match(/AuthKey_([A-Z0-9]+)\.p8$/)?.[1]
const KEY_ID = KEY_ID_ENV ?? keyIdFromFilename
if (!KEY_ID) fail('Could not infer Key ID from filename. Set KEY_ID env var or rename file to AuthKey_<KEY_ID>.p8.')

const privateKey = readFileSync(p8Path, 'utf8')

const now = Math.floor(Date.now() / 1000)
const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' }
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + 60 * 60 * 24 * 180,
  aud: 'https://appleid.apple.com',
  sub: SERVICE_ID,
}

const encodedHeader = b64url(JSON.stringify(header))
const encodedPayload = b64url(JSON.stringify(payload))
const signingInput = `${encodedHeader}.${encodedPayload}`

const signer = createSign('SHA256')
signer.update(signingInput)
signer.end()
const derSignature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
const encodedSignature = b64url(derSignature)

const jwt = `${signingInput}.${encodedSignature}`

console.log(jwt)
console.log('')
console.log(`Expires: ${new Date(payload.exp * 1000).toISOString()} (${Math.floor((payload.exp - now) / 86400)} days)`)

if (process.platform === 'darwin') {
  const pb = spawnSync('pbcopy', { input: jwt })
  if (pb.status === 0) console.log('Copied to clipboard. Paste it into Supabase now.')
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function fail(msg) {
  console.error(`Error: ${msg}`)
  process.exit(1)
}
