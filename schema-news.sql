-- Cloud announcements. Run after schema.sql so News matches Faculty: every office login sees the same posts.
-- Photos go in the public news-photos bucket.

create table if not exists public.news (
  id text primary key,
  date date not null default current_date,
  link_url text not null default '',
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('published', 'draft')),
  source text not null default '',
  official_url text not null default '',
  title_en text not null default '',
  title_zh text not null default '',
  content_en text not null default '',
  content_zh text not null default '',
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_sort_idx on public.news (sort_order, date desc);

alter table public.news enable row level security;

drop policy if exists news_select_public on public.news;
drop policy if exists news_insert_public on public.news;
drop policy if exists news_update_public on public.news;
drop policy if exists news_delete_public on public.news;

-- Prototype uses the anon key from the static site (local admin login is not a Supabase JWT).
create policy news_select_public on public.news for select using (true);
create policy news_insert_public on public.news for insert with check (true);
create policy news_update_public on public.news for update using (true) with check (true);
create policy news_delete_public on public.news for delete using (true);

insert into storage.buckets (id, name, public)
values ('news-photos', 'news-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists news_photos_public_read on storage.objects;
drop policy if exists news_photos_public_write on storage.objects;
drop policy if exists news_photos_public_update on storage.objects;
drop policy if exists news_photos_public_delete on storage.objects;

create policy news_photos_public_read
  on storage.objects for select using (bucket_id = 'news-photos');
create policy news_photos_public_write
  on storage.objects for insert with check (bucket_id = 'news-photos');
create policy news_photos_public_update
  on storage.objects for update using (bucket_id = 'news-photos');
create policy news_photos_public_delete
  on storage.objects for delete using (bucket_id = 'news-photos');
