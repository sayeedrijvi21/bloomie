-- ============================================================================
-- Bloomie — database setup
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- Run it once. It creates the tables, the security rules and the four products.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Admins: only users listed here can see orders or edit products.
--    Nobody is added here automatically. You add your friend's account by hand
--    (see the last section of this file).
-- ----------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Keeps updated_at current on every edit
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Shop settings: one row, edited from the admin dashboard
-- ----------------------------------------------------------------------------
create table public.settings (
  id                     int primary key default 1 check (id = 1),
  delivery_inside_dhaka  int  not null default 70  check (delivery_inside_dhaka  >= 0),
  delivery_outside_dhaka int  not null default 130 check (delivery_outside_dhaka >= 0),
  bkash_number           text not null default '',
  messenger_url          text not null default 'https://m.me/bloomiebd',
  facebook_url           text not null default 'https://facebook.com/bloomiebd',
  instagram_url          text not null default 'https://instagram.com/bloomiebd',
  preorder_days          text not null default '10–15',
  updated_at             timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- ----------------------------------------------------------------------------
-- 3. Products
--    prints is a list like [{"en":"Cherry","bn":"চেরি"}, ...]
-- ----------------------------------------------------------------------------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category    text not null,
  price       int  not null check (price >= 0),
  stock       text not null default 'in' check (stock in ('in', 'preorder', 'out')),
  image_url   text,
  name_en     text not null,
  name_bn     text not null,
  short_en    text not null default '',
  short_bn    text not null default '',
  size_en     text not null default '',
  size_bn     text not null default '',
  prints      jsonb not null default '[]'::jsonb check (jsonb_typeof(prints) = 'array'),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. Orders and the items in each order
--    source tells you where the order came from, so Facebook and Instagram
--    orders entered by hand sit in the same list as website orders.
-- ----------------------------------------------------------------------------
create sequence public.order_no_seq start 1001;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique default ('BLM-' || nextval('public.order_no_seq')),
  source          text not null default 'website'
                  check (source in ('website', 'facebook', 'instagram', 'messenger', 'other')),
  status          text not null default 'new'
                  check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  customer_name   text not null check (char_length(customer_name) between 2 and 100),
  phone           text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  address         text not null check (char_length(address) between 5 and 500),
  district        text not null check (char_length(district) between 2 and 50),
  note            text check (char_length(note) <= 500),
  payment_method  text not null default 'cod' check (payment_method in ('cod', 'bkash')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  subtotal        int  not null default 0 check (subtotal >= 0),
  delivery_charge int  not null default 0 check (delivery_charge >= 0),
  total           int  not null default 0 check (total >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.order_items (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,
  print        text,
  qty          int  not null check (qty between 1 and 50),
  unit_price   int  not null check (unit_price >= 0),
  line_total   int  not null check (line_total >= 0)
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx     on public.orders (status);
create index order_items_order_idx on public.order_items (order_id);

create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch   before update on public.orders   for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Security rules (row level security)
--    Visitors: can read active products and shop settings. Nothing else.
--    Admins:   can do everything.
--    Customer details in orders are never readable by visitors.
-- ----------------------------------------------------------------------------
alter table public.admins      enable row level security;
alter table public.settings    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

create policy "admins see their own admin row"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

create policy "anyone can read settings"
  on public.settings for select to anon, authenticated
  using (true);
create policy "admins update settings"
  on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "anyone can read active products"
  on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "admins add products"
  on public.products for insert to authenticated
  with check (public.is_admin());
create policy "admins edit products"
  on public.products for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins delete products"
  on public.products for delete to authenticated
  using (public.is_admin());

create policy "admins manage orders"
  on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage order items"
  on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.settings, public.products to anon, authenticated;
grant update on public.settings to authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.orders, public.order_items to authenticated;
grant select on public.admins to authenticated;
grant usage, select on sequence public.order_no_seq to authenticated;
revoke all on public.orders, public.order_items, public.admins from anon;

-- ----------------------------------------------------------------------------
-- 6. Placing an order from the website
--    Customers never write to the orders table directly. The website calls this
--    function, which looks up the real prices and delivery charge itself, so
--    nobody can send a fake price from their browser.
-- ----------------------------------------------------------------------------
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

  return jsonb_build_object('order_no', v_order_no, 'total', v_subtotal + v_delivery);
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. Photo storage: anyone can view product photos, only admins can upload
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "admins upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins replace product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. The four current products (prices are placeholders: change them later)
-- ----------------------------------------------------------------------------
insert into public.products
  (slug, category, price, stock, image_url, name_en, name_bn, short_en, short_bn, size_en, size_bn, prints, sort_order)
values
  ('muslin-bib', 'bibs', 350, 'in', '/images/bib-cherry.jpg',
   'Muslin baby bib', 'মসলিন বেবি বিব',
   'Petal shape with snap button', 'ফুলের আকৃতি ও স্ন্যাপ বাটন সহ',
   'To be confirmed', 'শীঘ্রই জানানো হবে',
   '[{"en":"Cherry","bn":"চেরি"},{"en":"Floral","bn":"ফুল"},{"en":"Bear","bn":"ভালুক"},{"en":"Strawberry","bn":"স্ট্রবেরি"}]', 1),
  ('urine-mat', 'mats', 450, 'in', '/images/urine-mat.jpg',
   'Reusable cotton urine mat', 'পুনঃব্যবহারযোগ্য সুতির ইউরিন ম্যাট',
   'Available in 4 prints', '৪টি প্রিন্টে পাওয়া যায়',
   'To be confirmed', 'শীঘ্রই জানানো হবে',
   '[{"en":"Bunny","bn":"খরগোশ"},{"en":"Clouds","bn":"মেঘ"},{"en":"Stars","bn":"তারা"},{"en":"Little bear","bn":"ছোট্ট ভালুক"}]', 2),
  ('holding-quilt', 'quilts', 1450, 'in', '/images/holding-quilt.jpg',
   'Muslin baby holding quilt', 'মসলিন বেবি হোল্ডিং কাঁথা',
   'Bear print, with hood', 'ভালুক প্রিন্ট, হুড সহ',
   'To be confirmed', 'শীঘ্রই জানানো হবে',
   '[{"en":"Bear","bn":"ভালুক"}]', 3),
  ('swaddle-set', 'swaddles', 950, 'preorder', null,
   'Muslin swaddle set', 'মসলিন সোয়াডল সেট',
   'Pack of 2', '২টির প্যাক',
   'To be confirmed', 'শীঘ্রই জানানো হবে',
   '[{"en":"Floral","bn":"ফুল"}]', 4);

-- ============================================================================
-- LATER, after your friend's admin login exists (Authentication → Users →
-- Add user), run this on its own, with their real email:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'friend@example.com';
-- ============================================================================
