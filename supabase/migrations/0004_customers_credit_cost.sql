-- Kirana Billing: cost-price snapshots, customers, and credit sales.
-- See PROJECT_SPEC_ADDENDUM.md, Phase 9 (cost price and profit) and
-- Phase 11 (customers and credit). Run after 0003_bill_pdf_storage.sql.

-- Defensive: ad hoc SQL-editor experimentation while prototyping this
-- addendum left orphaned create_bill/adjust_stock/restock_variant overloads
-- live with signatures that don't match any committed migration. Drop every
-- overload by name before recreating, so this migration is safe to run
-- regardless of that history.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('create_bill', 'adjust_stock', 'restock_variant')
  loop
    execute format('drop function %s', r.sig);
  end loop;
end $$;

-- BILL ITEMS: snapshot the cost price at sale time, so profit can be
-- computed later even after a variant's cost_price changes.
alter table bill_items add column cost_price_snapshot numeric(10,2);

-- CUSTOMERS
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customers_name on customers(name);

-- PAYMENTS (recorded against a customer's running balance, not a specific bill)
create table payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);
create index idx_payments_customer on payments(customer_id);

-- BILLS: optional link to a saved customer. Nullable on purpose, see "Why
-- customer_id is nullable on bills" in PROJECT_SPEC_ADDENDUM.md: a walk-in
-- sale keeps using the free-text customer_name/customer_phone snapshot
-- fields exactly as before.
alter table bills add column customer_id uuid references customers(id) on delete set null;

-- ATOMIC BILL CREATION, now customer- and cost-aware.
create or replace function create_bill(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_discount numeric,
  p_notes text,
  p_items jsonb,  -- [{ "variant_id": "...", "quantity": 2 }, ...]
  p_payment_status text default 'paid',
  p_amount_paid numeric default null
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
  v_amount_paid numeric;
begin
  v_bill_number := 'INV-' || lpad(nextval('bill_number_seq')::text, 4, '0');

  insert into bills (bill_number, customer_id, customer_name, customer_phone, discount, payment_status, amount_paid)
  values (v_bill_number, p_customer_id, p_customer_name, p_customer_phone, coalesce(p_discount, 0), coalesce(p_payment_status, 'paid'), 0)
  returning id into v_bill_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select v.id, v.product_id, v.label, v.unit_price, v.cost_price, v.track_stock, v.current_stock
      into v_variant
      from variants v
      where v.id = (v_item->>'variant_id')::uuid;

    v_qty := (v_item->>'quantity')::numeric;
    v_line_subtotal := v_variant.unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_subtotal;

    insert into bill_items (bill_id, variant_id, product_name_snapshot, variant_label_snapshot, unit_price_snapshot, cost_price_snapshot, quantity, subtotal)
    select v_bill_id, v_variant.id, p.name, v_variant.label, v_variant.unit_price, v_variant.cost_price, v_qty, v_line_subtotal
    from products p where p.id = v_variant.product_id;

    if v_variant.track_stock then
      update variants set current_stock = current_stock - v_qty, updated_at = now()
      where id = v_variant.id;

      insert into stock_movements (variant_id, change_qty, movement_type, reference_bill_id)
      values (v_variant.id, -v_qty, 'sale', v_bill_id);
    end if;
  end loop;

  v_total := v_subtotal - coalesce(p_discount, 0);
  v_amount_paid := coalesce(
    p_amount_paid,
    case when coalesce(p_payment_status, 'paid') = 'paid' then v_total else 0 end
  );

  update bills set subtotal = v_subtotal, total = v_total, amount_paid = v_amount_paid
  where id = v_bill_id;

  return query select v_bill_id, v_bill_number, v_total;
end;
$$;

-- Fully-qualified grant: an unqualified "grant execute on function
-- create_bill" is ambiguous the moment more than one overload exists.
grant execute on function create_bill(uuid, text, text, numeric, text, jsonb, text, numeric) to anon, authenticated;
