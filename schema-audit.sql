-- Back-office audit log, version snapshots, and point-in-time rollback.
-- Run after schema-auth.sql. Writes go through SECURITY DEFINER RPCs only.
-- Role map: super_admin → SUPER_ADMIN, admin → ADMIN, marketplace/pending → USER.

create extension if not exists pgcrypto;

create schema if not exists audit;

create table if not exists audit.hmac_secret (
  id int primary key default 1 check (id = 1),
  secret text not null
);

insert into audit.hmac_secret (id, secret)
values (1, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

revoke all on schema audit from public, anon, authenticated;
grant usage on schema audit to postgres;

create table if not exists public.backoffice_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_email varchar(255) not null,
  actor_role text not null check (actor_role in ('SUPER_ADMIN', 'ADMIN', 'USER', 'SYSTEM')),
  impersonator_id uuid,
  module varchar(50) not null,
  action varchar(50) not null,
  entity_type varchar(100) not null,
  entity_id varchar(100) not null,
  entity_label varchar(255) not null default '',
  sensitivity_level text not null default 'INTERNAL'
    check (sensitivity_level in ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'PII_FERPA')),
  old_values jsonb,
  new_values jsonb,
  version_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address varchar(45),
  user_agent text,
  request_id uuid not null default gen_random_uuid(),
  integrity_hash varchar(64) not null,
  status text not null default 'SUCCESS' check (status in ('SUCCESS', 'FAILURE', 'DENIED'))
);

create index if not exists backoffice_audit_logs_time_idx on public.backoffice_audit_logs (created_at desc);
create index if not exists backoffice_audit_logs_role_idx on public.backoffice_audit_logs (actor_role);
create index if not exists backoffice_audit_logs_module_idx on public.backoffice_audit_logs (module);
create index if not exists backoffice_audit_logs_entity_idx on public.backoffice_audit_logs (entity_type, entity_id);

create table if not exists public.entity_version_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity_type varchar(100) not null,
  entity_id varchar(100) not null,
  version_number int not null,
  full_snapshot jsonb not null,
  is_deleted_state boolean not null default false,
  created_by_id uuid,
  created_by_role text not null check (created_by_role in ('SUPER_ADMIN', 'ADMIN', 'USER', 'SYSTEM')),
  audit_log_id uuid references public.backoffice_audit_logs (id),
  checksum varchar(64) not null,
  unique (entity_type, entity_id, version_number)
);

create index if not exists entity_version_snapshots_entity_idx
  on public.entity_version_snapshots (entity_type, entity_id, created_at desc);

alter table public.backoffice_audit_logs enable row level security;
alter table public.entity_version_snapshots enable row level security;

drop policy if exists audit_logs_select_scoped on public.backoffice_audit_logs;
drop policy if exists snapshots_select_scoped on public.entity_version_snapshots;

create policy audit_logs_select_scoped on public.backoffice_audit_logs
  for select using (
    public.current_role() = 'super_admin'
    or (
      public.current_role() = 'admin'
      and actor_role = 'USER'
    )
  );

create policy snapshots_select_scoped on public.entity_version_snapshots
  for select using (
    public.current_role() = 'super_admin'
    or (
      public.current_role() = 'admin'
      and created_by_role = 'USER'
    )
  );

revoke insert, update, delete on public.backoffice_audit_logs from anon, authenticated, public;
revoke insert, update, delete on public.entity_version_snapshots from anon, authenticated, public;
grant select on public.backoffice_audit_logs to anon, authenticated;
grant select on public.entity_version_snapshots to anon, authenticated;

create or replace function audit.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit tables are append-only';
end;
$$;

drop trigger if exists backoffice_audit_logs_immutable on public.backoffice_audit_logs;
create trigger backoffice_audit_logs_immutable
  before update or delete on public.backoffice_audit_logs
  for each row execute function audit.forbid_mutation();

drop trigger if exists entity_version_snapshots_immutable on public.entity_version_snapshots;
create trigger entity_version_snapshots_immutable
  before update or delete on public.entity_version_snapshots
  for each row execute function audit.forbid_mutation();

create or replace function audit.scrub(payload jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(payload, '{}'::jsonb)
    - 'password' - 'password_hash' - 'mfa_secret' - 'api_key'
    - 'session_token' - 'ssn' - 'anon_key' - 'access_token' - 'refresh_token'
$$;

create or replace function audit.tier()
returns text
language sql
stable
as $$
  select case public.current_role()
    when 'super_admin' then 'SUPER_ADMIN'
    when 'admin' then 'ADMIN'
    when 'marketplace' then 'USER'
    when 'pending' then 'USER'
    when 'rejected' then 'USER'
    else case when auth.uid() is null then 'SUPER_ADMIN' else 'USER' end
  end
$$;

create or replace function audit.require_office()
returns text
language plpgsql
stable
as $$
declare
  tier text := audit.tier();
begin
  if tier = 'USER' and auth.uid() is not null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return tier;
end;
$$;

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
  email text := coalesce((select p.email from public.profiles p where p.id = auth.uid()), 'office-local');
  prev text := '';
  secret text;
  log_id uuid := gen_random_uuid();
  snap_id uuid;
  version_no int := 0;
  old_s jsonb := audit.scrub(p_old_values);
  new_s jsonb := audit.scrub(p_new_values);
  snap jsonb;
  chain text;
begin
  if coalesce(p_status, 'SUCCESS') not in ('SUCCESS', 'FAILURE', 'DENIED') then
    p_status := 'SUCCESS';
  end if;
  select s.secret into secret from audit.hmac_secret s where s.id = 1;
  select l.integrity_hash into prev
  from public.backoffice_audit_logs l
  order by l.created_at desc, l.id desc
  limit 1;
  prev := coalesce(prev, '');
  chain := encode(
    extensions.hmac(
      convert_to(
        prev
          || coalesce(actor::text, '')
          || coalesce(p_action, '')
          || coalesce(p_entity_id, '')
          || coalesce(new_s::text, ''),
        'UTF8'
      ),
      convert_to(secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.backoffice_audit_logs (
    id, actor_id, actor_email, actor_role, module, action, entity_type, entity_id, entity_label,
    old_values, new_values, metadata, integrity_hash, status
  ) values (
    log_id, actor, email, tier, upper(p_module), upper(p_action), p_entity_type, p_entity_id,
    coalesce(p_entity_label, ''), old_s, new_s, coalesce(p_metadata, '{}'::jsonb), chain, p_status
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
    -- integrity trigger blocks UPDATE; insert a follow-up note in metadata via new log only.
  end if;

  return log_id;
end;
$$;

create or replace function public.audit_list(p_limit int default 80, p_module text default null)
returns setof public.backoffice_audit_logs
language plpgsql
security definer
stable
set search_path = public, audit, extensions, pg_temp
as $$
declare
  tier text := audit.require_office();
begin
  return query
  select l.*
  from public.backoffice_audit_logs l
  where (p_module is null or l.module = upper(p_module))
    and (
      tier = 'SUPER_ADMIN'
      or (tier = 'ADMIN' and l.actor_role = 'USER')
    )
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 80), 300));
end;
$$;

create or replace function public.audit_verify_integrity()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, audit, extensions, pg_temp
as $$
declare
  rec record;
  prev text := '';
  secret text;
  expected text;
  broken int := 0;
  checked int := 0;
  first_break uuid;
begin
  if audit.tier() <> 'SUPER_ADMIN' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  select s.secret into secret from audit.hmac_secret s where s.id = 1;
  for rec in
    select * from public.backoffice_audit_logs order by created_at, id
  loop
    checked := checked + 1;
    expected := encode(
      extensions.hmac(
        convert_to(
          prev
            || coalesce(rec.actor_id::text, '')
            || coalesce(rec.action, '')
            || coalesce(rec.entity_id, '')
            || coalesce(rec.new_values::text, ''),
          'UTF8'
        ),
        convert_to(secret, 'UTF8'),
        'sha256'
      ),
      'hex'
    );
    if expected <> rec.integrity_hash then
      broken := broken + 1;
      if first_break is null then first_break := rec.id; end if;
    end if;
    prev := rec.integrity_hash;
  end loop;
  return jsonb_build_object('checked', checked, 'broken', broken, 'first_break', first_break, 'ok', broken = 0);
end;
$$;

create or replace function audit.apply_snapshot(p_type text, p_id text, p_snap jsonb, p_deleted boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s jsonb := coalesce(p_snap, '{}'::jsonb);
begin
  if p_deleted then
    if p_type = 'faculty' then delete from public.faculty where id = p_id;
    elsif p_type = 'news' then delete from public.news where id = p_id;
    elsif p_type = 'alumni' then delete from public.alumni where id = p_id;
    elsif p_type = 'listings' then
      update public.listings set removed = true, removed_at = now(), seller_seen = false where id = p_id;
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
      id, date, link_url, sort_order, status, source, official_url, title_en, title_zh, content_en, content_zh, photos, updated_at
    ) values (
      coalesce(s->>'id', p_id), coalesce((s->>'date')::date, current_date), coalesce(s->>'link_url', ''),
      coalesce((s->>'sort_order')::int, 0), coalesce(nullif(s->>'status', ''), 'published'),
      coalesce(s->>'source', ''), coalesce(s->>'official_url', ''), coalesce(s->>'title_en', ''),
      coalesce(s->>'title_zh', ''), coalesce(s->>'content_en', ''), coalesce(s->>'content_zh', ''),
      coalesce(s->'photos', '[]'::jsonb), now()
    )
    on conflict (id) do update set
      date = excluded.date, link_url = excluded.link_url, sort_order = excluded.sort_order,
      status = excluded.status, source = excluded.source, official_url = excluded.official_url,
      title_en = excluded.title_en, title_zh = excluded.title_zh, content_en = excluded.content_en,
      content_zh = excluded.content_zh, photos = excluded.photos, updated_at = now();
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

create or replace function public.audit_restore_single(p_version_id uuid, p_reason text default '')
returns uuid
language plpgsql
security definer
set search_path = public, audit, extensions, pg_temp
as $$
declare
  tier text := audit.require_office();
  snap public.entity_version_snapshots;
  expected text;
begin
  select * into snap from public.entity_version_snapshots where id = p_version_id;
  if not found then raise exception 'Version not found'; end if;
  if tier = 'ADMIN' and snap.created_by_role <> 'USER' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  expected := encode(extensions.digest(coalesce(snap.full_snapshot::text, ''), 'sha256'), 'hex');
  if expected <> snap.checksum then
    raise exception 'Snapshot checksum mismatch';
  end if;
  perform audit.apply_snapshot(snap.entity_type, snap.entity_id, snap.full_snapshot, snap.is_deleted_state);
  return public.audit_write(
    'SECURITY_ROLLBACK',
    'ROLLBACK_SINGLE',
    snap.entity_type,
    snap.entity_id,
    coalesce(snap.full_snapshot->>'full_name', snap.full_snapshot->>'name', snap.full_snapshot->>'title', snap.entity_id),
    null,
    snap.full_snapshot,
    jsonb_build_object('reason', p_reason, 'restored_version', snap.version_number),
    'SUCCESS',
    true,
    snap.is_deleted_state
  );
end;
$$;

create or replace function public.audit_rollback_preview(p_target timestamptz, p_actor_id uuid default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, audit, extensions, pg_temp
as $$
declare
  items jsonb := '[]'::jsonb;
  rec record;
  prior public.entity_version_snapshots;
begin
  if audit.tier() <> 'SUPER_ADMIN' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  for rec in
    select distinct entity_type, entity_id
    from public.entity_version_snapshots
    where created_at > p_target
      and (p_actor_id is null or created_by_id = p_actor_id)
  loop
    select * into prior
    from public.entity_version_snapshots
    where entity_type = rec.entity_type and entity_id = rec.entity_id and created_at <= p_target
    order by created_at desc, version_number desc
    limit 1;
    items := items || jsonb_build_array(jsonb_build_object(
      'entity_type', rec.entity_type,
      'entity_id', rec.entity_id,
      'plan', case
        when prior.id is null then 'DELETE_NEW'
        when prior.is_deleted_state then 'DELETE'
        else 'RESTORE'
      end,
      'version_id', prior.id,
      'version_number', prior.version_number
    ));
  end loop;
  return jsonb_build_object('target', p_target, 'count', jsonb_array_length(items), 'items', items);
end;
$$;

create or replace function public.audit_rollback_execute(
  p_target timestamptz,
  p_confirm text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit, extensions, pg_temp
as $$
declare
  preview jsonb;
  item jsonb;
  snap public.entity_version_snapshots;
  restored int := 0;
  expected text;
begin
  if audit.tier() <> 'SUPER_ADMIN' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_confirm <> 'ROLLBACK' then
    raise exception 'Step-up confirmation required';
  end if;
  preview := public.audit_rollback_preview(p_target, p_actor_id);
  for item in select * from jsonb_array_elements(preview->'items')
  loop
    if item->>'plan' = 'DELETE_NEW' then
      perform audit.apply_snapshot(item->>'entity_type', item->>'entity_id', '{}'::jsonb, true);
    else
      select * into snap from public.entity_version_snapshots where id = (item->>'version_id')::uuid;
      expected := encode(extensions.digest(coalesce(snap.full_snapshot::text, ''), 'sha256'), 'hex');
      if expected <> snap.checksum then
        raise exception 'Snapshot checksum mismatch for % %', snap.entity_type, snap.entity_id;
      end if;
      perform audit.apply_snapshot(snap.entity_type, snap.entity_id, snap.full_snapshot, snap.is_deleted_state);
    end if;
    restored := restored + 1;
  end loop;
  perform public.audit_write(
    'SECURITY_ROLLBACK',
    'ROLLBACK_GLOBAL',
    'Site',
    'global',
    'Point-in-time rollback',
    null,
    preview,
    jsonb_build_object('target_timestamp', p_target, 'affected_records_count', restored, 'filter_actor', p_actor_id),
    'SUCCESS',
    false,
    false
  );
  return jsonb_build_object('restored', restored, 'preview', preview);
end;
$$;

grant execute on function public.audit_write(text, text, text, text, text, jsonb, jsonb, jsonb, text, boolean, boolean) to anon, authenticated;
grant execute on function public.audit_list(int, text) to anon, authenticated;
grant execute on function public.audit_verify_integrity() to anon, authenticated;
grant execute on function public.audit_restore_single(uuid, text) to anon, authenticated;
grant execute on function public.audit_rollback_preview(timestamptz, uuid) to anon, authenticated;
grant execute on function public.audit_rollback_execute(timestamptz, text, uuid) to anon, authenticated;

create or replace function public.audit_list_versions(p_entity_type text, p_entity_id text)
returns setof public.entity_version_snapshots
language plpgsql
security definer
stable
set search_path = public, audit, extensions, pg_temp
as $$
declare
  tier text := audit.require_office();
begin
  return query
  select v.*
  from public.entity_version_snapshots v
  where v.entity_type = p_entity_type
    and v.entity_id = p_entity_id
    and (tier = 'SUPER_ADMIN' or (tier = 'ADMIN' and v.created_by_role = 'USER'))
  order by v.version_number desc;
end;
$$;

grant execute on function public.audit_list_versions(text, text) to anon, authenticated;
