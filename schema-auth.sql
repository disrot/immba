-- Additive auth roles + marketplace listings. Run in the SQL editor after schema.sql.
-- Staff signups start as pending until a super admin (or local office login) approves them.
-- Marketplace signups become marketplace and can post listings after email confirmation.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('pending', 'admin', 'super_admin', 'marketplace', 'rejected'));

alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists intent text not null default 'staff';
alter table public.profiles add column if not exists pages text[] not null default '{}';

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  intent text := coalesce(new.raw_user_meta_data->>'intent', 'staff');
  assigned text;
begin
  if intent = 'marketplace' then
    assigned := 'marketplace';
  else
    assigned := 'pending';
  end if;
  insert into public.profiles (id, email, role, intent, display_name)
  values (
    new.id,
    new.email,
    assigned,
    intent,
    coalesce(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        intent = excluded.intent,
        display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_self_or_staff on public.profiles;
drop policy if exists profiles_select_office on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_super on public.profiles;
drop policy if exists profiles_update_office on public.profiles;

-- Prototype: the static office login uses the anon key, not a JWT, same as faculty writes.
create policy profiles_select_office on public.profiles for select using (true);
create policy profiles_insert_own
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role in ('pending', 'marketplace')
  );
create policy profiles_update_office
  on public.profiles for update
  using (true)
  with check (role in ('pending', 'admin', 'super_admin', 'marketplace', 'rejected'));

insert into public.profiles (id, email, role, intent, display_name)
select
  u.id,
  u.email,
  case
    when coalesce(u.raw_user_meta_data->>'intent', 'staff') = 'marketplace' then 'marketplace'
    else 'pending'
  end,
  coalesce(u.raw_user_meta_data->>'intent', 'staff'),
  coalesce(u.raw_user_meta_data->>'display_name', '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      intent = excluded.intent,
      display_name = excluded.display_name;

create table if not exists public.listings (
  id text primary key default gen_random_uuid()::text,
  seller_id uuid references auth.users (id) on delete cascade,
  title text not null,
  title_zh text not null default '',
  blurb text not null default '',
  blurb_zh text not null default '',
  format text not null default '',
  price numeric not null default 0,
  kind text not null default 'book',
  tag text not null default 'elective',
  image_url text not null default '',
  sold boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.listings add column if not exists removed boolean not null default false;
alter table public.listings add column if not exists removed_at timestamptz;
alter table public.listings add column if not exists seller_seen boolean not null default true;

alter table public.listings enable row level security;

drop policy if exists listings_select_public on public.listings;
drop policy if exists listings_insert_seller on public.listings;
drop policy if exists listings_update_owner on public.listings;
drop policy if exists listings_delete_owner on public.listings;

create policy listings_select_public on public.listings for select using (true);
create policy listings_insert_seller
  on public.listings for insert
  with check (
    auth.uid() = seller_id
    and public.current_role() in ('marketplace', 'admin', 'super_admin')
  );
create policy listings_update_owner
  on public.listings for update
  using (
    auth.uid() = seller_id
    or public.current_role() in ('admin', 'super_admin')
  );
create policy listings_delete_owner
  on public.listings for delete
  using (
    auth.uid() = seller_id
    or public.current_role() in ('admin', 'super_admin')
  );
-- Prototype office login (admin/123456) uses the anon key, not a staff JWT.
drop policy if exists listings_delete_office on public.listings;
create policy listings_delete_office on public.listings for delete using (true);
drop policy if exists listings_update_office on public.listings;
create policy listings_update_office on public.listings for update using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('marketplace-photos', 'marketplace-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists marketplace_photos_public_read on storage.objects;
drop policy if exists marketplace_photos_public_write on storage.objects;

create policy marketplace_photos_public_read
  on storage.objects for select using (bucket_id = 'marketplace-photos');
create policy marketplace_photos_public_write
  on storage.objects for insert with check (bucket_id = 'marketplace-photos');
