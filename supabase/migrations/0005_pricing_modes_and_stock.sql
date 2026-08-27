-- Kirana Billing: rate-priced products and non-bill stock changes.
-- See PROJECT_SPEC_V2.md, Phase 9 (revised): pricing modes and
-- Phase 10 (revised): stock handling. Run after 0004_customers_credit_cost.sql.

-- PRODUCTS: a product is either "fixed" (priced per variant, unchanged) or
-- "rate" (priced per base unit, quick-pick quantities, no variants). Rate
-- mode also gets its own stock pool directly on the product, since there's
-- no variant row to hang current_stock off of.
alter table products add column pricing_mode text not null default 'fixed' check (pricing_mode in ('fixed', 'rate'));
alter table products add column rate_unit text check (rate_unit in ('kg', 'g', 'L', 'ml', 'pcs'));
alter table products add column rate_sell_price numeric(10,2);
alter table products add column rate_cost_price numeric(10,2);
alter table products add column rate_quick_picks numeric(10,3)[];
alter table products add column track_stock boolean not null default false;
alter table products add column current_stock numeric(10,3);
alter table products add column low_stock_alert numeric(10,3);
alter table products add constraint rate_stock_requires_tracking check (
  (track_stock = false) or (track_stock = true and current_stock is not null)
);

-- BILL ITEMS: a rate-mode sale has no variant_id, so bill_items needs a
-- direct product_id to know what was sold (fixed-mode items get it too,
-- denormalized, so a line item is never dependent on the variant surviving).
alter table bill_items add column product_id uuid references products(id) on delete set null;
alter table bill_items alter column variant_label_snapshot drop not null;

-- STOCK MOVEMENTS: a restock/adjustment can target a variant (fixed mode)
-- or a product's pool (rate mode), never neither or both.
alter table stock_movements add column product_id uuid references products(id) on delete cascade;
alter table stock_movements alter column variant_id drop not null;
alter table stock_movements add constraint stock_movements_one_target check (
  (variant_id is not null and product_id is null) or (variant_id is null and product_id is not null)
);

-- Non-sale stock changes: restocking (goods arrived) or correcting a count
-- (spillage, breakage, miscount). Sales still adjust stock inline inside
-- create_bill below, this is for everything that isn't a sale.
create or replace function adjust_stock(
  p_change_qty numeric,
  p_movement_type text,
  p_variant_id uuid default null,
  p_product_id uuid default null,
  p_note text default null
)
returns void
language plpgsql
as $$
begin
  if p_movement_type not in ('restock', 'adjustment') then
    raise exception 'movement_type must be restock or adjustment';
  end if;

  if p_variant_id is not null then
    update variants set current_stock = coalesce(current_stock, 0) + p_change_qty, updated_at = now()
    where id = p_variant_id;
  elsif p_product_id is not null then
    update products set current_stock = coalesce(current_stock, 0) + p_change_qty, updated_at = now()
    where id = p_product_id;
  else
    raise exception 'Provide either a variant or a product to adjust.';
  end if;

  insert into stock_movements (variant_id, product_id, change_qty, movement_type, note)
  values (p_variant_id, p_product_id, p_change_qty, p_movement_type, p_note);
end;
$$;

-- ATOMIC BILL CREATION, now handling both fixed (variant) and rate
-- (product, quantity, free-text label) line items in the same p_items array.
create or replace function create_bill(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_discount numeric,
  p_notes text,
  p_items jsonb,
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
  v_variant_id uuid;
  v_product_id uuid;
  v_qty numeric;
  v_label text;
  v_unit_price numeric;
  v_cost_price numeric;
  v_product_name text;
  v_variant record;
  v_product record;
  v_amount_paid numeric;
begin
  v_bill_number := 'INV-' || lpad(nextval('bill_number_seq')::text, 4, '0');

  insert into bills (bill_number, customer_id, customer_name, customer_phone, discount, payment_status, amount_paid)
  values (v_bill_number, p_customer_id, p_customer_name, p_customer_phone, coalesce(p_discount, 0), coalesce(p_payment_status, 'paid'), 0)
  returning id into v_bill_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;

    if v_variant_id is not null then
      select id, product_id, label, unit_price, cost_price, track_stock, current_stock
        into v_variant from variants where id = v_variant_id;

      select name into v_product_name from products where id = v_variant.product_id;

      v_label := v_variant.label;
      v_unit_price := v_variant.unit_price;
      v_cost_price := v_variant.cost_price;

      if v_variant.track_stock then
        update variants set current_stock = current_stock - v_qty, updated_at = now()
        where id = v_variant.id;

        insert into stock_movements (variant_id, change_qty, movement_type, reference_bill_id)
        values (v_variant.id, -v_qty, 'sale', v_bill_id);
      end if;

      insert into bill_items (bill_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, unit_price_snapshot, cost_price_snapshot, quantity, subtotal)
      values (v_bill_id, v_variant.product_id, v_variant.id, v_product_name, v_label, v_unit_price, v_cost_price, v_qty, v_unit_price * v_qty);

    else
      select id, name, rate_unit, rate_sell_price, rate_cost_price, track_stock, current_stock
        into v_product from products where id = v_product_id;

      v_label := coalesce(nullif(v_item->>'label', ''), v_qty::text || ' ' || v_product.rate_unit);
      v_unit_price := v_product.rate_sell_price;
      v_cost_price := v_product.rate_cost_price;

      if v_product.track_stock then
        update products set current_stock = current_stock - v_qty, updated_at = now()
        where id = v_product.id;

        insert into stock_movements (product_id, change_qty, movement_type, reference_bill_id)
        values (v_product.id, -v_qty, 'sale', v_bill_id);
      end if;

      insert into bill_items (bill_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, unit_price_snapshot, cost_price_snapshot, quantity, subtotal)
      values (v_bill_id, v_product.id, null, v_product.name, v_label, v_unit_price, v_cost_price, v_qty, v_unit_price * v_qty);
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
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

grant execute on function adjust_stock(numeric, text, uuid, uuid, text) to anon, authenticated;
grant execute on function create_bill(uuid, text, text, numeric, text, jsonb, text, numeric) to anon, authenticated;
