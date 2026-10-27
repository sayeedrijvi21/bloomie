"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/admin/AdminProvider";
import { OrderRow } from "@/admin/OrderRow";
import { PushAlertsBanner } from "@/admin/PushAlerts";
import type { Order, OrderSource } from "@/admin/types";
import { btn, Icon, LoadError, Page, PageHeader, Panel, PanelTitle, Skeleton } from "@/admin/ui";

/** First moment of the current month in Bangladesh time, as an ISO string. */
function monthStartDhaka() {
  const now = new Date(Date.now() + 6 * 3600 * 1000); // shift to UTC+6
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 6 * 3600 * 1000).toISOString();
}

export default function Overview() {
  const { t, num, money, productName } = useAdmin();
  const [month, setMonth] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setFailed(false);
    const [m, o] = await Promise.all([
      supabase.from("orders").select("*, order_items(*)").gte("created_at", monthStartDhaka()).neq("status", "cancelled"),
      supabase.from("orders").select("*, order_items(*)").in("status", ["new", "confirmed"]).order("created_at", { ascending: false }).limit(30),
    ]);
    if (m.error || o.error) {
      setFailed(true);
      return;
    }
    setMonth(m.data as Order[]);
    setOpen(o.data as Order[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const newCount = open?.filter((o) => o.status === "new").length ?? 0;
  const toShip = open?.filter((o) => o.status === "confirmed").length ?? 0;
  const sales = month?.reduce((a, o) => a + o.total, 0) ?? 0;

  const sources: OrderSource[] = ["website", "facebook", "instagram", "messenger", "other"];
  const bySource = sources.map((s) => [s, month?.filter((o) => o.source === s).length ?? 0] as const).filter(([s, c]) => c > 0 || s === "website");
  const maxSource = Math.max(1, ...bySource.map(([, c]) => c));

  const pieces = new Map<string, { name: string; qty: number }>();
  month?.forEach((o) =>
    o.order_items.forEach((i) => {
      const key = i.product_id ?? i.product_name;
      const cur = pieces.get(key) ?? { name: productName(i.product_id, i.product_name), qty: 0 };
      cur.qty += i.qty;
      pieces.set(key, cur);
    }),
  );
  const best = [...pieces.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxPieces = Math.max(1, ...best.map((b) => b.qty));

  const stat = "grid gap-1 rounded-[18px] border border-sage/30 bg-white/80 p-4 text-left";

  return (
    <>
      <PageHeader
        title={t.nav.overview}
        action={
          <Link href="/admin/orders/new/" className={`${btn.primary} ${btn.small}`}>
            <Icon name="plus" className="h-4 w-4" />
            {t.orders.newOrder}
          </Link>
        }
      />
      <Page>
        {failed ? (
          <LoadError message={t.common.loadFailed} onRetry={load} label={t.common.refresh} />
        ) : !month || !open ? (
          <Skeleton rows={4} />
        ) : (
          <>
            <PushAlertsBanner />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Link href="/admin/orders/?status=new" className={`${stat} hover:border-sage`}>
                <b className={`font-display text-3xl font-normal ${newCount ? "text-st-new" : ""}`}>{num(newCount)}</b>
                <span className="text-[13px] font-semibold text-bark-soft">{t.overview.newOrders}</span>
              </Link>
              <Link href="/admin/orders/?status=confirmed" className={`${stat} hover:border-sage`}>
                <b className="font-display text-3xl font-normal">{num(toShip)}</b>
                <span className="text-[13px] font-semibold text-bark-soft">{t.overview.toShip}</span>
              </Link>
              <div className={stat}>
                <b className="font-display text-3xl font-normal">{num(month.length)}</b>
                <span className="text-[13px] font-semibold text-bark-soft">{t.overview.monthOrders}</span>
              </div>
              <div className={stat}>
                <b className="font-display text-3xl font-normal">{money(sales)}</b>
                <span className="text-[13px] font-semibold text-bark-soft">{t.overview.monthSales}</span>
              </div>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Panel>
                <div className="flex items-baseline justify-between gap-3">
                  <PanelTitle>{t.overview.attention}</PanelTitle>
                  <Link href="/admin/orders/" className="font-bold text-moss hover:underline">{t.overview.allOrders}</Link>
                </div>
                {open.length ? (
                  <div className="grid gap-2.5">{open.map((o) => <OrderRow key={o.id} order={o} />)}</div>
                ) : (
                  <p className="rounded-2xl border-2 border-dashed border-sage/40 px-5 py-8 text-center text-bark-soft">{t.overview.caughtUp}</p>
                )}
              </Panel>
              <div className="grid gap-6">
                <Panel>
                  <PanelTitle>{t.overview.sources}</PanelTitle>
                  <Bars rows={bySource.map(([s, c]) => ({ label: t.source[s], value: c }))} max={maxSource} num={num} />
                </Panel>
                <Panel>
                  <PanelTitle>{t.overview.bestSellers}</PanelTitle>
                  {best.length ? (
                    <Bars rows={best.map((b) => ({ label: b.name, value: b.qty }))} max={maxPieces} num={num} />
                  ) : (
                    <p className="text-sm text-bark-soft">{t.overview.none}</p>
                  )}
                </Panel>
              </div>
            </div>
          </>
        )}
      </Page>
    </>
  );
}

function Bars({ rows, max, num }: { rows: { label: string; value: number }[]; max: number; num: (n: number) => string }) {
  return (
    <div className="grid gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,7rem)_1fr_2.5rem] items-center gap-2.5 text-sm">
          <span className="truncate">{r.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-linen">
            <div className="h-full rounded-full bg-sage" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <b className="text-right tabular-nums">{num(r.value)}</b>
        </div>
      ))}
    </div>
  );
}
