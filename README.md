# Bloomie

Online shop and order-management dashboard for **Bloomie**, a Bangladeshi brand selling pure-cotton muslin baby products (bibs, urine mats, holding quilts and swaddles). Until now the business sold only through Facebook and Instagram messages; this project gives it a bilingual storefront, a single place to manage orders from every channel, and instant phone alerts for new orders.

## What it does

**Storefront** (Bangla by default, one-tap switch to English)
- Product catalogue with category filters, prints, stock and pre-order status loaded live from the database
- Checkout built for Bangladesh: cash on delivery or bKash advance, all 64 districts, automatic inside/outside-Dhaka delivery charge, 11-digit `01…` phone validation
- Prices and totals are calculated in the database, so a customer can't change what they pay from the browser

**Admin dashboard** (`/admin`, installable to the phone home screen)
- Overview of new orders to call, orders ready to ship, monthly sales, order sources and best sellers
- Order workflow: New → Confirmed → Shipped → Delivered, with courier and tracking number, partial advance payments and the cash still to collect
- Manual entry for orders taken on Facebook, Instagram or Messenger, using the same price checks as the website
- Branded invoices you can print or save as PDF
- Product editor (English and Bangla names, prints, prices, stock) with phone-photo upload, resized in the browser before upload
- Shop settings: delivery charges, bKash number, social links
- **New-order push notifications** on Android and iPhone (home-screen app), sent by a Supabase Edge Function using Web Push (VAPID)

## Tech

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router, static export), React, TypeScript, Tailwind CSS |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions (Deno), `pg_net` |
| Security | Row level security on every table; customers can only call a `security definer` order function; admin rights checked in the database |
| Notifications | Service worker plus Web Push, encrypted with `web-push` in the Edge Function |
| Hosting | Static hosting (Cloudflare Pages / Netlify) |

## Project structure

```
src/app/(site)/      storefront pages: home, shop, product, order, about, contact
src/app/admin/       dashboard pages: overview, orders, order, invoice, products, product, settings
src/admin/           dashboard components, translations, push-alert logic
src/i18n/            storefront translations (en, bn)
public/admin/        service worker, web app manifest, app icons
supabase/            database setup and updates, run in order
supabase/functions/  notify-order Edge Function
```

## Running it locally

```bash
cp .env.example .env.local   # then fill in your own Supabase project values
npm install
npm run dev                  # http://localhost:3000, dashboard at /admin
npm run build                # static site written to ./out
```

### Database

Run these in the Supabase SQL Editor, in order:

1. `supabase/setup.sql`: tables, security rules, order function, photo storage, starter products
2. `supabase/002-dashboard.sql`: courier tracking, advance payments, manual orders
3. `supabase/003-alerts.sql`: push subscriptions and new-order alerts. Replace `REPLACE_WITH_WEBHOOK_SECRET` with your own random value first.

Then add your admin account in **Authentication → Users** and run:

```sql
insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
```

### Order alerts

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Deploy `supabase/functions/notify-order` with JWT verification turned off (the function checks its own `x-webhook-secret` header)
3. Add the function secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `WEBHOOK_SECRET`
4. Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

---

Built by Md Abu Sayeed Rijvi.
