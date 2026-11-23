create table if not exists public.c2c_orders (
  id text primary key,
  buyer_email text not null,
  seller_email text not null default '',
  body jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.c2c_stock (
  listing_id text primary key,
  on_hand integer,
  purchased integer not null default 0,
  owner_email text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.c2c_orders enable row level security;
alter table public.c2c_stock enable row level security;
revoke all on table public.c2c_orders from anon, authenticated;
revoke all on table public.c2c_stock from anon, authenticated;

create or replace function public.c2c_pull()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if email = '' then
    return jsonb_build_object('orders', '[]'::jsonb, 'stock', '{}'::jsonb);
  end if;
  return jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(body order by updated_at desc)
      from public.c2c_orders
      where lower(buyer_email) = email or (seller_email <> '' and lower(seller_email) = email)
    ), '[]'::jsonb),
    'stock', coalesce((
      select jsonb_object_agg(listing_id, jsonb_build_object('onHand', on_hand, 'purchased', purchased))
      from public.c2c_stock
    ), '{}'::jsonb)
  );
end;
$$;

create or replace function public.c2c_place(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  buyer text := lower(coalesce(p_order ->> 'buyerEmail', ''));
  seller text := lower(coalesce(p_order ->> 'sellerId', ''));
  oid text := coalesce(p_order ->> 'id', '');
  line jsonb;
  inserted int := 0;
begin
  if email = '' then
    raise exception 'Sign in before placing an order';
  end if;
  if buyer <> email or oid = '' then
    raise exception 'You can only place an order as yourself';
  end if;
  if position('@' in seller) = 0 then
    seller := '';
  end if;
  insert into public.c2c_orders (id, buyer_email, seller_email, body)
  values (oid, buyer, seller, p_order)
  on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  for line in select value from jsonb_array_elements(coalesce(p_order -> 'items', '[]'::jsonb))
  loop
    insert into public.c2c_stock (listing_id, purchased)
    values (line ->> 'id', greatest(1, coalesce((line ->> 'qty')::int, 1)))
    on conflict (listing_id) do update
      set purchased = public.c2c_stock.purchased + excluded.purchased,
          updated_at = now();
  end loop;
  insert into public.email_outbox (to_email, template, payload)
  values (
    buyer,
    'order_placed',
    jsonb_build_object('order_id', oid, 'note', 'Your order is saved. Open My orders to follow payment, hand-off, and completion.')
  );
  if seller <> '' then
    insert into public.email_outbox (to_email, template, payload)
    values (
      seller,
      'order_placed',
      jsonb_build_object('order_id', oid, 'note', 'A classmate placed an order. Confirm payment, then mark the hand-off.')
    );
  end if;
  return jsonb_build_object('ok', true, 'id', oid);
end;
$$;

create or replace function public.c2c_advance(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  oid text := coalesce(p_order ->> 'id', '');
  row public.c2c_orders;
begin
  if email = '' or oid = '' then
    raise exception 'Sign in before updating an order';
  end if;
  select * into row from public.c2c_orders where id = oid;
  if row.id is null then
    raise exception 'Order not found';
  end if;
  if lower(row.seller_email) <> email then
    raise exception 'You can only update orders that belong to you';
  end if;
  update public.c2c_orders
    set body = p_order,
        updated_at = now()
    where id = oid;
  if row.buyer_email <> '' then
    insert into public.email_outbox (to_email, template, payload)
    values (
      row.buyer_email,
      'order_updated',
      jsonb_build_object('order_id', oid, 'status', p_order ->> 'status', 'note', 'Your order moved forward. Open My orders for the next step.')
    );
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.c2c_hand(p_listing text, p_on_hand integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  owner text;
begin
  if email = '' or coalesce(p_listing, '') = '' then
    raise exception 'Sign in before changing stock';
  end if;
  if p_on_hand < 0 then
    raise exception 'Quantity cannot be negative';
  end if;
  select owner_email into owner from public.c2c_stock where listing_id = p_listing;
  if owner is not null and owner <> '' and owner <> email then
    raise exception 'You can only change listings you posted';
  end if;
  insert into public.c2c_stock (listing_id, on_hand, owner_email)
  values (p_listing, p_on_hand, email)
  on conflict (listing_id) do update
    set on_hand = excluded.on_hand,
        owner_email = case when public.c2c_stock.owner_email = '' then excluded.owner_email else public.c2c_stock.owner_email end,
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.c2c_pull() from public, anon, authenticated;
revoke all on function public.c2c_place(jsonb) from public, anon, authenticated;
revoke all on function public.c2c_advance(jsonb) from public, anon, authenticated;
revoke all on function public.c2c_hand(text, integer) from public, anon, authenticated;
grant execute on function public.c2c_pull() to authenticated;
grant execute on function public.c2c_place(jsonb) to authenticated;
grant execute on function public.c2c_advance(jsonb) to authenticated;
grant execute on function public.c2c_hand(text, integer) to authenticated;
