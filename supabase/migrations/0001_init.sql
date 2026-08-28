-- Aniyathi Mart: initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

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

-- BILL ITEMS (snapshotted, never joins back to live price)
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
  shop_name text not null default 'Aniyathi Mart',
  address text,
  phone text,
  logo_url text default '/favicon.png',
  constraint single_row check (id = 1)
);
insert into shop_settings (id) values (1);

-- ATOMIC BILL CREATION
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
