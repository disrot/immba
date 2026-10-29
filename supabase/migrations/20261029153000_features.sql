-- Analytics, commerce, student workflows, media queue, and serialized audit chain.
-- Checkout and live email stay behind secrets and feature flags.

alter table public.backoffice_audit_logs
  add column if not exists integrity_version smallint not null default 1;
alter table public.backoffice_audit_logs
  add column if not exists chain_seq bigint;

create or replace function public.audit_write(
  p_module text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_entity_label text default '',
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_metadata jsonb default '{}'::jsonb,
  p_status text default 'SUCCESS',
  p_snapshot boolean default true,
  p_is_deleted boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, audit, extensions, pg_temp
as $$
declare
  tier text := audit.tier();
  actor uuid := auth.uid();
  email text := coalesce((select p.email from public.profiles p where p.id = auth.uid()), '');
  prev text := '';
  secret text;
  log_id uuid := gen_random_uuid();
  snap_id uuid;
  version_no int := 0;
  old_s jsonb := audit.scrub(p_old_values);
  new_s jsonb := audit.scrub(p_new_values);
  snap jsonb;
  chain text;
  seq bigint;
  canonical text;
begin
  if coalesce(p_status, 'SUCCESS') not in ('SUCCESS', 'FAILURE', 'DENIED') then
    p_status := 'SUCCESS';
  end if;
  select s.secret into secret from audit.hmac_secret s where s.id = 1 for update;
  select coalesce(max(l.chain_seq), 0) + 1 into seq from public.backoffice_audit_logs l;
  select l.integrity_hash into prev
  from public.backoffice_audit_logs l
  order by l.created_at desc, l.id desc
  limit 1;
  prev := coalesce(prev, '');
  canonical := prev || '|' || seq::text || '|' || coalesce(actor::text, '') || '|' || upper(coalesce(p_module, ''))
    || '|' || upper(coalesce(p_action, '')) || '|' || coalesce(p_entity_type, '') || '|' || coalesce(p_entity_id, '')
    || '|' || coalesce(p_status, '') || '|' || coalesce(old_s::text, '') || '|' || coalesce(new_s::text, '');
  chain := encode(extensions.hmac(convert_to(canonical, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  insert into public.backoffice_audit_logs (
    id, actor_id, actor_email, actor_role, module, action, entity_type, entity_id, entity_label,
    old_values, new_values, metadata, integrity_hash, status, integrity_version, chain_seq
  ) values (
    log_id, actor, email, tier, upper(p_module), upper(p_action), p_entity_type, p_entity_id,
    coalesce(p_entity_label, ''), old_s, new_s, coalesce(p_metadata, '{}'::jsonb), chain, p_status, 2, seq
  );
  if p_snapshot and p_entity_type is not null and p_entity_id is not null then
    snap := case when p_is_deleted then coalesce(old_s, '{}'::jsonb) else coalesce(new_s, old_s, '{}'::jsonb) end;
    select coalesce(max(v.version_number), 0) + 1 into version_no
    from public.entity_version_snapshots v
    where v.entity_type = p_entity_type and v.entity_id = p_entity_id;
    snap_id := gen_random_uuid();
    insert into public.entity_version_snapshots (
      id, entity_type, entity_id, version_number, full_snapshot, is_deleted_state,
      created_by_id, created_by_role, audit_log_id, checksum
    ) values (
      snap_id, p_entity_type, p_entity_id, version_no, snap, coalesce(p_is_deleted, false),
      actor, tier, log_id, encode(extensions.digest(coalesce(snap::text, ''), 'sha256'), 'hex')
    );
  end if;
  return log_id;
end;
$$;

revoke execute on function public.audit_write(text, text, text, text, text, jsonb, jsonb, jsonb, text, boolean, boolean) from anon, authenticated, public;

create or replace function public.audit_verify_integrity()
returns jsonb
language plpgsql
security definer
set search_path = public, audit, extensions, pg_temp
as $$
declare
  rec record;
  prev text := '';
  secret text;
  expected text;
  canonical text;
  broken int := 0;
  checked int := 0;
  legacy int := 0;
  first_break uuid;
begin
  if audit.tier() <> 'SUPER_ADMIN' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  select s.secret into secret from audit.hmac_secret s where s.id = 1;
  for rec in select * from public.backoffice_audit_logs order by created_at, id
  loop
    checked := checked + 1;
    if coalesce(rec.integrity_version, 1) = 1 then
      legacy := legacy + 1;
      canonical := prev || coalesce(rec.actor_id::text, '') || coalesce(rec.action, '') || coalesce(rec.entity_id, '') || coalesce(rec.new_values::text, '');
    else
      canonical := prev || '|' || coalesce(rec.chain_seq::text, '') || '|' || coalesce(rec.actor_id::text, '') || '|'
        || coalesce(rec.module, '') || '|' || coalesce(rec.action, '') || '|' || coalesce(rec.entity_type, '') || '|'
        || coalesce(rec.entity_id, '') || '|' || coalesce(rec.status, '') || '|' || coalesce(rec.old_values::text, '')
        || '|' || coalesce(rec.new_values::text, '');
    end if;
    expected := encode(extensions.hmac(convert_to(canonical, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
    if expected <> rec.integrity_hash then
      broken := broken + 1;
      if first_break is null then first_break := rec.id; end if;
    end if;
    prev := rec.integrity_hash;
  end loop;
  return jsonb_build_object('checked', checked, 'broken', broken, 'legacy', legacy, 'first_break', first_break, 'ok', broken = 0);
end;
$$;

create or replace function app_private.enqueue_storage(p_bucket text, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(p_bucket, '') = '' or coalesce(p_path, '') = '' then
    return;
  end if;
  insert into app_private.storage_cleanup_queue (bucket, object_path)
  values (p_bucket, p_path);
end;
$$;

create or replace function app_private.note_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_url text;
  new_url text;
  bucket text;
  path text;
  match text[];
begin
  old_url := case tg_table_name when 'faculty' then old.image_url when 'listings' then old.image_url else '' end;
  new_url := case tg_table_name when 'faculty' then new.image_url when 'listings' then new.image_url else '' end;
  if tg_op = 'UPDATE' and old_url is distinct from new_url and old_url like '%/storage/v1/object/public/%' then
    match := regexp_match(old_url, '/storage/v1/object/public/([^/]+)/(.+)$');
    if match is not null then
      perform app_private.enqueue_storage(match[1], match[2]);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists faculty_media_queue on public.faculty;
create trigger faculty_media_queue after update on public.faculty
  for each row execute function app_private.note_media();
drop trigger if exists listings_media_queue on public.listings;
create trigger listings_media_queue after update on public.listings
  for each row execute function app_private.note_media();

create or replace function public.storage_cleanup_candidates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row record;
  blob text;
  keep boolean;
  items jsonb := '[]'::jsonb;
begin
  if auth.role() is distinct from 'service_role' and app_private.current_role() <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  select coalesce(string_agg(image_url, ' '), '') || ' ' || coalesce(string_agg(photos::text, ' '), '')
    into blob
  from (
    select image_url, null::jsonb as photos from public.faculty
    union all
    select image_url, null from public.listings
    union all
    select '', photos from public.news
  ) refs;
  blob := blob || ' ' || coalesce((select string_agg(full_snapshot::text, ' ') from public.entity_version_snapshots), '');
  for row in
    select id, bucket, object_path from app_private.storage_cleanup_queue where deleted_at is null
  loop
    keep := position(row.object_path in blob) > 0;
    items := items || jsonb_build_array(jsonb_build_object(
      'id', row.id, 'bucket', row.bucket, 'path', row.object_path, 'referenced', keep
    ));
  end loop;
  return jsonb_build_object('dry_run', true, 'items', items);
end;
$$;

grant execute on function public.storage_cleanup_candidates() to authenticated;

-- Shared analytics. Raw rows are not exposed to the browser.
create table if not exists app_private.analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  day date not null default (timezone('Asia/Taipei', now()))::date,
  path text not null,
  event_type text not null check (event_type in ('view', 'beat')),
  referrer_host text not null default '',
  lang text not null default '',
  device text not null default '',
  os_family text not null default '',
  country text not null default '',
  visitor_key text not null
);
create table if not exists app_private.analytics_daily (
  day date not null,
  path text not null,
  views integer not null default 0,
  beats integer not null default 0,
  primary key (day, path)
);
revoke all on app_private.analytics_events from public, anon, authenticated;
revoke all on app_private.analytics_daily from public, anon, authenticated;

create or replace function public.analytics_ingest(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  accepted integer := 0;
  path text;
  kind text;
  visitor text;
  enabled boolean;
begin
  select f.enabled into enabled from public.feature_flags f where f.key = 'analytics';
  if coalesce(enabled, false) = false then
    return 0;
  end if;
  if jsonb_typeof(p_events) <> 'array' then
    raise exception 'Expected an array';
  end if;
  for item in select * from jsonb_array_elements(p_events) limit 20
  loop
    path := left(regexp_replace(coalesce(item->>'path', ''), '[?#].*$', ''), 120);
    kind := case when item->>'event_type' = 'beat' then 'beat' else 'view' end;
    visitor := left(regexp_replace(coalesce(item->>'visitor_key', ''), '[^a-zA-Z0-9-]', '', 'g'), 80);
    if path = '' or visitor = '' or path ~ '@' or visitor ~ '@' then
      continue;
    end if;
    insert into app_private.analytics_events (path, event_type, referrer_host, lang, device, os_family, country, visitor_key)
    values (
      path, kind,
      left(regexp_replace(coalesce(item->>'referrer_host', ''), '[^a-zA-Z0-9.-]', '', 'g'), 120),
      case when item->>'lang' = 'zh' then 'zh' else 'en' end,
      case when item->>'device' in ('Mobile', 'Tablet', 'Desktop') then item->>'device' else 'Desktop' end,
      left(regexp_replace(coalesce(item->>'os_family', ''), '[^A-Za-z]', '', 'g'), 20),
      left(regexp_replace(coalesce(item->>'country', ''), '[^A-Za-z ]', '', 'g'), 40),
      visitor
    );
    insert into app_private.analytics_daily (day, path, views, beats)
    values ((timezone('Asia/Taipei', now()))::date, path, case when kind = 'view' then 1 else 0 end, case when kind = 'beat' then 1 else 0 end)
    on conflict (day, path) do update set
      views = app_private.analytics_daily.views + excluded.views,
      beats = app_private.analytics_daily.beats + excluded.beats;
    accepted := accepted + 1;
  end loop;
  return accepted;
end;
$$;

create or replace function public.analytics_report(p_range text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  days integer := case p_range when '30d' then 30 when '90d' then 90 else 7 end;
  start_day date := (timezone('Asia/Taipei', now()))::date - days;
begin
  perform app_private.require_page('analytics');
  return jsonb_build_object(
    'range', p_range,
    'views', (select coalesce(sum(views), 0) from app_private.analytics_daily where day >= start_day),
    'beats', (select coalesce(sum(beats), 0) from app_private.analytics_daily where day >= start_day),
    'visitors', (select count(distinct visitor_key) from app_private.analytics_events where day >= start_day and event_type = 'view'),
    'live', (select count(distinct visitor_key) from app_private.analytics_events where occurred_at > now() - interval '2 minutes'),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'count', views, 'visits', views, 'visitors', views, 'clicks', 0, 'bounce', 0, 'time', 0, 'exit', 0) order by day)
      from (
        select day, sum(views)::int as views
        from app_private.analytics_daily
        where day >= start_day
        group by day
      ) daily
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('label', path, 'count', views) order by views desc)
      from (
        select path, sum(views)::int as views from app_private.analytics_daily
        where day >= start_day group by path order by sum(views) desc limit 8
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.analytics_prune()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if auth.role() is distinct from 'service_role' and app_private.current_role() <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  get diagnostics removed = row_count;
  delete from app_private.analytics_daily where day < (timezone('Asia/Taipei', now()))::date - 400;
  return removed;
end;
$$;

grant execute on function public.analytics_ingest(jsonb) to anon, authenticated;
grant execute on function public.analytics_report(text) to authenticated;
grant execute on function public.analytics_prune() to authenticated;

-- Commerce. Funds stay in the platform account until staff records a settlement.
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'checked_out', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists carts_one_active on public.carts (buyer_id) where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  listing_id text not null references public.listings (id),
  quantity integer not null check (quantity > 0 and quantity <= 20),
  unique (cart_id, listing_id)
);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings (id),
  buyer_id uuid not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'held' check (status in ('held', 'consumed', 'released')),
  expires_at timestamptz not null,
  order_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  cart_id uuid,
  amount_total integer not null,
  currency text not null default 'twd',
  lines jsonb not null,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  currency text not null default 'twd',
  amount_total integer not null check (amount_total >= 0),
  stripe_session_id text unique,
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  listing_id text not null,
  seller_id uuid,
  title text not null,
  quantity integer not null,
  unit_amount integer not null,
  currency text not null default 'twd'
);

create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text not null default '',
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  amount integer not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested', 'succeeded', 'failed')),
  stripe_refund_id text,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.settlement_ledger (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  order_id uuid references public.orders (id),
  amount integer not null,
  currency text not null default 'twd',
  status text not null default 'owed' check (status in ('owed', 'settled')),
  settled_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.checkout_intents enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.refunds enable row level security;
alter table public.stripe_events enable row level security;
alter table public.settlement_ledger enable row level security;
alter table public.email_outbox enable row level security;

drop policy if exists carts_owner on public.carts;
create policy carts_owner on public.carts for select using (buyer_id = auth.uid() or app_private.has_page('orders') or app_private.current_role() = 'super_admin');
drop policy if exists orders_owner on public.orders;
create policy orders_owner on public.orders for select using (buyer_id = auth.uid() or app_private.has_page('orders') or app_private.current_role() = 'super_admin');
drop policy if exists order_items_visible on public.order_items;
create policy order_items_visible on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or app_private.has_page('orders') or app_private.current_role() = 'super_admin'))
  or seller_id = auth.uid()
);

revoke insert, update, delete on public.checkout_intents, public.carts, public.cart_items, public.inventory_reservations, public.orders, public.order_items, public.order_status_history, public.refunds, public.stripe_events, public.settlement_ledger, public.email_outbox from anon, authenticated;

create or replace function public.cart_upsert(p_listing_id text, p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cart_id uuid;
  listing public.listings;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_quantity < 1 or p_quantity > 20 then raise exception 'Invalid quantity'; end if;
  select * into listing from public.listings where id = p_listing_id and removed = false and listing_status = 'active';
  if not found then raise exception 'Listing is not available'; end if;
  insert into public.carts (buyer_id) values (auth.uid())
  on conflict (buyer_id) where status = 'active' do update set updated_at = now()
  returning id into cart_id;
  if cart_id is null then
    select id into cart_id from public.carts where buyer_id = auth.uid() and status = 'active';
  end if;
  insert into public.cart_items (cart_id, listing_id, quantity) values (cart_id, p_listing_id, p_quantity)
  on conflict (cart_id, listing_id) do update set quantity = excluded.quantity;
  return public.cart_get();
end;
$$;

create or replace function public.cart_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cart_id uuid;
begin
  if auth.uid() is null then return '{"items":[]}'::jsonb; end if;
  select id into cart_id from public.carts where buyer_id = auth.uid() and status = 'active';
  return jsonb_build_object('id', cart_id, 'items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'listing_id', i.listing_id,
      'quantity', i.quantity,
      'title', l.title,
      'unit_amount', l.unit_amount,
      'currency', l.currency,
      'available', greatest(l.inventory_on_hand - l.inventory_reserved, 0)
    ))
    from public.cart_items i
    join public.listings l on l.id = i.listing_id
    where i.cart_id = cart_id
  ), '[]'::jsonb));
end;
$$;

create or replace function public.checkout_prepare()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  enabled boolean;
  cart public.carts;
  item record;
  total integer := 0;
  line jsonb;
  lines jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select f.enabled into enabled from public.feature_flags f where f.key = 'checkout';
  if coalesce(enabled, false) = false then
    raise exception 'Checkout is not live yet';
  end if;
  select * into cart from public.carts where buyer_id = auth.uid() and status = 'active' for update;
  if not found then raise exception 'Cart is empty'; end if;
  for item in
    select i.quantity, l.id, l.title, l.unit_amount, l.currency, l.inventory_on_hand, l.inventory_reserved, l.seller_id
    from public.cart_items i
    join public.listings l on l.id = i.listing_id
    where i.cart_id = cart.id
    for update of l
  loop
    if item.quantity > item.inventory_on_hand - item.inventory_reserved then
      raise exception 'Not enough inventory for %', item.title;
    end if;
    update public.listings set inventory_reserved = inventory_reserved + item.quantity where id = item.id;
    insert into public.inventory_reservations (listing_id, buyer_id, quantity, expires_at)
    values (item.id, auth.uid(), item.quantity, now() + interval '30 minutes');
    total := total + item.unit_amount * item.quantity;
    line := jsonb_build_object('listing_id', item.id, 'title', item.title, 'quantity', item.quantity, 'unit_amount', item.unit_amount, 'currency', item.currency, 'seller_id', item.seller_id);
    lines := lines || jsonb_build_array(line);
  end loop;
  if total <= 0 then raise exception 'Cart is empty'; end if;
  insert into public.checkout_intents (buyer_id, cart_id, amount_total, currency, lines)
  values (auth.uid(), cart.id, total, 'twd', lines);
  return jsonb_build_object('cart_id', cart.id, 'currency', 'twd', 'amount_total', total, 'lines', lines, 'intent_id', (select id from public.checkout_intents where buyer_id = auth.uid() order by created_at desc limit 1));
end;
$$;

create or replace function public.commerce_apply_stripe_event(p_id text, p_type text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing text;
  session_id text;
  buyer uuid;
  intent_id uuid;
  order_row public.orders;
  line jsonb;
  lines jsonb;
begin
  if app_private.current_role() not in ('admin', 'super_admin') and auth.role() is distinct from 'service_role' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  select id into existing from public.stripe_events where id = p_id;
  if existing is not null then
    return jsonb_build_object('duplicate', true);
  end if;
  insert into public.stripe_events (id, type, payload) values (p_id, p_type, p_payload);
  if p_type = 'checkout.session.completed' then
    session_id := p_payload #>> '{data,object,id}';
    buyer := nullif(p_payload #>> '{data,object,metadata,buyer_id}', '')::uuid;
    intent_id := nullif(p_payload #>> '{data,object,metadata,intent_id}', '')::uuid;
    select ci.lines into lines from public.checkout_intents ci where ci.id = intent_id;
    if exists (select 1 from public.orders where stripe_session_id = session_id) then
      return jsonb_build_object('duplicate', true);
    end if;
    insert into public.orders (buyer_id, status, currency, amount_total, stripe_session_id, stripe_payment_intent)
    values (
      buyer,
      'paid',
      lower(coalesce(p_payload #>> '{data,object,currency}', 'twd')),
      coalesce((p_payload #>> '{data,object,amount_total}')::int, 0),
      session_id,
      p_payload #>> '{data,object,payment_intent}'
    ) returning * into order_row;
    for line in select * from jsonb_array_elements(coalesce(lines, '[]'::jsonb))
    loop
      insert into public.order_items (order_id, listing_id, seller_id, title, quantity, unit_amount, currency)
      values (
        order_row.id,
        line->>'listing_id',
        nullif(line->>'seller_id', '')::uuid,
        coalesce(line->>'title', 'Item'),
        coalesce((line->>'quantity')::int, 1),
        coalesce((line->>'unit_amount')::int, 0),
        coalesce(line->>'currency', 'twd')
      );
      update public.listings
      set inventory_on_hand = greatest(inventory_on_hand - coalesce((line->>'quantity')::int, 1), 0),
          inventory_reserved = greatest(inventory_reserved - coalesce((line->>'quantity')::int, 1), 0)
      where id = line->>'listing_id';
      insert into public.settlement_ledger (seller_id, order_id, amount, currency, status)
      select nullif(line->>'seller_id', '')::uuid, order_row.id,
        coalesce((line->>'unit_amount')::int, 0) * coalesce((line->>'quantity')::int, 1),
        coalesce(line->>'currency', 'twd'), 'owed'
      where nullif(line->>'seller_id', '') is not null;
    end loop;
    insert into public.order_status_history (order_id, status, note) values (order_row.id, 'paid', 'Stripe checkout completed');
    update public.carts set status = 'checked_out', updated_at = now() where buyer_id = buyer and status = 'active';
    update public.inventory_reservations set status = 'consumed', order_id = order_row.id
    where buyer_id = buyer and status = 'held';
    insert into public.email_outbox (to_email, template, payload)
    select u.email, 'order_paid', jsonb_build_object('order_id', order_row.id)
    from auth.users u where u.id = buyer and u.email is not null;
  elsif p_type = 'checkout.session.expired' then
    buyer := nullif(p_payload #>> '{data,object,metadata,buyer_id}', '')::uuid;
    update public.inventory_reservations set status = 'released' where buyer_id = buyer and status = 'held';
    update public.listings l
    set inventory_reserved = greatest(l.inventory_reserved - r.quantity, 0)
    from public.inventory_reservations r
    where r.buyer_id = buyer and r.listing_id = l.id and r.status = 'released' and r.created_at > now() - interval '1 hour';
  end if;
  return jsonb_build_object('ok', true, 'order_id', order_row.id);
end;
$$;

create or replace function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  row record;
begin
  for row in
    select * from public.inventory_reservations where status = 'held' and expires_at < now() for update
  loop
    update public.listings set inventory_reserved = greatest(inventory_reserved - row.quantity, 0) where id = row.listing_id;
    update public.inventory_reservations set status = 'released' where id = row.id;
    removed := removed + 1;
  end loop;
  return removed;
end;
$$;

create or replace function public.office_settle_seller(p_id uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.settlement_ledger;
begin
  perform app_private.require_page('orders');
  perform app_private.require_aal2();
  select * into row from public.settlement_ledger where id = p_id and status = 'owed' for update;
  if not found then raise exception 'Settlement not found'; end if;
  update public.settlement_ledger set status = 'settled', settled_at = now(), note = coalesce(p_note, '') where id = p_id;
  insert into public.email_outbox (to_email, template, payload)
  select u.email, 'seller_settled', jsonb_build_object('settlement_id', p_id, 'amount', row.amount)
  from auth.users u where u.id = row.seller_id and u.email is not null;
end;
$$;

create or replace function public.office_list_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.require_page('orders');
  return coalesce((
    select jsonb_agg(to_jsonb(o) order by o.created_at desc)
    from public.orders o
  ), '[]'::jsonb);
end;
$$;

create or replace function public.my_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('order', to_jsonb(o), 'items', (
      select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from public.order_items i where i.order_id = o.id
    )) order by o.created_at desc)
    from public.orders o where o.buyer_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.cart_upsert(text, integer) to authenticated;
grant execute on function public.cart_get() to authenticated;
grant execute on function public.checkout_prepare() to authenticated;
grant execute on function public.commerce_apply_stripe_event(text, text, jsonb) to service_role;
grant execute on function public.expire_reservations() to service_role;
grant execute on function public.office_settle_seller(uuid, text) to authenticated;
grant execute on function public.office_list_orders() to authenticated;
grant execute on function public.my_orders() to authenticated;

-- Student workflows. Documents stay in a private bucket. Emails carry no attachments.
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do update set public = false;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users (id) on delete cascade,
  workflow text not null check (workflow in ('admissions', 'exchange', 'graduation')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'needs_changes', 'approved', 'rejected', 'withdrawn', 'completed')),
  payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  assignee_id uuid,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, workflow)
);

create table if not exists public.application_versions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  revision integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.application_comments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id uuid,
  body text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'applicant')),
  created_at timestamptz not null default now()
);

create table if not exists public.application_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  status text not null,
  note text not null default '',
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  token_hash text not null unique,
  submitted_at timestamptz,
  body text not null default ''
);

alter table public.applications enable row level security;
alter table public.application_versions enable row level security;
alter table public.application_comments enable row level security;
alter table public.application_events enable row level security;
alter table public.recommendations enable row level security;

drop policy if exists applications_owner on public.applications;
create policy applications_owner on public.applications for select using (
  applicant_id = auth.uid() or app_private.has_page('workflows') or app_private.current_role() = 'super_admin'
);
drop policy if exists application_comments_visible on public.application_comments;
create policy application_comments_visible on public.application_comments for select using (
  visibility = 'applicant' and exists (
    select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid()
  )
  or app_private.has_page('workflows')
  or app_private.current_role() = 'super_admin'
);

revoke insert, update, delete on public.applications, public.application_versions, public.application_comments, public.application_events, public.recommendations from anon, authenticated;

create or replace function public.workflow_save_draft(p_workflow text, p_payload jsonb, p_deadline date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.applications;
  enabled boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select f.enabled into enabled from public.feature_flags f where f.key = 'workflows';
  if coalesce(enabled, false) = false then raise exception 'Workflows are not open'; end if;
  if p_workflow not in ('admissions', 'exchange', 'graduation') then raise exception 'Unknown workflow'; end if;
  insert into public.applications (applicant_id, workflow, payload, deadline)
  values (auth.uid(), p_workflow, coalesce(p_payload, '{}'::jsonb), p_deadline)
  on conflict (applicant_id, workflow) do update set
    payload = excluded.payload,
    deadline = coalesce(excluded.deadline, public.applications.deadline),
    revision = public.applications.revision + 1,
    updated_at = now()
  where public.applications.status in ('draft', 'needs_changes')
  returning * into row;
  if row.id is null then raise exception 'This application can no longer be edited'; end if;
  return to_jsonb(row);
end;
$$;

create or replace function public.workflow_submit(p_workflow text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.applications;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into row from public.applications
  where applicant_id = auth.uid() and workflow = p_workflow and status in ('draft', 'needs_changes')
  for update;
  if not found then raise exception 'No editable application'; end if;
  if coalesce(row.payload->>'full_name', '') = '' or coalesce(row.payload->>'email', '') = '' then
    raise exception 'Name and email are required';
  end if;
  insert into public.application_versions (application_id, revision, payload)
  values (row.id, row.revision, row.payload);
  update public.applications set status = 'submitted', updated_at = now() where id = row.id returning * into row;
  insert into public.application_events (application_id, status, actor_id) values (row.id, 'submitted', auth.uid());
  insert into public.email_outbox (to_email, template, payload)
  values (row.payload->>'email', 'application_submitted', jsonb_build_object('workflow', p_workflow, 'application_id', row.id));
  return to_jsonb(row);
end;
$$;

create or replace function public.workflow_transition(p_id uuid, p_status text, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.applications;
begin
  perform app_private.require_page('workflows');
  if p_status not in ('under_review', 'needs_changes', 'approved', 'rejected', 'completed') then
    raise exception 'Invalid status';
  end if;
  select * into row from public.applications where id = p_id for update;
  if not found then raise exception 'Application not found'; end if;
  if row.status = 'draft' then raise exception 'The applicant has not submitted'; end if;
  update public.applications set status = p_status, assignee_id = auth.uid(), updated_at = now() where id = p_id returning * into row;
  insert into public.application_events (application_id, status, note, actor_id) values (p_id, p_status, coalesce(p_note, ''), auth.uid());
  insert into public.email_outbox (to_email, template, payload)
  select u.email, 'application_status', jsonb_build_object('application_id', p_id, 'status', p_status)
  from auth.users u where u.id = row.applicant_id and u.email is not null;
  return to_jsonb(row);
end;
$$;

create or replace function public.workflow_comment(p_id uuid, p_body text, p_visibility text default 'internal')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_id uuid := gen_random_uuid();
  owner uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_visibility not in ('internal', 'applicant') then raise exception 'Invalid visibility'; end if;
  select applicant_id into owner from public.applications where id = p_id;
  if owner is null then raise exception 'Application not found'; end if;
  if owner <> auth.uid() and app_private.current_role() not in ('admin', 'super_admin') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if owner = auth.uid() then p_visibility := 'applicant'; end if;
  if p_visibility = 'internal' and not (app_private.has_page('workflows') or app_private.current_role() = 'super_admin') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  insert into public.application_comments (id, application_id, author_id, body, visibility)
  values (comment_id, p_id, auth.uid(), left(coalesce(p_body, ''), 4000), p_visibility);
  return comment_id;
end;
$$;

create or replace function public.my_applications()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(a) order by a.updated_at desc), '[]'::jsonb)
  from public.applications a
  where a.applicant_id = auth.uid()
$$;

create or replace function public.office_applications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.require_page('workflows');
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.updated_at desc) from public.applications a where a.status <> 'draft'), '[]'::jsonb);
end;
$$;

grant execute on function public.workflow_save_draft(text, jsonb, date) to authenticated;
grant execute on function public.workflow_submit(text) to authenticated;
grant execute on function public.workflow_transition(uuid, text, text) to authenticated;
grant execute on function public.workflow_comment(uuid, text, text) to authenticated;
grant execute on function public.my_applications() to authenticated;
grant execute on function public.office_applications() to authenticated;

create policy application_documents_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy application_documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or app_private.has_page('workflows')
      or app_private.current_role() = 'super_admin'
    )
  );
