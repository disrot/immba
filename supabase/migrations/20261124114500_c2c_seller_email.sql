-- A classmate listing is owned by a profile id. Keep the seller's email
-- so that seller can pull and update the order.

create or replace function public.c2c_place(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  buyer text := lower(coalesce(p_order ->> 'buyerEmail', ''));
  seller text := lower(coalesce(nullif(p_order ->> 'sellerEmail', ''), p_order ->> 'sellerId', ''));
  seller_user text := lower(coalesce(p_order ->> 'sellerUserId', ''));
  oid text := coalesce(p_order ->> 'id', '');
  looked text;
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
    select lower(p.email) into looked
    from public.profiles p
    where p.id::text = coalesce(nullif(seller_user, ''), nullif(seller, ''))
      and coalesce(p.email, '') <> '';
    seller := coalesce(looked, '');
  end if;
  if seller = '' then
    select lower(p.email) into looked
    from jsonb_array_elements(coalesce(p_order -> 'items', '[]'::jsonb)) item
    join public.listings l on l.id::text = item ->> 'id'
    join public.profiles p on p.id = l.seller_id
    where coalesce(p.email, '') <> ''
    limit 1;
    seller := coalesce(looked, '');
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

update public.c2c_orders o
set
  seller_email = lower(p.email),
  body = o.body || jsonb_build_object(
    'sellerEmail', lower(p.email),
    'sellerUserId', l.seller_id::text
  )
from public.listings l
join public.profiles p on p.id = l.seller_id
where coalesce(o.seller_email, '') = ''
  and coalesce(p.email, '') <> ''
  and exists (
    select 1
    from jsonb_array_elements(coalesce(o.body -> 'items', '[]'::jsonb)) item
    where item ->> 'id' = l.id::text
  );

revoke all on function public.c2c_place(jsonb) from public, anon, authenticated;
grant execute on function public.c2c_place(jsonb) to authenticated;
