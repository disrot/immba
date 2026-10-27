-- Assignment #7 alumni office. Run after schema-auth.sql.
-- Degree program is a controlled list: Bachelor | Master | Doctoral | Other.
-- Every create, update, delete, and batch import writes a row to alumni_audit.

create table if not exists public.alumni (
  id text primary key default gen_random_uuid()::text,
  full_name text not null default '',
  student_id text not null unique,
  department text not null default '',
  degree_program text not null default 'Other' check (degree_program in ('Bachelor', 'Master', 'Doctoral', 'Other')),
  admission_year text not null default '',
  graduation_year text not null default '',
  email text not null default '',
  phone text not null default '',
  company text not null default '',
  job_title text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alumni_name_idx on public.alumni (full_name);
create index if not exists alumni_degree_idx on public.alumni (degree_program);
create index if not exists alumni_grad_idx on public.alumni (graduation_year);

alter table public.alumni enable row level security;

drop policy if exists alumni_select_public on public.alumni;
drop policy if exists alumni_insert_public on public.alumni;
drop policy if exists alumni_update_public on public.alumni;
drop policy if exists alumni_delete_public on public.alumni;

create policy alumni_select_public on public.alumni for select using (true);
create policy alumni_insert_public on public.alumni for insert with check (true);
create policy alumni_update_public on public.alumni for update using (true) with check (true);
create policy alumni_delete_public on public.alumni for delete using (true);

create table if not exists public.alumni_audit (
  id text primary key default gen_random_uuid()::text,
  actor_email text not null default '',
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE', 'IMPORT')),
  record_id text not null default '',
  record_label text not null default '',
  summary text not null default '',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists alumni_audit_time_idx on public.alumni_audit (created_at desc);

alter table public.alumni_audit enable row level security;

drop policy if exists alumni_audit_select_public on public.alumni_audit;
drop policy if exists alumni_audit_insert_public on public.alumni_audit;

create policy alumni_audit_select_public on public.alumni_audit for select using (true);
create policy alumni_audit_insert_public on public.alumni_audit for insert with check (true);
