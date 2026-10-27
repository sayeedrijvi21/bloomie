"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/admin/AdminProvider";
import { OrderRow } from "@/admin/OrderRow";
import { STATUSES, type Order, type OrderStatus } from "@/admin/types";
import { btn, Icon, input, LoadError, Page, PageHeader, Skeleton } from "@/admin/ui";

export default function OrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}

function Orders() {
  const { t, num, reloadCounts } = useAdmin();
  const initial = useSearchParams().get("status") as OrderStatus | null;
  const [filter, setFilter] = useState<"all" | OrderStatus>(initial && STATUSES.includes(initial) ? initial : "all");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setFailed(false);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return setFailed(true);
    setOrders(data as Order[]);
    reloadCounts();
  }, [reloadCounts]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => Object.fromEntries(STATUSES.map((s) => [s, orders?.filter((o) => o.status === s).length ?? 0])),
    [orders],
  );
  const needle = q.toLowerCase().replace(/\s/g, "");
  const list = (orders ?? []).filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      (!needle || (o.customer_name + o.order_no + o.phone + o.district).toLowerCase().replace(/\s/g, "").includes(needle)),
  );

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${active ? "bg-moss text-milk" : "bg-linen text-bark-soft hover:text-bark"}`;

  return (
    <>
      <PageHeader
        title={t.nav.orders}
        action={
          <div className="flex gap-2">
            <button onClick={load} className={`${btn.ghost} ${btn.small}`} aria-label={t.common.refresh}>
              <Icon name="refresh" className="h-4 w-4" />
              <span className="hidden sm:inline">{t.common.refresh}</span>
            </button>
            <Link href="/admin/orders/new/" className={`${btn.primary} ${btn.small}`}>
              <Icon name="plus" className="h-4 w-4" />
              {t.orders.newOrder}
            </Link>
          </div>
        }
      />
      <Page>
        <div className="grid gap-3">
          <input
            id="order-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.orders.search}
            aria-label={t.orders.search}
            className={`${input} rounded-full px-5`}
          />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group">
            <button className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              {t.orders.all} <span className="opacity-70">{num(orders?.length ?? 0)}</span>
            </button>
            {STATUSES.map((s) => (
              <button key={s} className={chip(filter === s)} aria-pressed={filter === s} onClick={() => setFilter(s)}>
                {t.status[s]} <span className="opacity-70">{num(counts[s] ?? 0)}</span>
              </button>
            ))}
          </div>
        </div>

        {failed ? (
          <LoadError message={t.common.loadFailed} onRetry={load} label={t.common.refresh} />
        ) : !orders ? (
          <Skeleton rows={5} />
        ) : list.length ? (
          <div className="grid gap-2.5">{list.map((o) => <OrderRow key={o.id} order={o} />)}</div>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-sage/40 px-5 py-8 text-center text-bark-soft">
            {orders.length ? t.orders.noMatch : t.orders.empty}
          </p>
        )}
      </Page>
    </>
  );
}
