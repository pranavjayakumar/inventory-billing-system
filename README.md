# Kirana Billing

A mobile-first billing and inventory app for a small grocery/general store. React + Vite + TypeScript + Tailwind, Supabase (Postgres) as the backend, PDFs generated client-side.

## Setup

1. Create a Supabase project.
2. Run the SQL files in [supabase/migrations/](supabase/migrations/) in order, in the Supabase SQL editor.
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and publishable/anon key (Project Settings → API).
4. `npm install && npm run dev`

## ⚠️ Security: no auth, no RLS (v1)

This app has **no login and no Row Level Security** — every table is open to anyone with the anon/publishable key, and that key is bundled into the client-side app. This is intentional for v1: a single shop owner, no multi-tenant or public-facing use.

**Do not** deploy this publicly or let it hold data for more than one shop until auth + RLS policies are added (see "Not in v1" in the build plan — this is a Supabase Auth toggle plus an RLS policy pass, not a rework).

## Stack

See the build plan for the full spec, schema, and phase-by-phase build notes.
