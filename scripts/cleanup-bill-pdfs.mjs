#!/usr/bin/env node
// Deletes bill PDFs from Supabase Storage older than BILL_PDF_RETENTION_DAYS.
//
// Safe to run any time: the PDF in Storage is just a cache of what
// generateBillPdf() can always rebuild from the bills/bill_items tables.
// Deleting one doesn't touch bill history: if someone later clicks
// Copy link / Share on an old bill, the app re-uploads a fresh PDF to the
// same path automatically (see uploadBillPdf in src/lib/pdf.ts).
//
// Requires the SERVICE ROLE key (not the anon key) since deleting storage
// objects needs to bypass the RLS policies that intentionally keep the
// anon/client role read+upload only. Get it from:
//   Supabase dashboard -> Project Settings -> API -> service_role key
//
// Usage:
//   node --env-file=.env.scripts.local scripts/cleanup-bill-pdfs.mjs [--dry-run]
//
// .env.scripts.local (gitignored, matches the existing *.local rule):
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   BILL_PDF_RETENTION_DAYS=180   # optional, defaults to 180

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RETENTION_DAYS = Number(process.env.BILL_PDF_RETENTION_DAYS ?? 180)
const DRY_RUN = process.argv.includes('--dry-run')
const BUCKET = 'bills'
const PAGE_SIZE = 1000

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Put them in .env.scripts.local (gitignored) and run with:\n' +
      '  node --env-file=.env.scripts.local scripts/cleanup-bill-pdfs.mjs',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function listAllObjects() {
  const all = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: PAGE_SIZE, offset, sortBy: { column: 'created_at', order: 'asc' } })
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return all
}

const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

const objects = await listAllObjects()
const stale = objects.filter((obj) => obj.created_at && new Date(obj.created_at) < cutoff)

console.log(
  `${objects.length} PDF(s) in "${BUCKET}", ${stale.length} older than ${RETENTION_DAYS} days (before ${cutoff.toISOString()}).`,
)

if (stale.length === 0) {
  console.log('Nothing to delete.')
  process.exit(0)
}

if (DRY_RUN) {
  console.log('Dry run, would delete:')
  for (const obj of stale) console.log(`  ${obj.name}  (created ${obj.created_at})`)
  process.exit(0)
}

const { data: removed, error: removeError } = await supabase.storage
  .from(BUCKET)
  .remove(stale.map((obj) => obj.name))
if (removeError) {
  console.error('Delete failed:', removeError.message)
  process.exit(1)
}

console.log(`Deleted ${removed?.length ?? stale.length} PDF(s) older than ${RETENTION_DAYS} days.`)
