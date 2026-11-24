alter table public.listings
  add column if not exists bumped boolean not null default false;

create or replace function public.market_create_listing(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.listings;
begin
  if app_private.current_role() not in ('marketplace', 'admin', 'super_admin') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  insert into public.listings (
    seller_id, title, title_zh, blurb, blurb_zh, format, price, unit_amount, currency,
    kind, tag, image_url, sold, removed, seller_seen, inventory_on_hand, listing_status, bumped
  ) values (
    auth.uid(),
    coalesce(nullif(p_row->>'title', ''), 'Listing'),
    coalesce(p_row->>'title_zh', ''),
    coalesce(p_row->>'blurb', ''),
    coalesce(p_row->>'blurb_zh', ''),
    coalesce(p_row->>'format', ''),
    coalesce((p_row->>'price')::numeric, 0),
    greatest(0, coalesce((p_row->>'unit_amount')::int, round(coalesce((p_row->>'price')::numeric, 0))::int)),
    'twd',
    coalesce(nullif(p_row->>'kind', ''), 'book'),
    coalesce(nullif(p_row->>'tag', ''), 'elective'),
    coalesce(p_row->>'image_url', ''),
    false, false, true,
    greatest(0, coalesce((p_row->>'inventory_on_hand')::int, 1)),
    'active',
    coalesce((p_row->>'bumped')::boolean, false)
  )
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

create or replace function public.market_bump_listing(p_title text, p_price numeric)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  if auth.uid() is null or app_private.current_role() not in ('marketplace', 'admin', 'super_admin') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  update public.listings
  set bumped = true
  where seller_id = auth.uid()
    and removed = false
    and bumped = false
    and title = coalesce(nullif(btrim(p_title), ''), '')
    and price = coalesce(p_price, 0);
  get diagnostics updated = row_count;
  return updated;
end;
$$;

revoke all on function public.market_bump_listing(text, numeric) from public, anon;
grant execute on function public.market_bump_listing(text, numeric) to authenticated;
