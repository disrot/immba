-- The public shelf can show the name and portrait a seller saved.

alter table public.profiles
  add column if not exists portrait text not null default '';

create or replace function public.market_save_portrait(p_name text, p_photo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo text := coalesce(p_photo, '');
begin
  if auth.uid() is null then
    raise exception 'Sign in before saving a portrait';
  end if;
  if length(photo) > 400000 then
    raise exception 'Portrait is too large';
  end if;
  update public.profiles
  set
    display_name = coalesce(nullif(trim(coalesce(p_name, '')), ''), display_name),
    portrait = case when photo = '' then portrait else photo end
  where id = auth.uid();
end;
$$;

create or replace function public.market_seller_faces()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      p.id::text,
      jsonb_build_object(
        'name', coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, ''), '@', 1)),
        'photo', coalesce(p.portrait, ''),
        'email', lower(coalesce(p.email, ''))
      )
    ),
    '{}'::jsonb
  )
  from public.profiles p
  where exists (
    select 1
    from public.listings l
    where l.seller_id = p.id
      and coalesce(l.removed, false) = false
  );
$$;

revoke all on function public.market_save_portrait(text, text) from public, anon, authenticated;
revoke all on function public.market_seller_faces() from public, anon, authenticated;
grant execute on function public.market_save_portrait(text, text) to authenticated;
grant execute on function public.market_seller_faces() to anon, authenticated;
