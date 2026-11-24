-- Payment and hand-off emails say what changed. Staff can read every campus order.

create or replace function public.c2c_advance(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  oid text := coalesce(p_order ->> 'id', '');
  status text := coalesce(p_order ->> 'status', '');
  row public.c2c_orders;
  template text := 'order_updated';
  note text := 'Your order moved forward. Open My orders for the next step.';
begin
  if email = '' or oid = '' then
    raise exception 'Sign in before updating an order';
  end if;
  select * into row from public.c2c_orders where id = oid;
  if row.id is null then
    raise exception 'Order not found';
  end if;
  if lower(row.seller_email) <> email then
    raise exception 'You can only update orders that belong to you';
  end if;
  update public.c2c_orders
    set body = p_order,
        updated_at = now()
    where id = oid;
  if status = 'payment_confirmed' then
    template := 'payment_received';
    note := 'Payment received. The seller will arrange the campus hand-off. Open My orders for the next step.';
  elsif status = 'ready_to_ship' then
    template := 'ready_for_handoff';
    note := 'Your order is ready for campus hand-off. Open My orders to see where to meet.';
  elsif status = 'shipped' then
    template := 'shipping_notice';
    note := 'The seller marked the hand-off. Open My orders if you still need to confirm completion.';
  elsif status = 'completed' then
    template := 'order_completed';
    note := 'This order is complete.';
  end if;
  if row.buyer_email <> '' then
    insert into public.email_outbox (to_email, template, payload)
    values (
      row.buyer_email,
      template,
      jsonb_build_object('order_id', oid, 'status', status, 'note', note)
    );
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.c2c_office()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if app_private.current_role() not in ('admin', 'super_admin') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(body order by updated_at desc)
    from public.c2c_orders
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.c2c_advance(jsonb) from public, anon, authenticated;
revoke all on function public.c2c_office() from public, anon, authenticated;
grant execute on function public.c2c_advance(jsonb) to authenticated;
grant execute on function public.c2c_office() to authenticated;
