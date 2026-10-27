-- ============================================================================
-- Bloomie — update 2: admin dashboard
-- Paste into Supabase → SQL Editor → New query, click Run. Run it once.
-- Adds courier tracking, advance payments, and manual orders from the dashboard.
-- ============================================================================

-- Courier, tracking number and advance payment on each order
alter table public.orders
  add column courier      text check (char_length(courier) <= 50),
  add column tracking_no  text check (char_length(tracking_no) <= 80),
  add column advance_paid int  not null default 0 check (advance_paid >= 0);

alter table public.orders
  add constraint orders_advance_not_above_total check (advance_paid <= total);

-- Orders added by hand in the dashboard (Facebook, Instagram, Messenger…).
-- Uses the same price checks as website orders, then marks the order as
-- Confirmed with the right source. Only admins can call it.
create or replace function public.admin_place_order(
  p_source   text,
  p_name     text,
  p_phone    text,
  p_address  text,
  p_district text,
  p_note     text,
  p_payment  text,
  p_items    jsonb,
  p_advance  int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only shop admins can add orders.';
  end if;
  if p_source not in ('website', 'facebook', 'instagram', 'messenger', 'other') then
    raise exception 'Unknown order source: %', p_source;
  end if;

  v_result := public.place_order(p_name, p_phone, p_address, p_district, p_note, p_payment, p_items);

  update public.orders
     set source       = p_source,
         status       = 'confirmed',
         advance_paid = least(greatest(coalesce(p_advance, 0), 0), total)
   where order_no = v_result->>'order_no';

  return v_result;
end;
$$;

revoke all on function public.admin_place_order(text, text, text, text, text, text, text, jsonb, int) from public;
grant execute on function public.admin_place_order(text, text, text, text, text, text, text, jsonb, int) to authenticated;
