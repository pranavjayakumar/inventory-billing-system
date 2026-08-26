# Kirana Billing: build plan

A mobile-first billing and inventory app for a small grocery/general store owner (sugar, tea, spices, and similar staples). Single shop owner, no login in v1, generates shareable PDF bills, tracks stock only where it makes sense to.

## 0. How to use this document

This is a working spec for an implementing agent (Claude Code or similar) to build against. Rules for the build:

- **Work phase by phase, in order.** Each phase in section 8 ends with a checkpoint. Stop there, summarize what was built and how to check it, and wait for the human to confirm before starting the next phase. Don't batch multiple phases into one pass.
- **Don't invent scope.** If something is ambiguous, make the simplest reasonable choice, note the assumption out loud, and keep moving. Don't stall on it.
- Everything in section 9 ("Not in v1") is explicitly deferred. Don't build it, don't scaffold for it beyond the schema fields already designed to allow it later.
- The database is the source of truth for structure: implement section 5 exactly, including constraints.

---

## 1. Project summary

- **User**: one shop owner, using this on their phone, mid-delivery or at the counter.
- **Core loop**: add products with one or more variants (e.g. "Tata Tea (250g)", "Tata Tea (1kg)") → when delivering an order, build a bill by picking variants and quantities → generate a PDF → share it on WhatsApp.
- **Stock is optional per variant.** Packaged/branded items (a sealed 1kg bag) get exact stock counts. Loose items scooped from a sack (loose sugar, loose tea) don't. The owner just never turns stock tracking on for that variant.
- **No customer database.** Customer name/phone are free-text fields on the bill itself, not a saved record.
- **No login in v1.** Add later without a rework (see section 9).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS |
| Hosting (frontend) | Vercel or Netlify (free tier) |
| Data | Supabase (Postgres), free tier, accessed directly from the frontend via `supabase-js` |
| Backend logic | A single Postgres RPC function (`create_bill`) for the one operation that needs atomicity. No separate server to host or deploy. |
| PDF | `jspdf` + `jspdf-autotable`, generated client-side |
| Data fetching/cache | `@tanstack/react-query` |
| Animation | `framer-motion` |
| Icons | `lucide-react` |
| Routing | `react-router-dom` |
| PWA | `vite-plugin-pwa` — installable to the home screen, works read-only offline |

No custom backend server. No auth. Keep the dependency list this short — don't add a state management library, a UI kit, or a CSS framework beyond Tailwind unless a specific task genuinely needs it.

---

## 3. Design system

Grounded in the actual world this app lives in: a kirana counter — steel spice tins, a paper bill book, a weighing scale, morning light on the shop counter. Not a generic SaaS-blue dashboard.

**Color** (use these exact hex values as Tailwind theme extensions, not defaults):

| Token | Hex | Use |
|---|---|---|
| `ink` | `#21261F` | Primary text |
| `paper` | `#F5F6F0` | App background |
| `surface` | `#FFFFFE` | Cards, sheets |
| `border` | `#DEDACD` | Dividers, hairlines |
| `turmeric` | `#D9A441` | Primary actions, active nav state, highlights |
| `cardamom` | `#4B7A5B` | Success, stock-tracked indicators, "paid" state |
| `chili` | `#C1462F` | Low-stock warnings, destructive actions, due amounts |

**Type**:
- Body, forms, data, nav labels: **Inter** — enable tabular figures (`font-variant-numeric: tabular-nums`) everywhere a number can change, so totals don't jitter as digits update.
- Headings, section titles: **Manrope**, medium/semibold only.
- One deliberate exception: the single largest number on screen at any moment — the running total on the New Bill screen, and "today's sales" on the dashboard — set in **Fraunces** (variable serif). This is the one place the app gets to feel warm and human instead of purely functional. Don't extend Fraunces anywhere else.

**Layout**: single column, centered, max content width ~480px even on wider screens. 16px base padding. Cards use `rounded-2xl` (16–20px). Minimum tap target 44×44px anywhere. Bottom nav is fixed, ~64px tall plus safe-area inset for iOS.

**Signature motif**: a torn-receipt edge — a jagged bottom border via `clip-path` — used on the bill preview card and, subtly, under the dashboard's "today" stat card. Nowhere else. One recognizable idea, used sparingly, not decoration scattered everywhere.

**Motion** (Framer Motion, respect `prefers-reduced-motion`):
- Tab switches: quick slide + fade, ~150ms.
- Bottom nav active indicator: a pill that slides between icons (`layoutId` shared transition), not an instant color swap.
- Adding an item to the bill cart: the row animates in (slide + fade), quantity steppers give a small tap-scale bounce.
- Bill generated: a checkmark draws itself in (stroke animation), then the receipt preview slides up.
- Toasts slide in from the top and auto-dismiss.
- Skeleton loaders instead of spinners for anything fetching data.

**Voice**: plain, direct, written from the owner's side of the counter. Buttons say what they do ("Generate bill," not "Submit"). Empty states are an invitation, not an apology — e.g. Products screen with nothing in it says "No products yet — add your first one" with the add action right there, not just "No data."

---

## 4. Screens & navigation

Bottom nav, 5 items, center one raised as a filled circular button:

1. **Home** — dashboard
2. **Products** — list, search, add/edit
3. **＋ New bill** (center, elevated) — the primary action, reachable from anywhere in one tap
4. **History** — past bills
5. **Settings** — shop name/address/phone/logo for the bill header

Screens in detail:

- **Home / Dashboard**: today's sales total (the Fraunces hero number), a small week/month trend, top-selling products, a low-stock list (any tracked variant under its alert threshold), and a short list of the most recent bills. One tap from here into "New bill."
- **Products**: searchable list, grouped by category if set. Each product card expands to show its variants inline. Floating add button opens the product form.
- **Add/Edit Product**: name, category, optional image. Below that, a repeatable variant row: label (e.g. "500g"), price, a "track stock" toggle that reveals a stock quantity + low-stock threshold field only when switched on.
- **New Bill**: search/browse products at the top, tap a variant to add it to the cart below with a quantity stepper. Running subtotal updates live. Optional customer name/phone fields, optional discount field. If a tracked variant's quantity exceeds current stock, show an inline warning but don't block the sale. "Generate bill" calls the `create_bill` RPC.
- **Bill success / preview**: rendered PDF preview, "Share" (Web Share API where available) and "Download" buttons.
- **History**: reverse-chronological list of bills, searchable by customer name or bill number, tap into any bill to re-view or re-share its PDF.
- **Settings**: shop name, address, phone, logo — stored in the single-row `shop_settings` table, used in the PDF header.

---

## 5. Database schema (Supabase / Postgres)

Run this as a migration in the Supabase SQL editor.

```sql
create extension if not exists pgcrypto;

-- PRODUCTS
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- VARIANTS
create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,                    -- "500g", "1kg", "100ml"
  unit_price numeric(10,2) not null check (unit_price >= 0),
  cost_price numeric(10,2),
  track_stock boolean not null default false,
  current_stock numeric(10,3),            -- null when track_stock is false
  low_stock_alert numeric(10,3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_requires_tracking check (
    (track_stock = false) or (track_stock = true and current_stock is not null)
  )
);
create index idx_variants_product on variants(product_id);

-- BILL NUMBERING
create sequence bill_number_seq start 1;

-- BILLS
create table bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  customer_name text,
  customer_phone text,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_status text not null default 'paid' check (payment_status in ('paid','due','partial')),
  amount_paid numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_bills_created on bills(created_at desc);

-- BILL ITEMS (snapshotted — never joins back to live price)
create table bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  variant_id uuid references variants(id) on delete set null,
  product_name_snapshot text not null,
  variant_label_snapshot text not null,
  unit_price_snapshot numeric(10,2) not null,
  quantity numeric(10,3) not null check (quantity > 0),
  subtotal numeric(10,2) not null
);
create index idx_bill_items_bill on bill_items(bill_id);

-- STOCK MOVEMENTS (audit trail)
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references variants(id) on delete cascade,
  change_qty numeric(10,3) not null,
  movement_type text not null check (movement_type in ('restock','sale','adjustment')),
  reference_bill_id uuid references bills(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index idx_stock_movements_variant on stock_movements(variant_id);

-- SHOP SETTINGS (single row)
create table shop_settings (
  id int primary key default 1,
  shop_name text not null default 'My Shop',
  address text,
  phone text,
  logo_url text,
  constraint single_row check (id = 1)
);
insert into shop_settings (id) values (1);
```

**Atomic bill creation** — the one place business logic lives outside the client:

```sql
create or replace function create_bill(
  p_customer_name text,
  p_customer_phone text,
  p_discount numeric,
  p_notes text,
  p_items jsonb  -- [{ "variant_id": "...", "quantity": 2 }, ...]
)
returns table (bill_id uuid, bill_number text, total numeric)
language plpgsql
as $$
declare
  v_bill_id uuid;
  v_bill_number text;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_variant record;
  v_qty numeric;
  v_line_subtotal numeric;
begin
  v_bill_number := 'INV-' || lpad(nextval('bill_number_seq')::text, 4, '0');

  insert into bills (bill_number, customer_name, customer_phone, discount, payment_status, amount_paid)
  values (v_bill_number, p_customer_name, p_customer_phone, coalesce(p_discount, 0), 'paid', 0)
  returning id into v_bill_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select v.id, v.product_id, v.label, v.unit_price, v.track_stock, v.current_stock
      into v_variant
      from variants v
      where v.id = (v_item->>'variant_id')::uuid;

    v_qty := (v_item->>'quantity')::numeric;
    v_line_subtotal := v_variant.unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_subtotal;

    insert into bill_items (bill_id, variant_id, product_name_snapshot, variant_label_snapshot, unit_price_snapshot, quantity, subtotal)
    select v_bill_id, v_variant.id, p.name, v_variant.label, v_variant.unit_price, v_qty, v_line_subtotal
    from products p where p.id = v_variant.product_id;

    if v_variant.track_stock then
      update variants set current_stock = current_stock - v_qty, updated_at = now()
      where id = v_variant.id;

      insert into stock_movements (variant_id, change_qty, movement_type, reference_bill_id)
      values (v_variant.id, -v_qty, 'sale', v_bill_id);
    end if;
  end loop;

  v_total := v_subtotal - coalesce(p_discount, 0);

  update bills set subtotal = v_subtotal, total = v_total, amount_paid = v_total
  where id = v_bill_id;

  return query select v_bill_id, v_bill_number, v_total;
end;
$$;
```

Called from the frontend as `supabase.rpc('create_bill', { p_customer_name, p_customer_phone, p_discount, p_notes, p_items })`.

**RLS**: leave off for v1 (no auth yet — see section 9). Note this explicitly in the README so it isn't forgotten before any public/multi-user use.

---

## 6. Environment setup

- Create a free Supabase project. Run the migration above in the SQL editor.
- `.env.local` in the frontend:
  ```
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...
  ```
- Deploy frontend to Vercel or Netlify, same env vars in the platform's dashboard.

---

## 7. Business logic notes

- **Stock warnings never block a sale.** Real shops oversell knowingly; the app informs, doesn't gatekeep.
- **Bill numbers** come from the Postgres sequence inside `create_bill` — never generate them client-side (avoids collisions).
- **Prices on a bill are always the snapshot in `bill_items`**, never a live lookup — so changing a product's price later never rewrites history.
- **`payment_status` / `amount_paid`** exist in the schema now but stay invisible in the v1 UI — every bill is created as `paid` in full. This is intentional groundwork for section 9, not a bug to "finish."

---

## 8. Build phases

Work through these in order. Stop after each and report what to check.

### Phase 0 — Project scaffold
- Vite + React + TS project, Tailwind configured with the tokens from section 3, fonts loaded (Inter, Manrope, Fraunces).
- Install: `react-router-dom`, `@tanstack/react-query`, `@supabase/supabase-js`, `framer-motion`, `lucide-react`, `jspdf`, `jspdf-autotable`, `vite-plugin-pwa`.
- Supabase client set up from env vars.
- Route skeleton + bottom nav shell (5 tabs, empty placeholder screens, working navigation, animated active-tab indicator).
- **Checkpoint**: app runs locally, bottom nav navigates between empty screens with the tab-switch animation working.

### Phase 1 — Database live
- Run the schema + `create_bill` function from section 5 in Supabase.
- Confirm via the Supabase table editor that all 6 tables exist with correct constraints.
- **Checkpoint**: you can see the empty tables in Supabase, and manually inserting a test product + variant works.

### Phase 2 — Products
- Product list screen: cards, expandable variants, search bar, empty state.
- Add/Edit product form with repeatable variant rows (track-stock toggle revealing stock fields).
- Delete/deactivate a product.
- **Checkpoint**: add a real product (e.g. "Tata Tea" with a 250g and a 1kg variant, one stock-tracked and one not), see it appear correctly in the list.

### Phase 3 — Billing flow
- New Bill screen: product/variant search, tap-to-add cart with quantity steppers, live subtotal/discount/total (Fraunces hero total), optional customer fields, non-blocking stock warning.
- Wire "Generate bill" to the `create_bill` RPC.
- **Checkpoint**: create a real bill end-to-end and confirm the row (and correctly snapshotted items) in Supabase.

### Phase 4 — PDF + share
- PDF generation from a completed bill (shop header from `shop_settings`, itemized table, total).
- Share (Web Share API) with download fallback.
- **Checkpoint**: generate and actually share/download a PDF that looks correct on a phone screen.

### Phase 5 — History
- Reverse-chronological bill list, search by customer/bill number, tap into a bill to re-view/re-share its PDF.
- **Checkpoint**: find and re-open the test bill from Phase 3.

### Phase 6 — Dashboard
- Today/week/month sales aggregates, top products, low-stock list, recent bills widget.
- **Checkpoint**: numbers on the dashboard match what's actually in Supabase for your test data.

### Phase 7 — Settings
- Shop name/address/phone/logo, persisted to `shop_settings`, reflected in the PDF header.
- **Checkpoint**: change the shop name, generate a new bill, confirm the PDF header updates.

### Phase 8 — Polish pass
- Full animation pass per section 3 (page transitions, cart item animation, success checkmark, toasts, skeleton loaders).
- Empty states everywhere (Products, History, Dashboard-with-no-sales).
- PWA install test on an actual phone.
- Accessibility pass: tap target sizes, color contrast, `prefers-reduced-motion` respected.
- **Checkpoint**: full walkthrough on a real phone — add a product, bill it, share it — feels smooth and finished.

---

## 9. Not in v1 (don't build yet)

- **Login/auth** — `payment_status`/`amount_paid` groundwork is already in the schema; adding real auth later is a Supabase Auth toggle plus an RLS policy pass, not a rework.
- **Credit/due tracking UI** — columns exist, UI doesn't yet.
- **Customer directory/history** — deliberately excluded per the owner's preference; bills stay standalone.
- **Voice-controlled bill entry** — Web Speech API, browser-native, no new backend needed when it's time.
- **CSV export / backups.**
