-- imMBA assignment #6 — run this in the Supabase SQL editor of project immba-backend.
-- After this: Storage → create a public bucket named faculty-photos if the insert below is blocked.
-- Then set Vercel env VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or paste them in AdminFaculty.
-- After the faculty table exists, also run schema-auth.sql for register, roles, and marketplace listings.
-- Then run schema-news.sql so announcements sync across browsers like Faculty.

create extension if not exists pgcrypto;

create table if not exists public.faculty (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  title text not null default '',
  education text not null default '',
  research_fields text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  image_url text not null default '',
  category text not null default 'fulltime' check (category in ('fulltime', 'adjunct')),
  sort_order integer not null default 0,
  last_name text not null default '',
  rank text not null default 'associate',
  department text not null default '',
  title_zh text not null default '',
  education_zh text not null default '',
  research_fields_zh text not null default '',
  department_zh text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faculty_sort_idx on public.faculty (sort_order, name);

alter table public.faculty enable row level security;

drop policy if exists faculty_select_public on public.faculty;
drop policy if exists faculty_insert_public on public.faculty;
drop policy if exists faculty_update_public on public.faculty;
drop policy if exists faculty_delete_public on public.faculty;

-- Prototype uses the anon key from the static site (local admin login is not a Supabase JWT).
-- Tighten these after Super Admin / auth.users is wired.
create policy faculty_select_public on public.faculty for select using (true);
create policy faculty_insert_public on public.faculty for insert with check (true);
create policy faculty_update_public on public.faculty for update using (true) with check (true);
create policy faculty_delete_public on public.faculty for delete using (true);

-- Lecture roles: pending → admin → super_admin. Not used by local login yet.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'pending' check (role in ('pending', 'admin', 'super_admin', 'marketplace', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);

insert into storage.buckets (id, name, public)
values ('faculty-photos', 'faculty-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists faculty_photos_public_read on storage.objects;
drop policy if exists faculty_photos_public_write on storage.objects;
drop policy if exists faculty_photos_public_update on storage.objects;
drop policy if exists faculty_photos_public_delete on storage.objects;

create policy faculty_photos_public_read
  on storage.objects for select using (bucket_id = 'faculty-photos');
create policy faculty_photos_public_write
  on storage.objects for insert with check (bucket_id = 'faculty-photos');
create policy faculty_photos_public_update
  on storage.objects for update using (bucket_id = 'faculty-photos');
create policy faculty_photos_public_delete
  on storage.objects for delete using (bucket_id = 'faculty-photos');

-- Seed one required-shape row. Push the rest from AdminFaculty → Seed from local prototype.
insert into public.faculty (
  id, name, title, education, research_fields, email, phone, website, image_url, category, sort_order, last_name, rank, department, title_zh, education_zh, research_fields_zh, department_zh
) values (
  'tu',
  'Yi-Ning Tu',
  'Associate Professor',
  'Ph.D. in Information Management, National Chengchi University, Taiwan',
  'Data Mining, Text Mining, Artificial Intelligence, Machine Learning, Information Retrieval',
  '082435@mail.fju.edu.tw',
  '#3988，LM208-2',
  'https://sites.google.com/view/yiningtu',
  'images/faculty/yi-ning-tu.jpg',
  'fulltime',
  1,
  'Tu',
  'associate',
  'Chair of MBA Program in International Management (imMBA)',
  '副教授',
  '政治大學資訊管理博士，臺灣',
  '資料探勘、文本探勘、人工智慧、機器學習、資訊檢索',
  '國際經營管理碩士學程（imMBA）主任'
)
on conflict (id) do nothing;
