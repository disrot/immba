-- Production authorization, transactional audit, concurrency, and media queue.
-- Live schema already exists; this migration only tightens and extends it.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function app_private.has_page(p_page text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p_page = any (p.pages)
  )
$$;

create or replace function app_private.require_office()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role text := app_private.current_role();
begin
  if role not in ('admin', 'super_admin') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return role;
end;
$$;

create or replace function app_private.require_aal2()
returns void
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if exists (
    select 1 from auth.mfa_factors
    where user_id = auth.uid() and status = 'verified'
  ) and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'MFA required' using errcode = '42501';
  end if;
end;
$$;

create or replace function app_private.require_page(p_page text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role text := app_private.require_office();
begin
  if role <> 'super_admin' and not app_private.has_page(p_page) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return role;
end;
$$;

-- Bootstrap the designated super admin and explicit admin pages.
update public.profiles
set role = 'super_admin',
    pages = array['analytics','people','access','listings','alumni','faculty','audit','news','compose','orders','workflows']
where lower(email) = 'seapwgt@gmail.com';

update public.profiles
set pages = array['analytics','people','listings','alumni','faculty','news','compose']
where role = 'admin'
  and coalesce(array_length(pages, 1), 0) = 0;

alter table public.news add column if not exists revision bigint not null default 1;
alter table public.listings add column if not exists inventory_on_hand integer not null default 1;
alter table public.listings add column if not exists inventory_reserved integer not null default 0;
alter table public.listings add column if not exists unit_amount integer;
alter table public.listings add column if not exists currency text not null default 'twd';
alter table public.listings add column if not exists listing_status text not null default 'active';
update public.listings set unit_amount = greatest(0, round(price)::int) where unit_amount is null;
update public.listings set listing_status = 'removed' where removed and listing_status = 'active';

-- Audit tier no longer treats a missing JWT as super admin.
create or replace function audit.tier()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case app_private.current_role()
    when 'super_admin' then 'SUPER_ADMIN'
    when 'admin' then 'ADMIN'
    when 'marketplace' then 'USER'
    when 'pending' then 'USER'
    when 'rejected' then 'USER'
    else 'USER'
  end
$$;

create or replace function audit.require_office()
returns text
language plpgsql
stable
security definer
set search_path = public, audit
as $$
declare
  tier text := audit.tier();
begin
  if auth.uid() is null or tier not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return tier;
end;
$$;

create or replace function audit.capture_row()
returns trigger
language plpgsql
security definer
set search_path = public, audit, extensions
as $$
declare
  skip text := current_setting('app.audit_skip', true);
  entity_id text;
  label text;
  action text;
  old_row jsonb;
  new_row jsonb;
  deleted boolean := false;
begin
  if skip = '1' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    action := 'CREATE';
    new_row := to_jsonb(new);
    entity_id := coalesce(new_row->>'id', '');
    label := coalesce(new_row->>'name', new_row->>'title', new_row->>'full_name', new_row->>'email', entity_id);
  elsif tg_op = 'UPDATE' then
    action := 'UPDATE';
    old_row := to_jsonb(old);
    new_row := to_jsonb(new);
    entity_id := coalesce(new_row->>'id', '');
    label := coalesce(new_row->>'name', new_row->>'title', new_row->>'full_name', new_row->>'email', entity_id);
    if tg_table_name = 'listings' and coalesce((new_row->>'removed')::boolean, false) and not coalesce((old_row->>'removed')::boolean, false) then
      action := 'DELETE';
      deleted := true;
    end if;
  else
    action := 'DELETE';
    old_row := to_jsonb(old);
    entity_id := coalesce(old_row->>'id', '');
    label := coalesce(old_row->>'name', old_row->>'title', old_row->>'full_name', old_row->>'email', entity_id);
    deleted := true;
  end if;
  perform public.audit_write(
    case tg_table_name
      when 'news' then 'ANNOUNCEMENTS'
      when 'alumni' then 'STUDENT_RECORDS'
      when 'profiles' then 'AUTH'
      else 'CMS_PAGES'
    end,
    action,
    tg_table_name,
    entity_id,
    label,
    old_row,
    new_row,
    jsonb_build_object('source', 'trigger'),
    'SUCCESS',
    true,
    deleted
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists faculty_audit on public.faculty;
create trigger faculty_audit after insert or update or delete on public.faculty
  for each row execute function audit.capture_row();
drop trigger if exists news_audit on public.news;
create trigger news_audit after insert or update or delete on public.news
  for each row execute function audit.capture_row();
drop trigger if exists alumni_audit_row on public.alumni;
create trigger alumni_audit_row after insert or update or delete on public.alumni
  for each row execute function audit.capture_row();
drop trigger if exists listings_audit on public.listings;
create trigger listings_audit after insert or update or delete on public.listings
  for each row execute function audit.capture_row();
drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function audit.capture_row();

create or replace function audit.apply_snapshot(p_type text, p_id text, p_snap jsonb, p_deleted boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s jsonb := coalesce(p_snap, '{}'::jsonb);
begin
  perform set_config('app.audit_skip', '1', true);
  if p_type = 'profiles' then
    if p_deleted then
      update public.profiles
      set role = 'rejected', pages = '{}'::text[]
      where id = p_id::uuid;
    else
      update public.profiles
      set role = coalesce(nullif(s->>'role', ''), role),
          pages = case when jsonb_typeof(s->'pages') = 'array'
            then array(select jsonb_array_elements_text(s->'pages'))
            else pages end,
          intent = coalesce(nullif(s->>'intent', ''), intent),
          display_name = coalesce(s->>'display_name', display_name)
      where id = p_id::uuid;
    end if;
    return;
  end if;
  if p_deleted then
    if p_type = 'faculty' then delete from public.faculty where id = p_id;
    elsif p_type = 'news' then delete from public.news where id = p_id;
    elsif p_type = 'alumni' then delete from public.alumni where id = p_id;
    elsif p_type = 'listings' then
      update public.listings set removed = true, removed_at = now(), seller_seen = false, listing_status = 'removed' where id = p_id;
    else
      raise exception 'Unsupported entity type %', p_type;
    end if;
    return;
  end if;
  if p_type = 'faculty' then
    insert into public.faculty (
      id, name, title, education, research_fields, email, phone, website, image_url,
      category, sort_order, last_name, rank, department, title_zh, education_zh, research_fields_zh, department_zh, updated_at
    ) values (
      coalesce(s->>'id', p_id), coalesce(s->>'name', ''), coalesce(s->>'title', ''), coalesce(s->>'education', ''),
      coalesce(s->>'research_fields', ''), coalesce(s->>'email', ''), coalesce(s->>'phone', ''), coalesce(s->>'website', ''),
      coalesce(s->>'image_url', ''), coalesce(nullif(s->>'category', ''), 'fulltime'), coalesce((s->>'sort_order')::int, 0),
      coalesce(s->>'last_name', ''), coalesce(s->>'rank', 'associate'), coalesce(s->>'department', ''),
      coalesce(s->>'title_zh', ''), coalesce(s->>'education_zh', ''), coalesce(s->>'research_fields_zh', ''),
      coalesce(s->>'department_zh', ''), now()
    )
    on conflict (id) do update set
      name = excluded.name, title = excluded.title, education = excluded.education,
      research_fields = excluded.research_fields, email = excluded.email, phone = excluded.phone,
      website = excluded.website, image_url = excluded.image_url, category = excluded.category,
      sort_order = excluded.sort_order, last_name = excluded.last_name, rank = excluded.rank,
      department = excluded.department, title_zh = excluded.title_zh, education_zh = excluded.education_zh,
      research_fields_zh = excluded.research_fields_zh, department_zh = excluded.department_zh, updated_at = now();
  elsif p_type = 'news' then
    insert into public.news (
      id, date, link_url, sort_order, status, source, official_url, title_en, title_zh, content_en, content_zh, photos, revision, updated_at
    ) values (
      coalesce(s->>'id', p_id), coalesce((s->>'date')::date, current_date), coalesce(s->>'link_url', s->>'link', ''),
      coalesce((s->>'sort_order')::int, coalesce((s->>'order')::int, 0)), coalesce(nullif(s->>'status', ''), 'published'),
      coalesce(s->>'source', ''), coalesce(s->>'official_url', s->>'official', ''), coalesce(s->>'title_en', ''),
      coalesce(s->>'title_zh', ''), coalesce(s->>'content_en', ''), coalesce(s->>'content_zh', ''),
      coalesce(s->'photos', '[]'::jsonb), coalesce((s->>'revision')::bigint, 1), now()
    )
    on conflict (id) do update set
      date = excluded.date, link_url = excluded.link_url, sort_order = excluded.sort_order,
      status = excluded.status, source = excluded.source, official_url = excluded.official_url,
      title_en = excluded.title_en, title_zh = excluded.title_zh, content_en = excluded.content_en,
      content_zh = excluded.content_zh, photos = excluded.photos, revision = public.news.revision + 1, updated_at = now();
  elsif p_type = 'alumni' then
    insert into public.alumni (
      id, full_name, student_id, department, degree_program, admission_year, graduation_year,
      email, phone, company, job_title, notes, updated_at
    ) values (
      coalesce(s->>'id', p_id), coalesce(s->>'full_name', ''), coalesce(s->>'student_id', p_id),
      coalesce(s->>'department', ''), coalesce(nullif(s->>'degree_program', ''), 'Other'),
      coalesce(s->>'admission_year', ''), coalesce(s->>'graduation_year', ''), coalesce(s->>'email', ''),
      coalesce(s->>'phone', ''), coalesce(s->>'company', ''), coalesce(s->>'job_title', ''),
      coalesce(s->>'notes', ''), now()
    )
    on conflict (id) do update set
      full_name = excluded.full_name, student_id = excluded.student_id, department = excluded.department,
      degree_program = excluded.degree_program, admission_year = excluded.admission_year,
      graduation_year = excluded.graduation_year, email = excluded.email, phone = excluded.phone,
      company = excluded.company, job_title = excluded.job_title, notes = excluded.notes, updated_at = now();
  elsif p_type = 'listings' then
    insert into public.listings (
      id, seller_id, title, title_zh, blurb, blurb_zh, format, price, kind, tag, image_url, sold, removed, seller_seen
    ) values (
      coalesce(s->>'id', p_id), nullif(s->>'seller_id', '')::uuid, coalesce(s->>'title', 'Listing'),
      coalesce(s->>'title_zh', ''), coalesce(s->>'blurb', ''), coalesce(s->>'blurb_zh', ''),
      coalesce(s->>'format', ''), coalesce((s->>'price')::numeric, 0), coalesce(s->>'kind', 'book'),
      coalesce(s->>'tag', 'elective'), coalesce(s->>'image_url', ''), coalesce((s->>'sold')::boolean, false),
      coalesce((s->>'removed')::boolean, false), coalesce((s->>'seller_seen')::boolean, true)
    )
    on conflict (id) do update set
      title = excluded.title, title_zh = excluded.title_zh, blurb = excluded.blurb, blurb_zh = excluded.blurb_zh,
      format = excluded.format, price = excluded.price, kind = excluded.kind, tag = excluded.tag,
      image_url = excluded.image_url, sold = excluded.sold, removed = excluded.removed, seller_seen = excluded.seller_seen;
  else
    raise exception 'Unsupported entity type %', p_type;
  end if;
end;
$$;

create or replace function public.get_my_authorization()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if auth.uid() is null then
    return jsonb_build_object('role', '', 'pages', '[]'::jsonb);
  end if;
  select * into row from public.profiles where id = auth.uid();
  if not found then
    return jsonb_build_object('role', 'pending', 'pages', '[]'::jsonb, 'email', '');
  end if;
  return jsonb_build_object(
    'id', row.id,
    'email', row.email,
    'role', row.role,
    'intent', row.intent,
    'pages', to_jsonb(row.pages),
    'display_name', row.display_name
  );
end;
$$;

create or replace function public.office_save_faculty(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.faculty;
begin
  perform app_private.require_page('faculty');
  insert into public.faculty (
    id, name, title, education, research_fields, email, phone, website, image_url,
    category, sort_order, last_name, rank, department, title_zh, education_zh, research_fields_zh, department_zh, updated_at
  ) values (
    coalesce(nullif(p_row->>'id', ''), gen_random_uuid()::text),
    coalesce(p_row->>'name', ''), coalesce(p_row->>'title', ''), coalesce(p_row->>'education', ''),
    coalesce(p_row->>'research_fields', ''), coalesce(p_row->>'email', ''), coalesce(p_row->>'phone', ''),
    coalesce(p_row->>'website', ''), coalesce(p_row->>'image_url', ''),
    case when p_row->>'category' = 'adjunct' then 'adjunct' else 'fulltime' end,
    coalesce((p_row->>'sort_order')::int, 0), coalesce(p_row->>'last_name', ''),
    coalesce(nullif(p_row->>'rank', ''), 'associate'), coalesce(p_row->>'department', ''),
    coalesce(p_row->>'title_zh', ''), coalesce(p_row->>'education_zh', ''),
    coalesce(p_row->>'research_fields_zh', ''), coalesce(p_row->>'department_zh', ''), now()
  )
  on conflict (id) do update set
    name = excluded.name, title = excluded.title, education = excluded.education,
    research_fields = excluded.research_fields, email = excluded.email, phone = excluded.phone,
    website = excluded.website, image_url = excluded.image_url, category = excluded.category,
    sort_order = excluded.sort_order, last_name = excluded.last_name, rank = excluded.rank,
    department = excluded.department, title_zh = excluded.title_zh, education_zh = excluded.education_zh,
    research_fields_zh = excluded.research_fields_zh, department_zh = excluded.department_zh, updated_at = now()
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

create or replace function public.office_delete_faculty(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.require_page('faculty');
  delete from public.faculty where id = p_id;
end;
$$;

create or replace function public.office_reorder_faculty(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  perform app_private.require_page('faculty');
  for item in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    update public.faculty
    set sort_order = coalesce((item->>'sort_order')::int, sort_order), updated_at = now()
    where id = item->>'id';
  end loop;
end;
$$;

create or replace function public.office_save_news(p_row jsonb, p_expected_revision bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_rev bigint;
  saved public.news;
  nid text := coalesce(nullif(p_row->>'id', ''), gen_random_uuid()::text);
begin
  perform app_private.require_page('news');
  select revision into current_rev from public.news where id = nid for update;
  if current_rev is not null and p_expected_revision is not null and current_rev <> p_expected_revision then
    raise exception 'News revision conflict' using errcode = '40001';
  end if;
  insert into public.news (
    id, date, link_url, sort_order, status, source, official_url,
    title_en, title_zh, content_en, content_zh, photos, revision, updated_at
  ) values (
    nid,
    coalesce((p_row->>'date')::date, current_date),
    coalesce(p_row->>'link_url', p_row->>'link', ''),
    coalesce((p_row->>'sort_order')::int, coalesce((p_row->>'order')::int, 0)),
    case when p_row->>'status' = 'draft' then 'draft' else 'published' end,
    coalesce(p_row->>'source', ''),
    coalesce(p_row->>'official_url', p_row->>'official', ''),
    coalesce(p_row->>'title_en', ''),
    coalesce(p_row->>'title_zh', ''),
    coalesce(p_row->>'content_en', ''),
    coalesce(p_row->>'content_zh', ''),
    coalesce(p_row->'photos', '[]'::jsonb),
    coalesce(current_rev, 0) + 1,
    now()
  )
  on conflict (id) do update set
    date = excluded.date, link_url = excluded.link_url, sort_order = excluded.sort_order,
    status = excluded.status, source = excluded.source, official_url = excluded.official_url,
    title_en = excluded.title_en, title_zh = excluded.title_zh,
    content_en = excluded.content_en, content_zh = excluded.content_zh,
    photos = excluded.photos, revision = public.news.revision + 1, updated_at = now()
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

create or replace function public.office_delete_news(p_id text, p_expected_revision bigint default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_rev bigint;
begin
  perform app_private.require_page('news');
  select revision into current_rev from public.news where id = p_id for update;
  if current_rev is not null and p_expected_revision is not null and current_rev <> p_expected_revision then
    raise exception 'News revision conflict' using errcode = '40001';
  end if;
  delete from public.news where id = p_id;
end;
$$;

create or replace function public.office_save_alumni(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.alumni;
begin
  perform app_private.require_page('alumni');
  insert into public.alumni (
    id, full_name, student_id, department, degree_program, admission_year, graduation_year,
    email, phone, company, job_title, notes, updated_at
  ) values (
    coalesce(nullif(p_row->>'id', ''), gen_random_uuid()::text),
    coalesce(p_row->>'full_name', ''),
    coalesce(nullif(p_row->>'student_id', ''), gen_random_uuid()::text),
    coalesce(p_row->>'department', ''),
    coalesce(nullif(p_row->>'degree_program', ''), 'Other'),
    coalesce(p_row->>'admission_year', ''), coalesce(p_row->>'graduation_year', ''),
    coalesce(p_row->>'email', ''), coalesce(p_row->>'phone', ''),
    coalesce(p_row->>'company', ''), coalesce(p_row->>'job_title', ''),
    coalesce(p_row->>'notes', ''), now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name, student_id = excluded.student_id, department = excluded.department,
    degree_program = excluded.degree_program, admission_year = excluded.admission_year,
    graduation_year = excluded.graduation_year, email = excluded.email, phone = excluded.phone,
    company = excluded.company, job_title = excluded.job_title, notes = excluded.notes, updated_at = now()
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

create or replace function public.office_delete_alumni(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.require_page('alumni');
  delete from public.alumni where id = p_id;
end;
$$;

create or replace function public.office_remove_listing(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.require_page('listings');
  update public.listings
  set removed = true, removed_at = now(), seller_seen = false, listing_status = 'removed'
  where id = p_id;
end;
$$;

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
    kind, tag, image_url, sold, removed, seller_seen, inventory_on_hand, listing_status
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
    'active'
  )
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

create or replace function public.market_ack_removed(p_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set seller_seen = true
  where seller_id = auth.uid()
    and id = any (coalesce(p_ids, '{}'::text[]));
end;
$$;

create or replace function public.admin_update_profile(p_id uuid, p_role text, p_pages text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  super_count int;
begin
  if app_private.current_role() <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  perform app_private.require_aal2();
  if p_role not in ('pending', 'admin', 'super_admin', 'marketplace', 'rejected') then
    raise exception 'Invalid role';
  end if;
  if p_id = auth.uid() and p_role <> 'super_admin' then
    select count(*) into super_count from public.profiles where role = 'super_admin' and id <> p_id;
    if super_count < 1 then
      raise exception 'Cannot remove the last super admin';
    end if;
  end if;
  update public.profiles
  set role = p_role,
      pages = case
        when p_role = 'super_admin' then array['analytics','people','access','listings','alumni','faculty','audit','news','compose','orders','workflows']
        when p_role = 'admin' then coalesce(p_pages, '{}'::text[])
        else '{}'::text[]
      end
  where id = p_id;
end;
$$;

create or replace function public.office_delete_account(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  super_count int;
begin
  if app_private.current_role() <> 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  perform app_private.require_aal2();
  if p_id is null or p_id = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;
  if exists (select 1 from public.profiles where id = p_id and role = 'super_admin') then
    select count(*) into super_count from public.profiles where role = 'super_admin' and id <> p_id;
    if super_count < 1 then
      raise exception 'Cannot remove the last super admin';
    end if;
  end if;
  delete from public.profiles where id = p_id;
  delete from auth.users where id = p_id;
end;
$$;

-- RLS lockdown
drop policy if exists faculty_insert_public on public.faculty;
drop policy if exists faculty_update_public on public.faculty;
drop policy if exists faculty_delete_public on public.faculty;
drop policy if exists profiles_select_office on public.profiles;
drop policy if exists profiles_update_office on public.profiles;
drop policy if exists news_select_public on public.news;
drop policy if exists news_insert_public on public.news;
drop policy if exists news_update_public on public.news;
drop policy if exists news_delete_public on public.news;
drop policy if exists alumni_select_public on public.alumni;
drop policy if exists alumni_insert_public on public.alumni;
drop policy if exists alumni_update_public on public.alumni;
drop policy if exists alumni_delete_public on public.alumni;
drop policy if exists listings_update_office on public.listings;
drop policy if exists listings_delete_office on public.listings;
drop policy if exists listings_insert_seller on public.listings;
drop policy if exists listings_update_owner on public.listings;
drop policy if exists listings_delete_owner on public.listings;
drop policy if exists alumni_audit_select_public on public.alumni_audit;
drop policy if exists alumni_audit_insert_public on public.alumni_audit;
drop policy if exists faculty_photos_public_write on storage.objects;
drop policy if exists faculty_photos_public_update on storage.objects;
drop policy if exists faculty_photos_public_delete on storage.objects;
drop policy if exists news_photos_public_write on storage.objects;
drop policy if exists news_photos_public_update on storage.objects;
drop policy if exists news_photos_public_delete on storage.objects;
drop policy if exists marketplace_photos_public_write on storage.objects;

create policy profiles_select_staff on public.profiles
  for select using (
    auth.uid() = id
    or app_private.current_role() in ('admin', 'super_admin')
  );

create policy news_select_published on public.news
  for select using (
    status = 'published'
    or app_private.has_page('news')
    or app_private.current_role() = 'super_admin'
  );

create policy alumni_select_office on public.alumni
  for select using (app_private.has_page('alumni') or app_private.current_role() = 'super_admin');

revoke insert, update, delete on public.faculty from anon, authenticated;
revoke insert, update, delete on public.news from anon, authenticated;
revoke insert, update, delete on public.alumni from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.listings from anon, authenticated;
revoke insert, update, delete on public.alumni_audit from anon, authenticated;

create policy alumni_audit_select_office on public.alumni_audit
  for select using (app_private.has_page('alumni') or app_private.current_role() = 'super_admin');

create policy listings_select_visible on public.listings
  for select using (
    removed = false
    or seller_id = auth.uid()
    or app_private.has_page('listings')
    or app_private.current_role() = 'super_admin'
  );

drop policy if exists listings_select_public on public.listings;

create policy faculty_photos_auth_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'faculty-photos'
    and (app_private.has_page('faculty') or app_private.current_role() = 'super_admin')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy news_photos_auth_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'news-photos'
    and (app_private.has_page('news') or app_private.current_role() = 'super_admin')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy marketplace_photos_auth_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'marketplace-photos'
    and app_private.current_role() in ('marketplace', 'admin', 'super_admin')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists app_private.storage_cleanup_queue (
  id bigint generated always as identity primary key,
  bucket text not null,
  object_path text not null,
  enqueued_at timestamptz not null default now(),
  deleted_at timestamptz
);
revoke all on app_private.storage_cleanup_queue from public, anon, authenticated;

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false
);
alter table public.feature_flags enable row level security;
drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags for select using (true);
insert into public.feature_flags (key, enabled) values
  ('analytics', true),
  ('workflows', true),
  ('checkout', false)
on conflict (key) do nothing;
revoke insert, update, delete on public.feature_flags from anon, authenticated;

revoke execute on function public.audit_write(text, text, text, text, text, jsonb, jsonb, jsonb, text, boolean, boolean) from anon, authenticated, public;
revoke execute on function public.audit_list(int, text) from anon;
revoke execute on function public.audit_verify_integrity() from anon;
revoke execute on function public.audit_restore_single(uuid, text) from anon;
revoke execute on function public.audit_rollback_preview(timestamptz, uuid) from anon;
revoke execute on function public.audit_rollback_execute(timestamptz, text, uuid) from anon;
revoke execute on function public.audit_list_versions(text, text) from anon;
revoke execute on function public.office_delete_account(uuid) from anon, public;

grant execute on function public.get_my_authorization() to authenticated;
grant execute on function public.office_save_faculty(jsonb) to authenticated;
grant execute on function public.office_delete_faculty(text) to authenticated;
grant execute on function public.office_reorder_faculty(jsonb) to authenticated;
grant execute on function public.office_save_news(jsonb, bigint) to authenticated;
grant execute on function public.office_delete_news(text, bigint) to authenticated;
grant execute on function public.office_save_alumni(jsonb) to authenticated;
grant execute on function public.office_delete_alumni(text) to authenticated;
grant execute on function public.office_remove_listing(text) to authenticated;
grant execute on function public.market_create_listing(jsonb) to authenticated;
grant execute on function public.market_ack_removed(text[]) to authenticated;
grant execute on function public.admin_update_profile(uuid, text, text[]) to authenticated;
grant execute on function public.office_delete_account(uuid) to authenticated;
grant execute on function public.audit_list(int, text) to authenticated;
grant execute on function public.audit_verify_integrity() to authenticated;
grant execute on function public.audit_restore_single(uuid, text) to authenticated;
grant execute on function public.audit_rollback_preview(timestamptz, uuid) to authenticated;
grant execute on function public.audit_rollback_execute(timestamptz, text, uuid) to authenticated;
grant execute on function public.audit_list_versions(text, text) to authenticated;
