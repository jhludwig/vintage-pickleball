/**
 * One-time script to load VintageMembers.md into the Supabase players table.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=your-service-role-key \
 *   node scripts/import-members.mjs
 *
 * The service role key (not the anon key) is required to bypass RLS.
 * Find it in Supabase → Project Settings → API → service_role secret.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(url, key)

const raw = readFileSync('docs/VintageMembers.md', 'utf8')
const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

const players = []
const skipped = []

for (const line of lines) {
  const parts = line.split(',').map(s => s.trim())
  if (parts.length < 5) {
    skipped.push(line)
    continue
  }
  const [last_name, first_name, gender, active, rating] = parts
  players.push({
    last_name,
    first_name,
    gender: gender || null,
    plays_pickleball: active.toUpperCase() === 'Y',
    ranking: rating && rating !== '0' ? rating : '',
    player_type: 'member',
  })
}

if (skipped.length > 0) {
  console.warn('Skipped malformed rows:')
  skipped.forEach(l => console.warn(' ', l))
}

console.log(`Parsed ${players.length} members`)

// Clear existing players
const { error: delError } = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')
if (delError) { console.error('Failed to clear players:', delError.message); process.exit(1) }

// Insert in batches of 100
const BATCH = 100
for (let i = 0; i < players.length; i += BATCH) {
  const batch = players.slice(i, i + BATCH)
  const { error } = await supabase.from('players').insert(batch)
  if (error) { console.error(`Batch ${i / BATCH + 1} failed:`, error.message); process.exit(1) }
  console.log(`Inserted rows ${i + 1}–${Math.min(i + BATCH, players.length)}`)
}

console.log('Done.')
