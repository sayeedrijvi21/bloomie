-- ============================================================================
-- Bloomie — update 3: new-order alerts on the shop owner's phone
-- Paste into Supabase → SQL Editor → New query, click Run. Run it once.
-- ============================================================================

-- pg_net lets the database call the alert function over the internet
create extension if not exists pg_net with schema extensions;

-- Private settings, never visible through the website or the API
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.config (
  key   text primary key,
  value text not null
);
insert into private.config (key, value) values
  ('notify_url',     'https://baqarhgninambvynpkqc.supabase.co/functions/v1/notify-order'),
  ('webhook_secret', 'REPLACE_WITH_WEBHOOK_SECRET');  -- same value as the WEBHOOK_SECRET function secret; never commit the real one

-- Phones and computers where an admin turned on order alerts
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  device     text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "admins add their own devices"
  on public.push_subscriptions for insert to authenticated
  with check (public.is_admin() and user_id = auth.uid());
create policy "admins see their own devices"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy "admins update their own devices"
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (public.is_admin() and user_id = auth.uid());
create policy "admins remove their own devices"
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;

-- Sends one alert to every registered device, through the notify-order function
create or replace function private.send_push(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subs   jsonb;
  v_url    text;
  v_secret text;
begin
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
    into v_subs
    from public.push_subscriptions;
  if jsonb_array_length(v_subs) = 0 then
    return;
  end if;

  select value into v_url    from private.config where key = 'notify_url';
  select value into v_secret from private.config where key = 'webhook_secret';

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('payload', p_payload, 'subscriptions', v_subs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 10000
  );
end;
$$;

-- Website orders now also send an alert (the rest is unchanged from setup.sql)
create or replace function public.place_order(
  p_name     text,
  p_phone    text,
  p_address  text,
  p_district text,
  p_note     text,
  p_payment  text,
  p_items    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_product  public.products;
  v_item     jsonb;
  v_qty      int;
  v_print    text;
  v_subtotal int := 0;
  v_delivery int;
  v_order_id uuid;
  v_order_no text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'An order needs between 1 and 20 items.';
  end if;

  select * into v_settings from public.settings where id = 1;
  v_delivery := case when p_district = 'Dhaka'
                     then v_settings.delivery_inside_dhaka
                     else v_settings.delivery_outside_dhaka end;

  insert into public.orders (customer_name, phone, address, district, note, payment_method,
                             subtotal, delivery_charge, total)
  values (btrim(p_name), p_phone, btrim(p_address), p_district, nullif(btrim(p_note), ''),
          coalesce(p_payment, 'cod'), 0, v_delivery, v_delivery)
  returning id, order_no into v_order_id, v_order_no;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where slug = v_item->>'slug' and is_active;
    if not found then
      raise exception 'This product is no longer available: %', v_item->>'slug';
    end if;
    if v_product.stock = 'out' then
      raise exception 'This product is sold out: %', v_product.name_en;
    end if;

    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Quantity must be between 1 and 20.';
    end if;

    v_print := nullif(v_item->>'print', '');
    if v_print is not null and not exists (
      select 1 from jsonb_array_elements(v_product.prints) pr where pr->>'en' = v_print
    ) then
      raise exception 'Unknown print "%" for %', v_print, v_product.name_en;
    end if;

    insert into public.order_items (order_id, product_id, product_name, print, qty, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.name_en, v_print, v_qty, v_product.price, v_product.price * v_qty);

    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  update public.orders
     set subtotal = v_subtotal, total = v_subtotal + v_delivery
   where id = v_order_id;

  -- Phone alert for orders placed on the website (not for orders an admin adds).
  -- An alert problem must never stop an order, so errors are ignored here.
  if auth.uid() is null then
    begin
      perform private.send_push(jsonb_build_object(
        'title', 'New order ' || v_order_no || ' · নতুন অর্ডার',
        'body',  '৳' || to_char(v_subtotal + v_delivery, 'FM9,999,999') || ' · ' || btrim(p_name) || ', ' || p_district,
        'url',   '/admin/order/?no=' || v_order_no,
        'tag',   v_order_no
      ));
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('order_no', v_order_no, 'total', v_subtotal + v_delivery);
end;
$$;

-- "Send test alert" button in the dashboard
create or replace function public.send_test_alert()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Only shop admins can send test alerts.';
  end if;
  select count(*) into v_count from public.push_subscriptions;
  perform private.send_push(jsonb_build_object(
    'title', 'Bloomie test alert · পরীক্ষামূলক অ্যালার্ট',
    'body',  'Order alerts are working. অর্ডার অ্যালার্ট চালু আছে।',
    'url',   '/admin/',
    'tag',   'test'
  ));
  return v_count;
end;
$$;

revoke all on function public.send_test_alert() from public, anon;
grant execute on function public.send_test_alert() to authenticated;
